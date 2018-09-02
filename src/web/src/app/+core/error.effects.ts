import {Actions, Effect} from "@ngrx/effects";
import {Injectable} from "@angular/core";
import {map} from "rxjs/operators";

import {CORE_ACTIONS, NAVIGATION_ACTIONS, unionizeActionFilter} from "src/web/src/app/store/actions";
import {ERRORS_OUTLET, ERRORS_PATH} from "src/web/src/app/app.constants";

@Injectable()
export class ErrorEffects {
    @Effect()
    $error = this.actions$.pipe(
        unionizeActionFilter(CORE_ACTIONS.is.Fail),
        map(() => NAVIGATION_ACTIONS.Go({path: [{outlets: {[ERRORS_OUTLET]: ERRORS_PATH}}]})),
    );

    constructor(
        private actions$: Actions<{ type: string; payload: any }>,
    ) {}
}
