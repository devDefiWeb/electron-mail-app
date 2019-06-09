import _logger from "electron-log";
import sanitizeHtml from "sanitize-html";
import {BrowserWindow} from "electron";

import {Context} from "src/electron-main/model";
import {DEFAULT_WEB_PREFERENCES} from "./constants";
import {PACKAGE_DESCRIPTION, PACKAGE_LICENSE, PACKAGE_VERSION, PRODUCT_NAME} from "src/shared/constants";
import {curryFunctionMembers} from "src/shared/util";
import {injectVendorsAppCssIntoHtmlFile} from "src/electron-main/util";

const logger = curryFunctionMembers(_logger, "[src/electron-main/window/about]");

export async function showAboutBrowserWindow(ctx: Context): Promise<BrowserWindow> {
    if (!ctx.uiContext) {
        throw new Error(`UI Context has not been initialized`);
    }

    const {aboutBrowserWindow: exitingBrowserWindow} = ctx.uiContext;

    if (exitingBrowserWindow && !exitingBrowserWindow.isDestroyed()) {
        exitingBrowserWindow.center();
        exitingBrowserWindow.show();
        exitingBrowserWindow.focus();
        return exitingBrowserWindow;
    }

    const browserWindow = new BrowserWindow({
        title: `About ${PRODUCT_NAME}`,
        center: true,
        modal: true,
        autoHideMenuBar: true,
        width: 650,
        height: 500,
        webPreferences: {
            ...DEFAULT_WEB_PREFERENCES,
            preload: ctx.locations.preload.aboutBrowserWindow,
        },
    });

    browserWindow.on("closed", () => {
        if (!ctx.uiContext) {
            return;
        }
        delete ctx.uiContext.aboutBrowserWindow;
    });

    ctx.uiContext.aboutBrowserWindow = browserWindow;

    const {html, baseURLForDataURL} = await resolveContent(ctx);

    await browserWindow.webContents.loadURL(`data:text/html,${html}`, {baseURLForDataURL});

    return browserWindow;
}

const resolveContent: (ctx: Context) => Promise<Unpacked<ReturnType<typeof injectVendorsAppCssIntoHtmlFile>>> = (() => {
    let result: typeof resolveContent = async (ctx: Context) => {
        const versions: typeof process.versions & Electron.Versions = process.versions;
        const versionsProps: Array<keyof typeof versions> = ["electron", "chrome", "node", "v8"];
        const htmlInjection = [
            sanitizeHtml(
                `
                    <h1>${PRODUCT_NAME} v${PACKAGE_VERSION}</h1>
                    <p>${PACKAGE_DESCRIPTION}</p>
                    <p>Distributed under ${PACKAGE_LICENSE} license.</p>
                    `,
                {
                    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1"]),
                },
            ),
            `
                <ul class="list-versions align-items-left justify-content-center font-weight-light">
                    ${
                versionsProps
                    .map((prop) => {
                        return sanitizeHtml(`<li>${prop.substr(0, 1).toUpperCase()}${prop.substr(1)}: ${versions[prop]}</li>`);
                    })
                    .join("")
            }
                </ul>
                `,
        ].join("");
        const pageLocation = ctx.locations.aboutBrowserWindowPage;

        const cache = await injectVendorsAppCssIntoHtmlFile(pageLocation, ctx.locations);

        cache.html = cache.html.replace(/(.*)#MAIN_PROCESS_INJECTION_POINTCUT#(.*)/i, `$1${htmlInjection}$2`);

        if (!cache.html.includes(htmlInjection)) {
            logger.error(JSON.stringify({cache}));
            throw new Error(`Failed to inject "${htmlInjection}" into the "${pageLocation}" page`);
        }

        logger.verbose(JSON.stringify(cache));

        // memoize the result
        result = async () => cache;

        return cache;
    };
    return result;
})();
