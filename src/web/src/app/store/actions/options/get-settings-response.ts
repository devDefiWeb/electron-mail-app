import {Action} from "@ngrx/store";

import {Settings} from "_@shared/model/options";

export class GetSettingsResponse implements Action {
    static readonly type = "options:get-settings-response";
    readonly type = GetSettingsResponse.type;

    constructor(public settings: Settings) {}
}
