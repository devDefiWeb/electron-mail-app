import {Injectable} from "@angular/core";
import {Store} from "@ngrx/store";

import {CORE_ACTIONS} from "_@web/src/app/store/actions";
import {State} from "_@web/src/app/store/reducers/root";

@Injectable()
export class GlobalErrorHandler implements GlobalErrorHandler {
    constructor(private store: Store<State>) {}

    handleError(error: Error) {
        this.store.dispatch(CORE_ACTIONS.Fail(error));
    }
}
