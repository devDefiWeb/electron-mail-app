import {ofType, unionize} from "unionize";

import {AccountConfig, AccountNotificationType, AccountProgress, WebAccount} from "src/shared/model/account";

export const ACCOUNTS_ACTIONS = unionize({
        Activate: ofType<{ login: string }>(),
        NotificationPatch: ofType<{ account: WebAccount; notification: Partial<AccountNotificationType> }>(),
        PatchProgress: ofType<{ login: string; patch: AccountProgress; }>(),
        Reset: ofType<{}>(),
        SetupNotificationChannel: ofType<{ account: WebAccount; webView: Electron.WebviewTag; finishPromise: Promise<any>; }>(),
        ToggleFetching: ofType<{ login: string; } | { account: WebAccount; webView: Electron.WebviewTag; finishPromise: Promise<any>; }>(),
        TryToLogin: ofType<{ account: WebAccount; webView: Electron.WebviewTag; password?: string; }>(),
        WireUpConfigs: ofType<{ accountConfigs: AccountConfig[] }>(),
    },
    {
        tag: "type",
        value: "payload",
        tagPrefix: "accounts:",
    },
);
