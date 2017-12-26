import {switchMap} from "rxjs/operators";
import {Observable} from "rxjs/Observable";
import {of} from "rxjs/observable/of";
import {Injectable} from "@angular/core";
import {CanActivate} from "@angular/router";
import {Store} from "@ngrx/store";

import {SETTINGS_OUTLET, SETTINGS_PATH} from "_web_app/app.constants";
import {NavigationActions} from "_web_app/store/actions";
import {initializedSelector, State} from "_web_app/store/reducers/accounts";

@Injectable()
export class AccountsGuard implements CanActivate {
    constructor(private store: Store<State>) {}

    canActivate(): Observable<boolean> {
        return this.store.select(initializedSelector).pipe(switchMap((initialized) => {
            if (initialized) {
                return of(true);
            }

            this.store.dispatch(new NavigationActions.Go({path: [{outlets: {[SETTINGS_OUTLET]: SETTINGS_PATH}}]}));

            return of(false);
        }));
    }
}
