import {combineLatest} from "rxjs";
import {distinctUntilChanged, map} from "rxjs/operators";

import {ProviderApi} from "./model";
import {WEBVIEW_LOGGERS} from "src/electron-preload/webview/lib/const";
import {curryFunctionMembers} from "src/shared/util";
import {resolveProviderInternals} from "./internals";
import {resolveStandardSetupPublicApi} from "src/electron-preload/webview/lib/provider-api/standart-setup-internals";

const _logger = curryFunctionMembers(WEBVIEW_LOGGERS.calendar, "[provider-api/index]");

export const initProviderApi = async (): Promise<ProviderApi> => {
    const logger = curryFunctionMembers(_logger, "initProviderApi()");

    logger.info();

    return (async (): Promise<ProviderApi> => {
        const [standardSetupPublicApi, internals] = await Promise.all([
            resolveStandardSetupPublicApi(logger),
            resolveProviderInternals(),
        ]);
        const internalsPrivateScope$ = internals["./src/app/content/PrivateApp.tsx"].value$.pipe(distinctUntilChanged());
        const providerApi: ProviderApi = {
            _custom_: {
                loggedIn$: combineLatest([
                    standardSetupPublicApi.authentication$,
                    internalsPrivateScope$,
                ]).pipe(
                    map(([authentication, {privateScope}]) => {
                        const isPrivateScopeActive = Boolean(privateScope);
                        const isAuthenticationSessionActive = Boolean(
                            authentication.hasSession?.call(authentication),
                        );
                        logger.verbose(JSON.stringify({isPrivateScopeActive, isAuthenticationSessionActive}));
                        return isPrivateScopeActive && isAuthenticationSessionActive;
                    }),
                    distinctUntilChanged(),
                ),
            },
        };

        logger.info("initialized");

        return providerApi;
    })();
};
