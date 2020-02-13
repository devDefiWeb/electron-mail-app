import electronLog from "electron-log";
import {app} from "electron";

import {appReadyHandler} from "./bootstrap/app-ready";
import {bootstrapCommandLine} from "./bootstrap/command-line";
import {bootstrapInit} from "./bootstrap/init";
import {initContext} from "./context";
import {registerStandardSchemes} from "./protocol";
import {upgradeExistingConfig} from "./bootstrap/upgrade-config";

bootstrapInit();

// TODO consider sharing "Context" using dependency injection approach
const ctx = initContext();

bootstrapCommandLine(ctx);

registerStandardSchemes(ctx);

(async () => {
    await (async () => {
        // TODO test "logger.transports.file.level" update
        const {logLevel} = (await ctx.configStore.read()) ?? ctx.initialStores.config;
        electronLog.transports.file.level = logLevel;
    })();
    await upgradeExistingConfig(ctx);
    await app.whenReady();
    await appReadyHandler(ctx);
})().catch((error) => {
    console.error(error); // tslint:disable-line:no-console
    electronLog.error("[src/electron-main/index]", error);
    throw error;
});
