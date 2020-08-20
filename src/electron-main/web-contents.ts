import _logger from "electron-log";
import {BrowserWindow, Menu, MenuItemConstructorOptions, WebPreferences, app, clipboard, screen} from "electron";
import {equals, omit, pick} from "remeda";
import {inspect} from "util";
import {isWebUri} from "valid-url";
import {take} from "rxjs/operators";

import {Context} from "./model";
import {DEFAULT_WEB_PREFERENCES, DEFAULT_WEB_PREFERENCES_KEYS} from "src/electron-main/window/constants";
import {IPC_MAIN_API_NOTIFICATION$} from "./api/constants";
import {IPC_MAIN_API_NOTIFICATION_ACTIONS} from "src/shared/api/main";
import {PACKAGE_VERSION} from "src/shared/constants";
import {PLATFORM} from "src/electron-main/constants";
import {buildSpellCheckSettingsMenuItems, buildSpellingSuggestionMenuItems} from "src/electron-main/spell-check/menu";
import {curryFunctionMembers} from "src/shared/util";

const logger = curryFunctionMembers(_logger, "[web-contents]");

const checkWebViewWebPreferencesDefaults: (webPreferences: WebPreferences) => boolean = (
    () => {
        const expected = DEFAULT_WEB_PREFERENCES;
        const pickKeys = DEFAULT_WEB_PREFERENCES_KEYS;
        const resultFn: typeof checkWebViewWebPreferencesDefaults = (webPreferences) => {
            const actual = pick(webPreferences, pickKeys);
            const same = equals(actual, expected);
            if (!same) {
                // TODO figure is the following props not getting precisely translated to "webview.WebPreferences"
                //      expected Electron behavior (prop: expected value => actually received value):
                //     - backgroundThrottling: false => undefined,
                //     - disableBlinkFeatures: "Auxclick" => "",
                //     - nodeIntegrationInWorker: false => undefined,
                //     - spellcheck: false => undefined
                //     - webviewTag: false => undefined
                logger.warn(
                    `Default/expected and actual "webview.webPreferences" props are not equal: `,
                    inspect({actual, expected}),
                );
            }
            return same;
        };
        return resultFn;
    }
)();

const isEmailHref = (href: string): boolean => {
    return String(href).startsWith("mailto:");
};

const extractEmailIfEmailHref = (href: string): string => {
    return isEmailHref(href)
        ? String(href.split("mailto:").pop())
        : href;
};

const notifyLogAndThrow = (message: string): never => {
    IPC_MAIN_API_NOTIFICATION$.next(
        IPC_MAIN_API_NOTIFICATION_ACTIONS.ErrorMessage({message}),
    );
    const error = new Error(message);
    logger.error(error);
    throw error;
};

// WARN: needs to be called before "BrowserWindow" creating (has been ensured by tests)
export async function initWebContentsCreatingHandlers(ctx: Context): Promise<void> {
    const emptyArray = [] as const;
    const endpoints = await ctx.deferredEndpoints.promise;
    const spellCheckController = ctx.getSpellCheckController();
    const webViewEntryUrlsWhitelist: readonly string[] = ctx.locations.webClients.map(({entryUrl}) => `${entryUrl}/`);

    app.on("web-contents-created", async (...[, webContents]) => {
        if (PACKAGE_VERSION.includes("-debug")) {
            const mark = "WEBCONTENTS_EVENTS_DEBUG";

            webContents.on("will-attach-webview", (...[/* event */, ...[webPreferences, params]]) => {
                logger.verbose(
                    mark,
                    JSON.stringify({
                        type: "will-attach-webview",
                        webPreferences,
                        params: omit(params, ["partition"]), // "partition" prop includes "login" value, so skipping it as sensitive data
                    }),
                );
            });
            webContents.on("did-attach-webview", (...[/* event */, childWebContents]) => {
                logger.verbose(
                    mark,
                    JSON.stringify({type: "did-attach-webview", id: childWebContents.id}),
                );
            });

            logger.verbose(mark, "handlers subscribed");
        }

        webContents.on("certificate-error", ({type}, url, error) => {
            logger.error(
                JSON.stringify({
                    type,
                    url,
                }),
                error,
            );
        });
        webContents.on("console-message", ({type}, level, message, line, sourceId) => {
            const isWarn = Number(level) === 2;
            const isError = Number(level) === 3;
            if (isWarn || isError) {
                logger[isWarn ? "warn" : "error"](
                    JSON.stringify({type, level, message, line, sourceId}),
                );
            }
        });
        webContents.on("did-fail-load", (
            {type}, errorCode, errorDescription, validatedURL, isMainFrame, frameProcessId, frameRoutingId,
        ) => {
            logger.error(
                JSON.stringify({
                    type,
                    errorCode,
                    errorDescription,
                    validatedURL,
                    isMainFrame,
                    frameProcessId,
                    frameRoutingId
                }),
            );
        });
        webContents.on("did-fail-provisional-load", (
            {type}, errorCode, errorDescription, validatedURL, isMainFrame, frameProcessId, frameRoutingId,
        ) => { // eslint-disable-line sonarjs/no-identical-functions
            logger.error(
                JSON.stringify({
                    type,
                    errorCode,
                    errorDescription,
                    validatedURL,
                    isMainFrame,
                    frameProcessId,
                    frameRoutingId
                }),
            );
        });
        webContents.on("plugin-crashed", ({type}, name, version) => {
            logger.error(
                JSON.stringify({type, name, version}),
            );
        });
        webContents.on("preload-error", ({type}, preloadPath, error) => {
            logger.error(
                JSON.stringify({type, preloadPath}),
                error,
            );
        });
        webContents.on("render-process-gone", ({type}, details) => {
            logger.error(
                JSON.stringify({type, details}),
            );
        });
        webContents.on("new-window", async (event, url) => {
            event.preventDefault();
            if (isWebUri(url)) {
                await endpoints.openExternal({url});
                return;
            }
            logger.warn(`Opening a new window is forbidden, url: "${url}"`);
        });
        webContents.on("context-menu", async (...[, {editFlags, linkURL, linkText, isEditable, selectionText}]) => {
            const menuItems: MenuItemConstructorOptions[] = [];

            if (linkURL) {
                menuItems.push(
                    {
                        label: isEmailHref(linkURL) ? "Copy Email Address" : "Copy Link Address",
                        click() {
                            if (PLATFORM === "darwin") {
                                clipboard.writeBookmark(linkText, extractEmailIfEmailHref(linkURL));
                            } else {
                                clipboard.writeText(extractEmailIfEmailHref(linkURL));
                            }
                        },
                    },
                );
            } else {
                const checkSpelling = Boolean(spellCheckController.getCurrentLocale());
                const misspelled = Boolean(
                    checkSpelling
                    &&
                    isEditable
                    &&
                    selectionText
                    &&
                    spellCheckController
                        .getSpellCheckProvider()
                        .isMisspelled(selectionText),
                );

                if (misspelled) {
                    menuItems.push(
                        ...buildSpellingSuggestionMenuItems(
                            webContents,
                            spellCheckController
                                .getSpellCheckProvider()
                                .getSuggestions(selectionText)
                                .slice(0, 7),
                        ),
                    );
                }

                if (isEditable) {
                    menuItems.push(...[
                        ...(menuItems.length ? [{type: "separator"} as const] : emptyArray),
                        ...buildSpellCheckSettingsMenuItems(
                            checkSpelling
                                ? await spellCheckController.getAvailableDictionaries()
                                : [],
                            spellCheckController.getCurrentLocale(),
                            async (locale) => {
                                await endpoints.changeSpellCheckLocale({locale});
                            },
                        ),
                    ]);
                }

                menuItems.push(...[
                    ...(menuItems.length ? [{type: "separator"} as const] : emptyArray),
                    ...[
                        // TODO use "role" based "cut/copy/paste" actions, currently these actions don't work properly
                        // keep track of the respective issue https://github.com/electron/electron/issues/15219
                        ...(editFlags.canCut ? [{label: "Cut", click: () => webContents.cut()}] : emptyArray),
                        ...(editFlags.canCopy ? [{label: "Copy", click: () => webContents.copy()}] : emptyArray),
                        ...(editFlags.canPaste ? [{label: "Paste", click: () => webContents.paste()}] : emptyArray),
                        ...(editFlags.canSelectAll ? [{label: "Select All", click: () => webContents.selectAll()}] : emptyArray),
                    ],
                ]);
            }

            if (!menuItems.length) {
                return;
            }

            Menu
                .buildFromTemplate(menuItems)
                .popup({});
        });
        webContents.on("preload-error", (event, preloadPath, error) => {
            logger.error(event.type, preloadPath, error);
        });
        webContents.on("will-attach-webview", (...[event, webPreferences, {src}]) => {
            if (!webViewEntryUrlsWhitelist.some((allowedPrefix) => src.startsWith(allowedPrefix))) {
                event.preventDefault();
                notifyLogAndThrow(`Forbidden "webview.src" value: "${src}"`);
            }

            if (!checkWebViewWebPreferencesDefaults(webPreferences)) {
                Object.assign(webPreferences, DEFAULT_WEB_PREFERENCES);
            }
        });
        webContents.on("update-target-url", (...[, url]) => {
            const focusedWindow = BrowserWindow.getFocusedWindow();

            if (!url || !focusedWindow) {
                IPC_MAIN_API_NOTIFICATION$.next(
                    IPC_MAIN_API_NOTIFICATION_ACTIONS.TargetUrl({url}),
                );
                return;
            }

            const cursorScreenPoint = screen.getCursorScreenPoint();
            const focusedWindowBounds = focusedWindow.getBounds();

            IPC_MAIN_API_NOTIFICATION$.next(
                IPC_MAIN_API_NOTIFICATION_ACTIONS.TargetUrl({
                    url,
                    position: {
                        // TODO subtract width/height of devtools window
                        //      currenty devloots window should be closed/detached for percent size to be properly calculated
                        cursorXPercent: (cursorScreenPoint.x - focusedWindowBounds.x) / (focusedWindowBounds.width / 100),
                        // TODO take window titlebar into the account
                        cursorYPercent: (cursorScreenPoint.y - focusedWindowBounds.y) / (focusedWindowBounds.height / 100),
                    },
                }),
            );
        });

        const {zoomFactor} = await ctx.config$.pipe(take(1)).toPromise();
        webContents.zoomFactor = zoomFactor;
    });
}
