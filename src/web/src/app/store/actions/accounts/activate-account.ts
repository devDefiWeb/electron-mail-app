import {Action} from "@ngrx/store";

import {WebAccount} from "_shared/model/account";

export class ActivateAccount implements Action {
    static readonly type = "account:activate-account";
    readonly type = ActivateAccount.type;

    constructor(public login: string) {}
}
