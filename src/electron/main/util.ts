import * as path from "path";
import * as url from "url";
import * as os from "os";

import logger from "electron-log";
import {app, ipcMain} from "electron";
import {fromError} from "stacktrace-js";
import {EMPTY, Observable, Subscription} from "rxjs";
import {catchError} from "rxjs/operators";
import {Model as StoreModel, Store} from "fs-json-store";
import {EncryptionAdapter} from "fs-json-store-encryption-adapter";

import {Config, configEncryptionPresetValidator, Settings, settingsAccountLoginUniquenessValidator} from "_shared/model/options";
import {ElectronTransport, Environment} from "_shared/model/electron";
import {ElectronIpcMainActionType} from "_shared/electron-actions/model";
import {ElectronTransportEvent} from "../model";
import {Context, ContextInitOptions, UIContext} from "./model";
import {INITIAL_STORES} from "./constants";

export async function initContext(opts: ContextInitOptions = {}): Promise<Context> {
    const env: Environment = process.env.NODE_ENV_RUNTIME === "development"
        ? "development"
        : process.env.NODE_ENV_RUNTIME === "e2e"
            ? "e2e"
            : "production";
    const locations = await (async () => {
        const formatFileUrl = (pathname: string) => url.format({pathname, protocol: "file:", slashes: true});
        const paths = opts.paths || {
            app: path.join(__dirname, "../../../app"),
            userData: env === "e2e"
                ? process.env.TEST_USER_DATA_DIR as string
                : app.getPath("userData"),
        };
        const iconFile = "./assets/icons/icon.png";

        return {
            data: paths.userData,
            app: paths.app,
            page: env === "development"
                ? "http://localhost:3000/index.html"
                : formatFileUrl(path.join(paths.app, "./web/index.html")),
            icon: path.join(paths.app, iconFile),
            trayIcon: path.join(paths.app, os.platform() === "darwin" ? "./assets/icons/mac/icon.png" : iconFile),
            preload: {
                browser: {
                    production: path.join(paths.app, "./electron/renderer/browser-window-production-env.js"),
                    development: path.join(paths.app, "./electron/renderer/browser-window-development-env.js"),
                    e2e: path.join(paths.app, "./electron/renderer/browser-window-e2e-env.js"),
                },
                account: formatFileUrl(path.join(paths.app, "./electron/renderer/account.js")),
            },
        };
    })();
    const initialStores = opts.initialStores || INITIAL_STORES;
    const fsOption = opts.storeFs ? {fs: opts.storeFs} : {};
    const configStore = new Store<Config>({
        ...fsOption,
        optimisticLocking: true,
        file: path.join(locations.data, "config.json"),
        validators: [configEncryptionPresetValidator],
    });

    logger.transports.file.file = path.join(locations.data, "./log.log");
    logger.transports.file.level = "info";

    return {
        env,
        locations,
        initialStores,
        configStore,
        settingsStore: new Store<Settings>({
            ...fsOption,
            optimisticLocking: true,
            file: path.join(locations.data, "settings.bin"),
            validators: [settingsAccountLoginUniquenessValidator],
        }),
    };
}

export async function buildSettingsAdapter({configStore}: Context, password: string): Promise<StoreModel.StoreAdapter> {
    return new EncryptionAdapter(password, (await configStore.readExisting()).encryptionPreset);
}

export function toggleBrowserWindow(uiContext?: UIContext, forcedState?: boolean) {
    if (!uiContext || !uiContext.browserWindow) {
        return;
    }

    const {browserWindow} = uiContext;

    if (typeof forcedState !== "undefined" ? forcedState : !browserWindow.isVisible()) {
        activateBrowserWindow(uiContext);
    } else {
        browserWindow.hide();
    }
}

export function activateBrowserWindow(uiContext?: UIContext) {
    if (!uiContext || !uiContext.browserWindow) {
        return;
    }

    uiContext.browserWindow.show();
    uiContext.browserWindow.focus();
}

// @formatter:off
export const ipcMainOn = <T extends ElectronIpcMainActionType>(
    {channel, process}: {channel: T["c"], process: (args: T["i"]) => Promise<T["o"]>},
) => {
    type SendType = ElectronTransport<T["o"]>;

    ipcMain.on(channel, (event: ElectronTransportEvent<T["o"]>, transport: ElectronTransport<T["i"]>) => {
        const payload = Object.freeze<T["i"]>(transport.payload);

        process(payload)
            .then((result) => {
                event.sender.send(
                    channel,
                    {id: transport.id, payload: result || null} as SendType,
                );
            })
            .catch((error: Error) => {
                // tslint:disable-next-line:no-floating-promises
                fromError(error).then((stackFrames) => {
                    event.sender.send(
                        channel,
                        {
                            id: transport.id,
                            error: {
                                message: error.message,
                                stackFrames,
                            },
                        } as SendType,
                    );
                });

                logger.error(error);

                return EMPTY;
            });
    });
};

// TODO make "subscriptions" map is reset on "MiscActions.Init.channel" event receiving
export const ipcMainObservable = <T extends ElectronIpcMainActionType> (
    channel: T["c"],
    process: (args: T["i"]) => Observable<T["o"]>,
) => {
    type SendType = ElectronTransport<T["o"]>;
    const subscriptions: Record<string, Subscription> = {};

    ipcMain.on(channel, (event: ElectronTransportEvent<T["o"]>, transport: ElectronTransport<T["i"]>) => {
        const payload = Object.freeze<T["i"]>(transport.payload);
        const observable = process(payload);
        const offEventName = `${channel}:off:${transport.id}`;

        ipcMain.once(offEventName, () => {
            subscriptions[offEventName].unsubscribe();
        });

        subscriptions[offEventName] = observable.subscribe((result) => {
            event.sender.send(
                channel,
                {id: transport.id, payload: result || null} as SendType,
            );
        });

        observable.pipe(catchError((error: Error) => {
            // tslint:disable-next-line:no-floating-promises
            fromError(error).then((stackFrames) => {
                event.sender.send(
                    channel,
                    {
                        id: transport.id,
                        error: {
                            message: error.message,
                            stackFrames,
                        },
                    } as SendType,
                );
            });

            logger.error(error);

            return EMPTY;
        }));
    });
};
// @formatter:on
