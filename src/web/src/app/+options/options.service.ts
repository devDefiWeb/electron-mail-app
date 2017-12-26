import {Injectable} from "@angular/core";
import {Action} from "@ngrx/store";

import {SETTINGS_OUTLET, SETTINGS_PATH} from "_web_app/app.constants";
import {NavigationActions} from "_web_app/store/actions";

@Injectable()
export class OptionsService {
    buildNavigationAction(opts?: { path?: string, queryParams?: object }): Action {
        const path = opts && "path" in opts ? `${SETTINGS_PATH}${opts.path ? "/" + opts.path : ""}` : null;

        return new NavigationActions.Go({
            path: [{outlets: {[SETTINGS_OUTLET]: path}}],
            queryParams: opts && opts.queryParams,
        });
    }
}
