import _logger from "electron-log";
import {BrowserWindow, Rectangle, app, screen} from "electron";
import {equals} from "remeda";

import {Context} from "src/electron-main/model";
import {DEFAULT_WEB_PREFERENCES} from "./constants";
import {PRODUCT_NAME} from "src/shared/constants";
import {curryFunctionMembers} from "src/shared/util";
import {syncFindInPageBrowserViewSize} from "src/electron-main/window/find-in-page";

const logger = curryFunctionMembers(_logger, "[src/electron-main/window/main]");

export async function initMainBrowserWindow(ctx: Context): Promise<BrowserWindow> {
    const state: { forceClose: boolean } = {forceClose: false};
    const appBeforeQuitEventArgs: ["before-quit", (event: Electron.Event) => void] = [
        "before-quit",
        () => state.forceClose = true,
    ];
    const browserWindow = new BrowserWindow({
        webPreferences: {
            ...DEFAULT_WEB_PREFERENCES,
            preload: ctx.runtimeEnvironment === "e2e"
                ? ctx.locations.preload.browserWindowE2E
                : ctx.locations.preload.browserWindow,
        },
        title: PRODUCT_NAME,
        icon: ctx.locations.icon,
        show: false,
        autoHideMenuBar: true,
    });

    app.removeListener(...appBeforeQuitEventArgs);
    app.on(...appBeforeQuitEventArgs);

    browserWindow
        .on("ready-to-show", async () => {
            const boundsToRestore = await resolveBoundsToRestore(ctx, browserWindow.getBounds());

            logger.debug(JSON.stringify({boundsToRestore}));

            browserWindow.setBounds(boundsToRestore);

            // needs to be called after the "browserWindow.setBounds" call
            // since we don't want "setBounds" call to trigger the move/resize events handlers (leads to "maixmized" value loosing)
            await keepBrowserWindowState(ctx, browserWindow);

            const settingsConfigured = await ctx.settingsStore.readable();
            const {startHidden} = await ctx.configStore.readExisting();

            if (!settingsConfigured || !startHidden) {
                await (await ctx.deferredEndpoints.promise).activateBrowserWindow(browserWindow);
            }
        })
        .on("closed", () => {
            browserWindow.destroy();
            state.forceClose = false;
            app.quit();
        })
        .on("close", async (event) => {
            if (state.forceClose) {
                return event.returnValue = true;
            }

            event.returnValue = false;
            event.preventDefault();

            if ((await ctx.configStore.readExisting()).closeToTray) {
                browserWindow.hide();
            } else {
                state.forceClose = true;
                browserWindow.close(); // re-triggering the same "close" event
            }

            return event.returnValue;
        });

    browserWindow.setMenu(null);

    await browserWindow.loadURL(ctx.locations.browserWindowPage);

    if (BUILD_ENVIRONMENT === "development") {
        browserWindow.webContents.openDevTools();
    }

    return browserWindow;
}

async function resolveBoundsToRestore(
    ctx: Context,
    currentBounds: Readonly<Rectangle>,
): Promise<Rectangle> {
    const {window: {bounds: savedBounds}} = await ctx.configStore.readExisting();
    const x = typeof savedBounds.x !== "undefined"
        ? savedBounds.x
        : currentBounds.x;
    const y = typeof savedBounds.y !== "undefined"
        ? savedBounds.y
        : currentBounds.y;
    const allDisplaysSummarySize: Readonly<{ width: number, height: number }> = screen.getAllDisplays().reduce(
        (accumulator: { width: number, height: number }, {size}) => {
            accumulator.width += size.width;
            accumulator.height += size.height;
            return accumulator;
        },
        {width: 0, height: 0},
    );
    const width = Math.min(savedBounds.width, allDisplaysSummarySize.width);
    const height = Math.min(savedBounds.height, allDisplaysSummarySize.height);

    logger.debug(JSON.stringify({currentBounds, savedBounds, allDisplaysSummarySize}));

    return {
        width,
        height,
        x: Math.min(
            Math.max(x, 0),
            allDisplaysSummarySize.width - width,
        ),
        y: Math.min(
            Math.max(y, 0),
            allDisplaysSummarySize.height - height,
        ),
    };
}

async function keepBrowserWindowState(ctx: Context, browserWindow: Electron.BrowserWindow) {
    await (async () => {
        const {window: {bounds}} = await ctx.configStore.readExisting();
        const hasSavedPosition = "x" in bounds && "y" in bounds;

        if (!hasSavedPosition) {
            browserWindow.center();
        }
    })();

    const saveWindowStateHandler = async () => {
        const config = await ctx.configStore.readExisting();
        const storedWindowConfig = Object.freeze(config.window);
        const newWindowConfig = {...config.window};

        try {
            newWindowConfig.maximized = browserWindow.isMaximized();

            if (!newWindowConfig.maximized) {
                newWindowConfig.bounds = browserWindow.getBounds();
            }
        } catch (error) {
            // "browserWindow" might be destroyed at this point
            console.log(error); // tslint:disable-line:no-console
            logger.warn("failed to resolve window bounds", error);
            return;
        }

        if (equals(storedWindowConfig, newWindowConfig)) {
            return;
        }

        await ctx.configStore.write({
            ...config,
            window: newWindowConfig,
        });
    };
    const saveWindowStateHandlerDebounced = (() => {
        let timeoutId: any;
        return () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(saveWindowStateHandler, 500);
            syncFindInPageBrowserViewSize(ctx);
        };
    })();

    browserWindow.on("close", saveWindowStateHandler);
    browserWindow.on("resize", saveWindowStateHandlerDebounced);
    browserWindow.on("move", saveWindowStateHandlerDebounced);
}
