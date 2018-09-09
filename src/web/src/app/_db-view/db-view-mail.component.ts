import {ChangeDetectionStrategy, Component, HostBinding, Input} from "@angular/core";

import {MailWithFolderReference as Mail} from "src/shared/model/database";

@Component({
    selector: "email-securely-app-db-view-mail",
    templateUrl: "./db-view-mail.component.html",
    styleUrls: ["./db-view-mail.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DbViewMailComponent {
    @Input()
    mail!: Mail;

    @HostBinding("class.unread")
    get unread() {
        return this.mail && this.mail.unread;
    }
}
