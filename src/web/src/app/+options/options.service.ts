import {Injectable} from "@angular/core";
import {Action} from "@ngrx/store";

import {SETTINGS_OUTLET, SETTINGS_PATH} from "src/web/src/app/app.constants";
import {NAVIGATION_ACTIONS} from "src/web/src/app/store/actions";

@Injectable()
export class OptionsService {
    settingsNavigationAction(opts?: { path?: string, queryParams?: object }): Action {
        const path = opts && "path" in opts ? `${SETTINGS_PATH}${opts.path ? "/" + opts.path : ""}` : null;

        return NAVIGATION_ACTIONS.Go({
            path: [{outlets: {[SETTINGS_OUTLET]: path}}],
            queryParams: opts && opts.queryParams,
        });
    }
}
