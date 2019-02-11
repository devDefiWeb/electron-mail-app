import {AbstractControl, FormControl, FormGroup, Validators} from "@angular/forms";
import {Component, OnInit} from "@angular/core";
import {Store, select} from "@ngrx/store";
import {distinctUntilChanged, map, take} from "rxjs/operators";

import {AccountsSelectors, OptionsSelectors} from "src/web/src/app/store/selectors";
import {BaseConfig} from "src/shared/model/options";
import {LOG_LEVELS} from "src/shared/constants";
import {NAVIGATION_ACTIONS, OPTIONS_ACTIONS} from "src/web/src/app/store/actions";
import {State} from "src/web/src/app/store/reducers/options";

@Component({
    selector: "email-securely-app-base-settings",
    templateUrl: "./base-settings.component.html",
    preserveWhitespaces: true,
})
export class BaseSettingsComponent implements OnInit {
    baseConfig$ = this.store.select(OptionsSelectors.CONFIG.base);

    processing$ = this.store.select(OptionsSelectors.FEATURED.progress).pipe(map((p) => p.updatingBaseSettings));

    fullTextSearchDisabled$ = this.store
        .select(OptionsSelectors.SETTINGS.localStoreEnabledCount)
        .pipe(
            distinctUntilChanged(),
            map((value) => value < 1),
        );

    logLevels = LOG_LEVELS;

    controls: Record<keyof BaseConfig, AbstractControl> = {
        checkForUpdatesAndNotify: new FormControl(),
        clearSession: new FormControl(),
        closeToTray: new FormControl(),
        compactLayout: new FormControl(),
        customUnreadBgColor: new FormControl(),
        customUnreadTextColor: new FormControl(),
        disableSpamNotifications: new FormControl(),
        findInPage: new FormControl(),
        fullTextSearch: new FormControl(),
        logLevel: new FormControl(null, Validators.required),
        startMinimized: new FormControl(),
        unreadNotifications: new FormControl(),
    };

    form = new FormGroup(this.controls);

    colorPickerOpened: { bg: boolean; text: boolean } = {bg: false, text: false};

    $unreadBgColor = this.store.pipe(select(OptionsSelectors.CONFIG.unreadBgColor));

    $unreadTextColor = this.store.pipe(select(OptionsSelectors.CONFIG.unreadTextColor));

    $unreadSummary = this.store.select(AccountsSelectors.ACCOUNTS.loggedInAndUnreadSummary).pipe(
        map(({unread}) => unread),
    );

    constructor(
        private store: Store<State>,
    ) {}

    ngOnInit() {
        this.baseConfig$
            .pipe(take(1))
            .subscribe((data) => this.form.patchValue(data));

        this.form.valueChanges.subscribe(() => {
            this.store.dispatch(OPTIONS_ACTIONS.PatchBaseSettingsRequest(this.form.getRawValue()));
        });
    }

    bgColorPickerChangeHandler(color: string) {
        this.controls.customUnreadBgColor.patchValue(color);
    }

    textColorPickerChangeHandler(color: string) {
        this.controls.customUnreadTextColor.patchValue(color);
    }

    openSettingsFolder(event: Event) {
        event.preventDefault();
        this.store.dispatch(NAVIGATION_ACTIONS.OpenSettingsFolder());
    }
}
