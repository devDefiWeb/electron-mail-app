import {ofType, unionize} from "@vladimiry/unionize";

import {AccountConfig} from "src/shared/model/account";
import {DbAccountPk} from "src/shared/model/database";
import {ProtonApiScan} from "src/shared/api/webview/primary";
import {State} from "src/web/browser-window/app/store/reducers/accounts";
import {WebAccount, WebAccountProgress} from "src/web/browser-window/app/model";

export const ACCOUNTS_ACTIONS = unionize({
        Select: ofType<{ login: string }>(),
        DeSelect: ofType<{ login: string }>(),
        PatchProgress: ofType<{ login: string; patch: WebAccountProgress; optionalAccount?: boolean; }>(),
        Patch: ofType<{
            login: string;
            patch: Partial<{
                [k in keyof Pick<WebAccount,
                    | "notifications"
                    | "syncingActivated"
                    | "loginFilledOnce"
                    | "loginDelayedSeconds"
                    | "loginDelayedUntilSelected">]: Partial<WebAccount[k]>
            }>;
            optionalAccount?: boolean;
        }>(),
        PatchDbExportProgress: ofType<{ pk: DbAccountPk; uuid: string; progress?: number }>(),
        ToggleDatabaseView: ofType<{ login: string; forced?: Pick<WebAccount, "databaseView"> }>(),
        ToggleSyncing: ofType<{ pk: DbAccountPk; webView: Electron.WebviewTag; finishPromise: Promise<void> }>(),
        Synced: ofType<{ pk: DbAccountPk }>(),
        SetupNotificationChannel: ofType<{ account: WebAccount; webView: Electron.WebviewTag; finishPromise: Promise<void> }>(),
        TryToLogin: ofType<{ account: WebAccount; webView: Electron.WebviewTag }>(),
        WireUpConfigs: ofType<DeepReadonly<{ accountConfigs: AccountConfig[] }>>(),
        PatchGlobalProgress: ofType<{ patch: State["globalProgress"] }>(),
        SelectMailOnline: ofType<StrictOmit<ProtonApiScan["ApiImplArgs"]["selectMailOnline"][0], "zoneName">>(),
        FetchSingleMailSetParams: ofType<{ pk: DbAccountPk }
            & Partial<Pick<Exclude<WebAccount["fetchSingleMailParams"], null>, "mailPk">>>(),
        FetchSingleMail: ofType<{ account: WebAccount; webView: Electron.WebviewTag }
            & Pick<Exclude<WebAccount["fetchSingleMailParams"], null>, "mailPk">>(),
        MakeMailReadSetParams: ofType<{ pk: DbAccountPk }
            & (Exclude<WebAccount["makeReadMailParams"], null> | {})>(), // eslint-disable-line @typescript-eslint/ban-types
        MakeMailRead: ofType<{ account: WebAccount; webView: Electron.WebviewTag }
            & Exclude<WebAccount["makeReadMailParams"], null>>(),
        SetMailFolderParams: ofType<{ pk: DbAccountPk }
            & (Exclude<WebAccount["setMailFolderParams"], null> | {})>(), // eslint-disable-line @typescript-eslint/ban-types
        SetMailFolder: ofType<{ account: WebAccount; webView: Electron.WebviewTag }
            & Exclude<WebAccount["setMailFolderParams"], null>>(),
    },
    {
        tag: "type",
        value: "payload",
        tagPrefix: "accounts:",
    },
);
