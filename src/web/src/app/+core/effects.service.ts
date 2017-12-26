import {of} from "rxjs/observable/of";
import {Injectable} from "@angular/core";
import {Observable} from "rxjs/Observable";
import {Action} from "@ngrx/store";

import {CoreActions} from "_web_app/store/actions";

@Injectable()
export class EffectsService {
    buildFailActionObservable(response: Error | Action | any): Observable<CoreActions.Fail> {
        if (response instanceof Error) {
            return of(new CoreActions.Fail(response));
        }

        // TODO scan "response" for error instance
        return of(new CoreActions.Fail(new Error(JSON.stringify(response))));
    }
}
