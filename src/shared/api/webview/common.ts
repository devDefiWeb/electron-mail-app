// tslint:disable:no-unused-variable // TODO figure why tslint detects some inports as unused

import {ApiMethod, WebViewApiService} from "electron-rpc-api";
import {Model} from "pubsub-to-stream-api";

import {APP_NAME} from "src/shared/constants";
import {AccountType} from "src/shared/model/account";
import {DbAccountPk, MemoryDbAccount} from "src/shared/model/database";
import {LoginFieldContainer, PasswordFieldContainer} from "src/shared/model/container";
import {ProtonmailApi} from "./protonmail";
import {TutanotaApi} from "./tutanota";
import {ZoneApiParameter} from "src/shared/api/common";

export const channel = `${APP_NAME}:webview-api`;

export interface CommonWebViewApi<T extends AccountType, M extends MemoryDbAccount<T>["metadata"] = MemoryDbAccount<T>["metadata"]> {
    ping: ApiMethod<ZoneApiParameter, null>;
    fillLogin: ApiMethod<LoginFieldContainer & ZoneApiParameter, null>;
    login: ApiMethod<LoginFieldContainer & PasswordFieldContainer & ZoneApiParameter, null>;
    login2fa: ApiMethod<{ secret: string } & ZoneApiParameter, null>;
    buildDbPatch: ApiMethod<DbAccountPk & { metadata: M | null; iteration?: number; } & ZoneApiParameter, null>;
    selectAccount: ApiMethod<{ databaseView?: boolean } & ZoneApiParameter, null>;
}

export type WebViewApi<T extends AccountType, A = T extends "tutanota" ? TutanotaApi : ProtonmailApi>
    = WebViewApiService<Model.ActionsRecord<Extract<keyof A, string>> & A>;
