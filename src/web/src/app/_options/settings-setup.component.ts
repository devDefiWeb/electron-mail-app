import {Component} from "@angular/core";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {Store} from "@ngrx/store";

import {LoginBaseComponent} from "./login-base.component";
import {State} from "src/web/src/app/store/reducers/options";

@Component({
    selector: "email-securely-app-settings-setup",
    templateUrl: "./settings-setup.component.html",
    styleUrls: ["./settings-setup.component.scss"],
    preserveWhitespaces: true,
})
export class SettingsSetupComponent extends LoginBaseComponent {
    passwordConfirm = new FormControl(null, [
        Validators.required,
        // TODO make "controls match" to be "common/util" validator
        () => {
            if (this.password
                && this.passwordConfirm
                && this.password.value !== this.passwordConfirm.value) {
                return {mismatch: true};
            }

            return null;
        },
    ]);

    form = new FormGroup({
        savePassword: this.savePassword,
        password: this.password,
        passwordConfirm: this.passwordConfirm,
    });

    constructor(
        store: Store<State>,
    ) {
        super(store);
    }
}
