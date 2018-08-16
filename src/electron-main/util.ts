import fs from "fs";
import logger from "electron-log";
import path from "path";
import url from "url";
import {app} from "electron";
import {EncryptionAdapter} from "fs-json-store-encryption-adapter";
import {Fs as StoreFs, Model as StoreModel, Store} from "fs-json-store";

import {BuildEnvironment} from "src/shared/model/common";
import {Config, Settings} from "src/shared/model/options";
import {configEncryptionPresetValidator, INITIAL_STORES, settingsAccountLoginUniquenessValidator} from "./constants";
import {Context, ContextInitOptions, ContextInitOptionsPaths, RuntimeEnvironment} from "./model";
import {ElectronContextLocations} from "src/shared/model/electron";
import {RUNTIME_ENV_E2E, RUNTIME_ENV_USER_DATA_DIR} from "src/shared/constants";
import {Db} from "./database/db";

export async function initContext(options: ContextInitOptions = {}): Promise<Context> {
    const runtimeEnvironment: RuntimeEnvironment = Boolean(process.env[RUNTIME_ENV_E2E]) ? "e2e" : "production";
    const locations = initLocations(runtimeEnvironment, options.paths);
    const initialStores = options.initialStores || INITIAL_STORES;
    const storeFs = options.storeFs ? options.storeFs : StoreFs.Fs.fs;
    const configStore = new Store<Config>({
        fs: storeFs,
        optimisticLocking: true,
        file: path.join(locations.userDataDir, "config.json"),
        validators: [configEncryptionPresetValidator],
    });

    logger.transports.file.file = path.join(locations.userDataDir, "./log.log");
    logger.transports.file.level = false;
    logger.transports.console.level = false;

    return {
        db: new Db(),
        storeFs,
        runtimeEnvironment,
        locations,
        initialStores,
        configStore,
        settingsStore: new Store<Settings>({
            fs: storeFs,
            optimisticLocking: true,
            file: path.join(locations.userDataDir, "settings.bin"),
            validators: [settingsAccountLoginUniquenessValidator],
        }),
    };
}

function initLocations(runtimeEnvironment: RuntimeEnvironment, paths?: ContextInitOptionsPaths): ElectronContextLocations {
    const userDataDirRuntimeVal = process.env[RUNTIME_ENV_USER_DATA_DIR];

    if (userDataDirRuntimeVal && (!fs.existsSync(userDataDirRuntimeVal) || !fs.statSync(userDataDirRuntimeVal).isDirectory())) {
        throw new Error(
            `Make sure that custom "userData" dir exists before passing the "${RUNTIME_ENV_USER_DATA_DIR}" environment variable`,
        );
    }

    const {appDir, userDataDir} = paths || {
        appDir: path.resolve(__dirname, (process.env.NODE_ENV as BuildEnvironment) === "development" ? "../app-dev" : "../app"),
        userDataDir: userDataDirRuntimeVal || app.getPath("userData"),
    };
    const appRelativePath = (...value: string[]) => path.join(appDir, ...value);
    const icon = appRelativePath("./assets/icons/icon.png");

    return {
        appDir,
        userDataDir,
        icon,
        trayIcon: icon,
        numbersFont: appRelativePath("./assets/numbers.ttf"),
        browserWindowPage: (process.env.NODE_ENV as BuildEnvironment) === "development" ? "http://localhost:8080/index.html"
            : formatFileUrl(path.join(appDir, "./web/index.html")),
        preload: {
            browserWindow: appRelativePath("./electron-preload/browser-window.js"),
            browserWindowE2E: appRelativePath("./electron-preload/browser-window-e2e.js"),
            webView: {
                protonmail: formatFileUrl(appRelativePath("./electron-preload/webview/protonmail.js")),
                tutanota: formatFileUrl(appRelativePath("./electron-preload/webview/tutanota.js")),
            },
        },
    };
}

function formatFileUrl(pathname: string) {
    return url.format({pathname, protocol: "file:", slashes: true});
}

export async function buildSettingsAdapter({configStore}: Context, password: string): Promise<StoreModel.StoreAdapter> {
    return new EncryptionAdapter(password, (await configStore.readExisting()).encryptionPreset);
}

export function toggleBrowserWindow(ctx: Context, forcedState?: boolean) {
    const browserWindow = ctx.uiContext && ctx.uiContext.browserWindow;

    if (!browserWindow) {
        return;
    }

    if (typeof forcedState !== "undefined" ? forcedState : !browserWindow.isVisible()) {
        activateBrowserWindow(ctx);
    } else {
        browserWindow.hide();
    }
}

export function activateBrowserWindow({uiContext}: Context) {
    if (!uiContext || !uiContext.browserWindow) {
        return;
    }

    uiContext.browserWindow.show();
    uiContext.browserWindow.focus();
}
