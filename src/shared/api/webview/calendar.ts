import {ActionType, ScanService, createWebViewApiService} from "electron-rpc-api";

import {NotificationsCalendar} from "src/shared/model/account";
import {PACKAGE_NAME} from "src/shared/constants";
import {ReadonlyDeep} from "type-fest";
import {ZoneApiParameter} from "src/shared/api/common";
import {buildLoggerBundle} from "src/electron-preload/lib/util";

const {Promise, Observable} = ActionType;

export const PROTONMAIL_IPC_WEBVIEW_CALENDAR_API_DEFINITION = {
    ping:
        Promise<ReadonlyDeep<ZoneApiParameter>>(),
    notification:
        Observable<ReadonlyDeep<{ entryUrl: string; entryApiUrl: string } & ZoneApiParameter>, ProtonCalendarNotificationOutput>(),
} as const;

export const PROTONMAIL_IPC_WEBVIEW_CALENDAR_API = createWebViewApiService({
    channel: `${PACKAGE_NAME}:webview-calendar-api`,
    apiDefinition: PROTONMAIL_IPC_WEBVIEW_CALENDAR_API_DEFINITION,
    logger: buildLoggerBundle("[IPC_WEBVIEW_CALENDAR_API:protonmail]"),
});

export type ProtonCalendarApiScan = ScanService<typeof PROTONMAIL_IPC_WEBVIEW_CALENDAR_API>;

export type ProtonCalendarApi = ProtonCalendarApiScan["ApiClient"];

export type ProtonCalendarNotificationOutput = Partial<NotificationsCalendar>;
