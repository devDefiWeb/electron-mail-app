import {AfterViewInit, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren} from "@angular/core";
import {FormControl, Validators} from "@angular/forms";
import {Store, select} from "@ngrx/store";
import {Subject} from "rxjs";
import {map, takeUntil} from "rxjs/operators";

import {APP_NAME} from "src/shared/constants";
import {NAVIGATION_ACTIONS, OPTIONS_ACTIONS} from "src/web/src/app/store/actions";
import {OptionsSelectors} from "src/web/src/app/store/selectors";
import {State} from "src/web/src/app/store/reducers/options";

export abstract class LoginBaseComponent implements AfterViewInit, OnInit, OnDestroy {
    appName = APP_NAME;

    keytarUnsupportedDetails: boolean = false;

    password = new FormControl(null, Validators.required);

    savePassword = new FormControl(false);

    processing$ = this.store.pipe(
        select(OptionsSelectors.FEATURED.progress),
        map((progress) => progress.signingIn),
    );

    keytarSupport$ = this.store.pipe(
        select(OptionsSelectors.FEATURED.keytarSupport),
    );

    snapPasswordManagerServiceHint$ = this.store.pipe(
        select(OptionsSelectors.FEATURED.snapPasswordManagerServiceHint),
    );

    @ViewChildren("passwordRef")
    passwordElementRefQuery!: QueryList<ElementRef>;

    protected unSubscribe$ = new Subject();

    constructor(
        protected store: Store<State>,
    ) {}

    ngOnInit() {
        this.keytarSupport$
            .pipe(
                takeUntil(this.unSubscribe$),
            )
            .subscribe((value) => this.savePassword[value ? "enable" : "disable"]());
    }

    ngAfterViewInit() {
        if (this.passwordElementRefQuery.length) {
            this.passwordElementRefQuery.first.nativeElement.focus();
        }
    }

    submit() {
        this.store.dispatch(OPTIONS_ACTIONS.SignInRequest({
            password: String(this.password.value),
            savePassword: Boolean(this.savePassword.value),
        }));
    }

    openSettingsFolder(event: Event) {
        event.preventDefault();
        this.store.dispatch(NAVIGATION_ACTIONS.OpenSettingsFolder());
    }

    toggleKeytarUnsupportedDetails(event: Event) {
        event.preventDefault();
        this.keytarUnsupportedDetails = !this.keytarUnsupportedDetails;

    }

    ngOnDestroy() {
        this.unSubscribe$.next();
        this.unSubscribe$.complete();
    }
}
