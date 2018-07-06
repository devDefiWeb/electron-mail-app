import {distinctUntilChanged, map, takeUntil} from "rxjs/operators";
import {Subject} from "rxjs";
import {Component, OnDestroy, OnInit} from "@angular/core";
import {Store} from "@ngrx/store";

import {WebAccount} from "_@shared/model/account";
import {SETTINGS_OUTLET, SETTINGS_PATH} from "_@web/src/app/app.constants";
import {ACCOUNTS_ACTIONS, NAVIGATION_ACTIONS, OPTIONS_ACTIONS} from "_@web/src/app/store/actions";
import {
    accountsSelector,
    accountsUnreadSummarySelector,
    initializedSelector,
    selectedAccountSelector,
    selectedLoginSelector,
    State,
} from "_@web/src/app/store/reducers/accounts";
import {configCompactLayoutSelector, progressSelector} from "_@web/src/app/store/reducers/options";

@Component({
    selector: `email-securely-app-accounts`,
    templateUrl: "./accounts.component.html",
    styleUrls: ["./accounts.component.scss"],
    preserveWhitespaces: true,
})
export class AccountsComponent implements OnInit, OnDestroy {
    accounts$ = this.store.select(accountsSelector);
    accountsUnreadSummary$ = this.store.select(accountsUnreadSummarySelector);
    initialized$ = this.store.select(initializedSelector);
    selectedLogin$ = this.store.select(selectedLoginSelector);
    compactLayout$ = this.store.select(configCompactLayoutSelector);
    togglingCompactLayout$ = this.store.select(progressSelector)
        .pipe(map(({togglingCompactLayout}) => togglingCompactLayout));
    accounts: WebAccount[] = [];
    selectedAccount?: WebAccount;
    unSubscribe$ = new Subject();

    constructor(private store: Store<State>) {}

    ngOnInit() {
        this.accounts$
            .pipe(takeUntil(this.unSubscribe$))
            .subscribe((accounts) => this.accounts = accounts);

        this.accountsUnreadSummary$
            .pipe(
                distinctUntilChanged(),
                takeUntil(this.unSubscribe$),
            )
            .subscribe((unread) => {
                return this.store.dispatch(ACCOUNTS_ACTIONS.UpdateOverlayIcon({count: unread}));
            });

        this.store.select(selectedAccountSelector)
            .pipe(takeUntil(this.unSubscribe$))
            .subscribe((selectedAccount) => this.selectedAccount = selectedAccount);
    }

    activateAccount(account: WebAccount) {
        this.store.dispatch(ACCOUNTS_ACTIONS.Activate({login: account.accountConfig.login}));
    }

    trackAccount(index: number, account: WebAccount) {
        return account ? `${account.accountConfig.login}` : undefined;
    }

    openSettingsView() {
        this.store.dispatch(NAVIGATION_ACTIONS.Go({
            path: [{outlets: {[SETTINGS_OUTLET]: SETTINGS_PATH}}],
        }));
    }

    openAddingAccountView() {
        this.store.dispatch(NAVIGATION_ACTIONS.Go({
            path: [{outlets: {[SETTINGS_OUTLET]: `${SETTINGS_PATH}/account-edit`}}],
        }));
    }

    openAboutWindow() {
        this.store.dispatch(NAVIGATION_ACTIONS.OpenAboutWindow());
    }

    openSettingsFolder() {
        this.store.dispatch(NAVIGATION_ACTIONS.OpenSettingsFolder());
    }

    toggleCompactLayout() {
        this.store.dispatch(OPTIONS_ACTIONS.ToggleCompactRequest());
    }

    logout() {
        this.store.dispatch(NAVIGATION_ACTIONS.Logout());
    }

    quit() {
        this.store.dispatch(NAVIGATION_ACTIONS.Quit());
    }

    ngOnDestroy() {
        this.unSubscribe$.next();
        this.unSubscribe$.complete();
    }
}
