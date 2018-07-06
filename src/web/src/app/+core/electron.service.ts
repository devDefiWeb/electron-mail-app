import {Injectable, NgZone} from "@angular/core";

import {AccountType} from "_@shared/model/account";
import {ElectronExposure} from "_@shared/model/electron";
import {IPC_MAIN_API} from "_@shared/api/main";
import {IPC_WEBVIEW_API} from "_@shared/api/webview";
import {KeePassClientConf, KeePassRef} from "_@shared/model/keepasshttp";
import {ONE_SECOND_MS} from "_@shared/constants";

const ipcRenderer: any = ((window as any).__ELECTRON_EXPOSURE__ as ElectronExposure).ipcRenderer;
const IPC_MAIN_API_CALLER = IPC_MAIN_API.buildClient({ipcRenderer});

@Injectable()
export class ElectronService {
    callCounter = 0;

    readonly timeoutMs = ONE_SECOND_MS * 15;

    constructor(private zone: NgZone) {}

    webViewCaller(webView: Electron.WebviewTag, type: AccountType) {
        return IPC_WEBVIEW_API[type]
            .buildClient(webView, {options: {timeoutMs: this.timeoutMs, notificationWrapper: this.zone.run.bind(this.zone)}});
    }

    keePassPassword(keePassClientConf: KeePassClientConf, keePassRef: KeePassRef, suppressErrors = false) {
        return this.callIpcMain("keePassRecordRequest")({keePassClientConf, keePassRef, suppressErrors});
    }

    callIpcMain: typeof IPC_MAIN_API_CALLER = (name, options) => {
        return IPC_MAIN_API_CALLER(name, {timeoutMs: this.timeoutMs, notificationWrapper: this.zone.run.bind(this.zone), ...options});
    }
}
