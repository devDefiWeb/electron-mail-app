import {CanActivate} from "@angular/router";
import {Injectable} from "@angular/core";
import {Observable, of} from "rxjs";
import {Store, select} from "@ngrx/store";
import {concatMap} from "rxjs/operators";

import {AccountsSelectors} from "src/web/browser-window/app/store/selectors";
import {NAVIGATION_ACTIONS} from "src/web/browser-window/app/store/actions";
import {SETTINGS_OUTLET, SETTINGS_PATH} from "src/web/browser-window/app/app.constants";
import {State} from "src/web/browser-window/app/store/reducers/accounts";

@Injectable()
export class AccountsGuard implements CanActivate {
    constructor(
        private store: Store<State>,
    ) {}

    canActivate(): Observable<boolean> {
        return this.store.pipe(
            select(AccountsSelectors.FEATURED.initialized),
            concatMap((initialized) => {
                if (initialized) {
                    return of(true);
                }

                this.store.dispatch(
                    NAVIGATION_ACTIONS.Go({path: [{outlets: {[SETTINGS_OUTLET]: SETTINGS_PATH}}]}),
                );

                return of(false);
            }),
        );
    }
}
