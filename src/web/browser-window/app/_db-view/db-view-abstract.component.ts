import {combineLatest, EMPTY, fromEvent, merge, Observable, of} from "rxjs";
import {Directive, Input, ╔ÁmarkDirty as markDirty} from "@angular/core";
import {distinctUntilChanged, map, mergeMap, startWith} from "rxjs/operators";
import {select, Store} from "@ngrx/store";

import {AccountsSelectors} from "src/web/browser-window/app/store/selectors";
import {NgChangesObservableComponent} from "src/web/browser-window/app/components/ng-changes-observable.component";
import {resolveInstance$} from "./util";
import {State} from "src/web/browser-window/app/store/reducers/db-view";
import {WebAccountPk} from "src/web/browser-window/app/model";

@Directive()
// so weird not single-purpose directive huh, https://github.com/angular/angular/issues/30080#issuecomment-539194668
// eslint-disable-next-line @angular-eslint/directive-class-suffix
export abstract class DbViewAbstractComponent extends NgChangesObservableComponent {
    @Input()
    webAccountPk!: WebAccountPk;

    webAccountPk$: Observable<WebAccountPk> = this.ngChangesObservable("webAccountPk").pipe(
        mergeMap((value) => value ? of(value) : EMPTY),
    );

    account$ = this.webAccountPk$.pipe(
        mergeMap(({login}) => this.store.pipe(
            select(AccountsSelectors.ACCOUNTS.pickAccount({login})),
            mergeMap((value) => value ? [value] : EMPTY),
            distinctUntilChanged(),
        )),
    );

    onlineAndSignedIn$: Observable<boolean> = combineLatest([
        this.account$.pipe(
            map(({notifications}) => notifications.loggedIn),
            distinctUntilChanged(),
        ),
        merge(
            fromEvent(window, "online"),
            fromEvent(window, "offline"),
        ).pipe(
            map(() => navigator.onLine),
            startWith(navigator.onLine),
        ),
    ]).pipe(
        map(([signedIn, online]) => signedIn && online),
    );

    instance$ = resolveInstance$(this.store, this.webAccountPk$.pipe(map(({login}) => login)));

    protected constructor(
        protected store: Store<State>,
    ) {
        super();
    }

    protected markDirty(): void {
        // markDirty does the same job as ViewRef/ChangeDetectorRef.markForCheck
        // only in addition it schedules change detection using requestAnimationFrame
        markDirty(this);
    }
}
