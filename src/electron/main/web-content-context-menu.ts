import {app, clipboard, ContextMenuParams, Event, Menu} from "electron";

import {Context} from "./model";

const selectionMenu = Menu.buildFromTemplate([
    {role: "copy"},
    {type: "separator"},
    {role: "selectall"},
]);
const inputMenu = Menu.buildFromTemplate([
    {role: "undo"},
    {role: "redo"},
    {type: "separator"},
    {role: "cut"},
    {role: "copy"},
    {role: "paste"},
    {type: "separator"},
    {role: "selectall"},
]);

export function initWebContentContextMenu(ctx: Context) {
    const contextMenuEvenHandler = (e: Event, props: ContextMenuParams) => {
        const {selectionText, isEditable, linkURL} = props;
        const browserWindow = ctx.uiContext && ctx.uiContext.browserWindow;

        if (!browserWindow) {
            return;
        }

        if (isEditable) {
            inputMenu.popup(browserWindow);
            return;
        }

        if (linkURL) {
            Menu
                .buildFromTemplate([{
                    label: "Copy Link Address",
                    click() {
                        clipboard.writeText(linkURL);
                    },
                }])
                .popup(browserWindow);
            return;
        }

        if (selectionText && selectionText.trim()) {
            selectionMenu.popup(browserWindow);
        }
    };

    app.on("browser-window-created", (event, {webContents}) => {
        webContents.on("context-menu", contextMenuEvenHandler);
    });
    app.on("web-contents-created", (webContentsCreatedEvent, webContents) => {
        webContents.on("context-menu", contextMenuEvenHandler);
    });
}
