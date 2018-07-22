import {concat, delay, exhaustMap, retryWhen, takeWhile} from "rxjs/operators";
import {of, throwError, from} from "rxjs";
import {Injectable, NgZone} from "@angular/core";
import {IpcRenderer} from "electron";
import {Model} from "pubsub-to-stream-api";
import {WebViewApiService} from "electron-rpc-api";

import {AccountType} from "src/shared/model/account";
import {IPC_MAIN_API} from "src/shared/api/main";
import {KeePassClientConf, KeePassRef} from "src/shared/model/keepasshttp";
import {ONE_SECOND_MS} from "src/shared/constants";
import {PROTONMAIL_IPC_WEBVIEW_API, ProtonmailApi} from "src/shared/api/webview/protonmail";
import {TUTANOTA_IPC_WEBVIEW_API, TutanotaApi} from "src/shared/api/webview/tutanota";

type WebViewApi<T extends AccountType, A = T extends "tutanota" ?  TutanotaApi : ProtonmailApi>
    = WebViewApiService<Model.ActionsRecord<Extract<keyof A, string>> & A>;

type CallOptions = Partial<Pick<Model.CallOptions, "timeoutMs" | "finishPromise">>;

@Injectable()
export class ElectronService {
    readonly webViewPingIntervalMs = ONE_SECOND_MS / 2;
    readonly webViewPingTimeoutMs = ONE_SECOND_MS * 5;
    readonly apiCallTimeoutMs = ONE_SECOND_MS * 10;
    readonly ipcRenderer = __ELECTRON_EXPOSURE__.ipcRenderer as IpcRenderer;

    constructor(private zone: NgZone) {}

    webViewClient<T extends AccountType>(webView: Electron.WebviewTag, type: T, options?: CallOptions) {
        // TODO TS: get rid of "as any"
        const api: WebViewApi<T> = type === "protonmail" ? PROTONMAIL_IPC_WEBVIEW_API : TUTANOTA_IPC_WEBVIEW_API as any;
        const apiClient = api.buildClient(webView, {options: this.buildApiCallOptions(options)});

        // TODO it's sufficient to ping api initialization only once since there is no dynamic api de-registration enabled
        const pingStart = Number(new Date());
        const ping$ = from(
            apiClient("ping", {timeoutMs: 1})()
                .pipe(
                    retryWhen((errors) => errors.pipe(
                        takeWhile(() => (Number(new Date()) - pingStart) < this.webViewPingTimeoutMs),
                        delay(this.webViewPingIntervalMs),
                        concat(throwError(new Error(`Failed to wait for "webview:${type}" service provider initialization`))),
                    )),
                )
                .toPromise(),
        );

        return ping$.pipe(
            exhaustMap(() => of(apiClient)),
            exhaustMap((client) => of(client)),
        );
    }

    ipcMainClient(options?: CallOptions) {
        return IPC_MAIN_API.buildClient({
            ipcRenderer: __ELECTRON_EXPOSURE__.ipcRenderer as IpcRenderer,
            options: this.buildApiCallOptions(options),
        });
    }

    keePassPassword(keePassClientConf: KeePassClientConf, keePassRef: KeePassRef, suppressErrors = false) {
        return this.ipcMainClient()("keePassRecordRequest")({keePassClientConf, keePassRef, suppressErrors});
    }

    private buildApiCallOptions(options: CallOptions = {}): Model.CallOptions {
        return Object.assign(
            {timeoutMs: this.apiCallTimeoutMs, notificationWrapper: this.zone.run.bind(this.zone)},
            options,
        );
    }
}
