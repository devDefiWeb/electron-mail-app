import {IpcMainApiActionContext, IpcMainApiService} from "electron-rpc-api";
import {Observable, Subject, from, of} from "rxjs";
import {startWith} from "rxjs/operators";

import {Context} from "src/electron-main/model";
import {Endpoints} from "src/shared/api/main";
import {Unpacked} from "src/shared/types";
import {initFindInPageBrowserView} from "src/electron-main/window";

type ApiMethods =
    | "findInPageDisplay"
    | "findInPage"
    | "findInPageStop"
    | "findInPageNotification";

type Notification = Unpacked<ReturnType<Endpoints["findInPageNotification"]>>;

interface NotificationMapValue {
    subject: Subject<Notification>;
    observable: Observable<Notification>;
}

export async function buildEndpoints(
    ctx: Context,
    resolveEndpoints: () => Endpoints,
): Promise<Pick<Endpoints, ApiMethods>> {
    const resolveContext = () => {
        if (!ctx.uiContext) {
            throw new Error(`UI Context has not been initialized`);
        }
        return ctx.uiContext;
    };
    const findInPageNotifications = new WeakMap<Electron.WebContents, NotificationMapValue>();
    const endpoints: Pick<Endpoints, ApiMethods> = {
        findInPageDisplay: ({visible}) => from((async () => {
            const {findInPage} = await resolveEndpoints().readConfig().toPromise();

            if (!findInPage) {
                return null;
            }

            const uiContext = resolveContext();

            if (visible) {
                if (!uiContext.findInPageBrowserView || uiContext.findInPageBrowserView.isDestroyed()) {
                    const view = uiContext.findInPageBrowserView = initFindInPageBrowserView(ctx);
                    setTimeout(() => view.webContents.focus());
                }
            } else {
                // WARN: "findInPageBrowserView.webContents" is needed to send API response
                // so we don't destroy it immediately but with timeout letting API respond to request first (see "electron-rpc-api" module)
                setTimeout(() => {
                    if (!uiContext.findInPageBrowserView) {
                        return;
                    }

                    // reset/complete the notification
                    const {webContents: browserViewWebContents} = uiContext.findInPageBrowserView;
                    const notification = findInPageNotifications.get(browserViewWebContents);
                    if (notification) {
                        notification.subject.complete();
                        findInPageNotifications.delete(browserViewWebContents);
                    }

                    // destroy
                    // WARN "setBrowserView" needs to be called with null, see https://github.com/electron/electron/issues/13581
                    // TODO TS: get rid of any cast, see https://github.com/electron/electron/issues/13581
                    uiContext.browserWindow.setBrowserView(null as any);
                    uiContext.findInPageBrowserView.destroy();
                    delete uiContext.findInPageBrowserView;
                });

                uiContext.browserWindow.webContents.focus();
            }

            return null;
        })()),

        findInPage({query, options}) {
            const {browserWindow: {webContents}} = resolveContext();
            const requestId = webContents.findInPage(query, options);

            return of({requestId});
        },

        findInPageStop({action}) {
            const {browserWindow: {webContents}} = resolveContext();

            webContents.stopFindInPage(action);

            return of(null);
        },

        findInPageNotification(this: IpcMainApiActionContext) {
            const [event] = IpcMainApiService.resolveActionContext(this).args;
            const {sender: browserViewWebContents} = event;
            const {browserWindow: {webContents: browserWindowWebContents}} = resolveContext();
            const notification: NotificationMapValue = (
                findInPageNotifications.get(browserViewWebContents)
                ||
                (() => {
                    const subject = new Subject<Notification>();
                    const observable = subject.asObservable();
                    const result = {subject, observable};

                    findInPageNotifications.set(browserViewWebContents, result);

                    return result;
                })()
            );

            browserWindowWebContents.addListener("found-in-page", (...args) => {
                const [, result] = args;
                notification.subject.next(result);
            });

            return notification.observable.pipe(
                // initial/fake response resets the timeout
                startWith({requestId: null}),
            );
        },
    };

    return endpoints;
}
