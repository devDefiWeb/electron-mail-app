import {Action} from "@ngrx/store";
import {Injectable} from "@angular/core";

import {NAVIGATION_ACTIONS} from "src/web/browser-window/app/store/actions";
import {SETTINGS_OUTLET, SETTINGS_PATH} from "src/web/browser-window/app/app.constants";

@Injectable()
export class OptionsService {
    settingsNavigationAction(opts?: { path?: string; queryParams?: Record<string, unknown> }): Action {
        const path = opts && "path" in opts ? `${SETTINGS_PATH}${opts.path ? "/" + opts.path : ""}` : null;

        return NAVIGATION_ACTIONS.Go({
            path: [{outlets: {[SETTINGS_OUTLET]: path}}],
            queryParams: opts && opts.queryParams,
        });
    }
}
