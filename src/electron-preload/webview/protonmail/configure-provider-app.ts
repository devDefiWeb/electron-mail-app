import {LOCAL_WEBCLIENT_PROTOCOL_RE_PATTERN} from "src/shared/constants";
import {WEBVIEW_LOGGERS} from "src/electron-preload/webview/constants";
import {curryFunctionMembers} from "src/shared/util";
import {disableBrowserNotificationFeature, isBuiltInWebClient} from "src/electron-preload/webview/util";

const logger = curryFunctionMembers(WEBVIEW_LOGGERS.protonmail, `[configure-angular-app]`);
const targetModuleName = "proton";
const imgSrcSanitizationWhitelistRe = new RegExp(`^\\s*((https?|ftp|file|blob|${LOCAL_WEBCLIENT_PROTOCOL_RE_PATTERN}):|data:image\\/)`);

export function configureProviderApp() {
    logger.info(`configureProviderApp()`, JSON.stringify({location: location.href}));

    disableBrowserNotificationFeature(logger);

    if (!isBuiltInWebClient()) {
        logger.info("configureProviderApp()", `No need for configuring the SPA as no built-in web client is used`);
        return;
    }

    configureAngularApp();
}

function configureAngularApp() {
    const state: { value?: angular.IAngularStatic, initialized?: boolean } = {};

    Object.defineProperty(window, "angular", {
        get() {
            return state.value;
        },
        set(v) {
            state.value = v;

            if (!state.value || state.initialized) {
                return;
            }

            state.initialized = true;

            setTimeout(
                () => {
                    angularInitializedHandler(state.value as angular.IAngularStatic);
                },
                0,
            );
        },
    });
}

function angularInitializedHandler(angular: angular.IAngularStatic) {
    logger.info(`angularInitializedHandler()`);

    const original = angular.module;
    const overridden: typeof original = function(this: typeof angular, ...args) {
        const [moduleName] = args;
        const creating = args.length > 1;
        const module = original.apply(this, args);

        if (creating && moduleName === targetModuleName) {
            return tweakModule(module);
        }

        return module;
    };

    angular.module = overridden;
}

function tweakModule(module: angular.IModule): typeof module {
    logger.info(`tweakModule()`);

    return module.config([
        "$compileProvider",
        ($compileProvider: angular.ICompileProvider) => {
            $compileProvider.imgSrcSanitizationWhitelist(imgSrcSanitizationWhitelistRe);
            logger.info(`"$compileProvider.imgSrcSanitizationWhitelist" called with "${imgSrcSanitizationWhitelistRe}" regexp`);
        },
    ]);
}
