import {Component, HostListener} from "@angular/core";
import {Location} from "@angular/common";
import {Store} from "@ngrx/store";

import {ACCOUNTS_OUTLET, ESC_KEY, NOTIFICATIONS_OUTLET, SETTINGS_OUTLET} from "src/web/browser-window/app/app.constants";
import {NAVIGATION_ACTIONS} from "src/web/browser-window/app/store/actions";
import {State} from "src/web/browser-window/app/store/reducers/root";

export type CloseableOutletsType =
    | typeof NOTIFICATIONS_OUTLET
    | typeof SETTINGS_OUTLET;

@Component({
    selector: "electron-mail-app",
    template: `
        <router-outlet name="${ACCOUNTS_OUTLET}"></router-outlet>
        <router-outlet name="${SETTINGS_OUTLET}"></router-outlet>
        <router-outlet name="${NOTIFICATIONS_OUTLET}"></router-outlet>
    `,
    styleUrls: ["./app.component.scss"],
})
export class AppComponent {
    private closeableOutlets: CloseableOutletsType[] = [
        NOTIFICATIONS_OUTLET,
        SETTINGS_OUTLET,
    ];

    constructor(
        private location: Location,
        private store: Store<State>,
    ) {}

    @HostListener("document:keyup", ["$event"])
    onKeyUp({key}: KeyboardEvent) {
        if (key !== ESC_KEY) {
            return;
        }

        const hash = this.location.path(true);

        for (const outlet of this.closeableOutlets) {
            if (hash.indexOf(`${outlet}:`) !== -1) {
                this.closeOutlet(outlet);
                return;
            }
        }
    }

    private closeOutlet(outlet: CloseableOutletsType) {
        this.store.dispatch(NAVIGATION_ACTIONS.Go({path: [{outlets: {[outlet]: null}}]}));
    }
}
