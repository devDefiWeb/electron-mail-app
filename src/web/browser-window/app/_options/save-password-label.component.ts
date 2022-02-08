import {Component, ElementRef, Inject, Input} from "@angular/core";
import {Observable, Subscription} from "rxjs";
import type {OnDestroy, OnInit} from "@angular/core";
import {select, Store} from "@ngrx/store";

import {getWebLogger} from "src/web/browser-window/util";
import {NAVIGATION_ACTIONS} from "src/web/browser-window/app/store/actions";
import {OptionsSelectors} from "src/web/browser-window/app/store/selectors";
import {PACKAGE_GITHUB_PROJECT_URL_TOKEN} from "src/web/browser-window/app/app.constants";
import {PACKAGE_NAME} from "src/shared/constants";
import {SAVE_PASSWORD_WARN_TRUSTED_HTML} from "./const";
import {State} from "src/web/browser-window/app/store/reducers/options";

@Component({
    selector: "electron-mail-save-password-label",
    templateUrl: "./save-password-label.component.html",
})
export class SavePasswordLabelComponent implements OnInit, OnDestroy {
    readonly userDataDir = __METADATA__.electronLocations.userDataDir;

    @Input()
    savePassword = false;

    keytarUnsupportedDetails = false;

    readonly savePasswordWarnHtmlMessage = SAVE_PASSWORD_WARN_TRUSTED_HTML;

    readonly projectName = PACKAGE_NAME;

    readonly keytarSupport$: Observable<boolean | undefined>;

    readonly snapPasswordManagerServiceHint$: Observable<boolean | undefined>;

    private readonly logger = getWebLogger(__filename, nameof(SavePasswordLabelComponent));

    private readonly subscription = new Subscription();

    constructor(
        @Inject(PACKAGE_GITHUB_PROJECT_URL_TOKEN)
        public readonly PACKAGE_GITHUB_PROJECT_URL: string,
        private readonly store: Store<State>,
        private readonly elementRef: ElementRef,
    ) {
        this.keytarSupport$ = this.store.pipe(
            select(OptionsSelectors.FEATURED.keytarSupport),
        );
        this.snapPasswordManagerServiceHint$ = this.store.pipe(
            select(OptionsSelectors.FEATURED.snapPasswordManagerServiceHint),
        );
    }

    ngOnInit(): void {
        this.subscription.add({
            unsubscribe: __ELECTRON_EXPOSURE__
                .registerDocumentClickEventListener(
                    this.elementRef.nativeElement,
                    this.logger,
                )
                .unsubscribe,
        });
    }

    openSettingsFolder(): void {
        this.store.dispatch(NAVIGATION_ACTIONS.OpenSettingsFolder());
    }

    toggleKeytarUnsupportedDetails(): void {
        this.keytarUnsupportedDetails = !this.keytarUnsupportedDetails;
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
