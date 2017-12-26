import {Action} from "@ngrx/store";

import {ProgressPatch} from "_web_app/store/reducers/options";

export class PatchProgress implements Action {
    static readonly type = "options:patch-progress";
    readonly type = PatchProgress.type;

    constructor(public patch: ProgressPatch) {}
}
