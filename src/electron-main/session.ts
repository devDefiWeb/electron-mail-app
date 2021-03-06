import {concatMap} from "rxjs/operators";
import electronLog from "electron-log";
import {session as electronSession, Session} from "electron";
import {from, lastValueFrom, race, throwError, timer} from "rxjs";

import {AccountConfig} from "src/shared/model/account";
import {Context} from "./model";
import {curryFunctionMembers, getWebViewPartition} from "src/shared/util";
import {filterProtonSessionTokenCookies, getPurifiedUserAgent, getUserAgentByAccount} from "src/electron-main/util";
import {initWebRequestListenersByAccount} from "src/electron-main/web-request";
import {IPC_MAIN_API_NOTIFICATION$} from "src/electron-main/api/const";
import {IPC_MAIN_API_NOTIFICATION_ACTIONS} from "src/shared/api/main-process/actions";
import {LoginFieldContainer} from "src/shared/model/container";
import {ONE_SECOND_MS} from "src/shared/constants";
import {registerSessionProtocols} from "src/electron-main/protocol";

const _logger = curryFunctionMembers(electronLog, __filename);

type createSessionUtilType = {
    readonly create: (partition: string) => Session
    readonly createdBefore: (partition: string) => boolean
    readonly fromPartition: (partition: string) => Session
};

export const createSessionUtil: createSessionUtilType = (() => {
    type ResultType = createSessionUtilType;
    const existingPartitions: Set<string> = new Set();
    const persistentSessionErrorMessage = "Persistent sessions are not allowed.";
    const createdBefore: ResultType["createdBefore"] = (partition) => {
        _logger.info(nameof.full(createSessionUtil.createdBefore));
        return existingPartitions.has(partition);
    };
    const fromPartition: ResultType["fromPartition"] = (partition) => {
        _logger.info(nameof.full(createSessionUtil.fromPartition));
        const session = electronSession.fromPartition(partition, {cache: false});
        if (!existingPartitions.has(partition)) {
            existingPartitions.add(partition);
        }
        return session;
    };
    const create: ResultType["create"] = (partition) => {
        _logger.info(nameof.full(createSessionUtil.create));

        if (String(partition).trim().toLowerCase().startsWith("persist:")) {
            throw new Error(persistentSessionErrorMessage);
        }

        const session = fromPartition(partition);

        if (session.isPersistent()) {
            throw new Error(persistentSessionErrorMessage);
        }

        {
            const userAgentToSet = session.getUserAgent();
            const purifiedUserAgent = getPurifiedUserAgent(userAgentToSet);
            if (purifiedUserAgent !== userAgentToSet) {
                session.setUserAgent(purifiedUserAgent);
            }
        }

        // TODO electron built-in spellcheck: drop dictionaries load preventing hack
        // passing a non-resolving URL is a workaround, see https://github.com/electron/electron/issues/22995
        session.setSpellCheckerDictionaryDownloadURL("https://00.00/");

        return session;
    };
    return {
        create,
        createdBefore,
        fromPartition(partition: string): Session {
            if (!createdBefore(partition)) {
                throw new Error(`Session should be created via the "${nameof.full(createSessionUtil.create)}" call.`);
            }
            return fromPartition(partition);
        },
    };
})();

export const resolveInitializedAccountSession = ({login}: DeepReadonly<LoginFieldContainer>): Session => {
    return createSessionUtil.fromPartition(
        getWebViewPartition(login),
    );
};

export const configureSessionByAccount = async (
    ctx: DeepReadonly<Context>,
    account: DeepReadonly<AccountConfig>,
): Promise<void> => {
    _logger.info(nameof(configureSessionByAccount));

    const {proxy} = account;
    const session = resolveInitializedAccountSession({login: account.login});
    const proxyConfig = {
        ...{
            pacScript: "",
            proxyRules: "",
            proxyBypassRules: "",
        },
        ...(proxy && proxy.proxyRules && proxy.proxyRules.trim() && {
            proxyRules: proxy.proxyRules.trim(),
            proxyBypassRules: (proxy.proxyBypassRules && proxy.proxyRules.trim()) || "",
        }),
    };

    session.setUserAgent(getUserAgentByAccount(account));

    initWebRequestListenersByAccount(ctx, account);

    await lastValueFrom(
        race(
            from(
                session.setProxy(proxyConfig),
            ),
            timer(ONE_SECOND_MS * 2).pipe(
                concatMap(() => throwError(() => new Error("Failed to configure proxy settings"))),
            ),
        ),
    );
};

export const initSessionByAccount = async (
    ctx: DeepReadonly<Context>,
    // eslint-disable-next-line max-len
    account: DeepReadonly<AccountConfig>,
): Promise<void> => {
    const logger = curryFunctionMembers(_logger, nameof(initSessionByAccount));

    logger.info();

    const partition = getWebViewPartition(account.login);

    if (createSessionUtil.createdBefore(partition)) {
        return;
    }

    const session = createSessionUtil.create(partition);

    await registerSessionProtocols(ctx, session);
    await configureSessionByAccount(ctx, account);

    {
        type Cause = "explicit" | "overwrite" | "expired" | "evicted" | "expired-overwrite";

        const skipCauses: ReadonlyArray<Cause> = ["expired", "evicted", "expired-overwrite"];

        session.cookies.on(
            "changed",
            // TODO electron/TS: drop explicit callback args typing (currently typed as Function in electron.d.ts)
            (...[, cookie, cause, removed]: [
                event: unknown,
                cookie: Electron.Cookie,
                cause: "explicit" | "overwrite" | "expired" | "evicted" | "expired-overwrite",
                removed: boolean
            ]) => {
                if (removed || skipCauses.includes(cause)) {
                    return;
                }

                const protonSessionTokenCookies = filterProtonSessionTokenCookies([cookie]);

                if (protonSessionTokenCookies.accessTokens.length || protonSessionTokenCookies.refreshTokens.length) {
                    logger.verbose("proton session token cookies modified");

                    IPC_MAIN_API_NOTIFICATION$.next(
                        IPC_MAIN_API_NOTIFICATION_ACTIONS.ProtonSessionTokenCookiesModified({key: {login: account.login}}),
                    );
                }
            },
        );
    }
};
