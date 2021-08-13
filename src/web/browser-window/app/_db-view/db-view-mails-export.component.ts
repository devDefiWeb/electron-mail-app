import {AbstractControl, FormControl, FormGroup, Validators} from "@angular/forms";
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";
import {ChangeDetectionStrategy, Component, Input, TemplateRef} from "@angular/core";
import {EMPTY, from} from "rxjs";
import type {OnInit} from "@angular/core";
import {Store} from "@ngrx/store";
import {clone, pick} from "remeda";
import {mergeMap, takeUntil} from "rxjs/operators";

import {DB_VIEW_ACTIONS, NOTIFICATION_ACTIONS} from "src/web/browser-window/app/store/actions";
import {DbViewAbstractComponent} from "src/web/browser-window/app/_db-view/db-view-abstract.component";
import {ElectronService} from "src/web/browser-window/app/_core/electron.service";
import {MailsBundle, State} from "src/web/browser-window/app/store/reducers/db-view";
import {ONE_SECOND_MS} from "src/shared/constants";
import {View} from "src/shared/model/database";
import {filterConversationNodesMails} from "src/shared/util";

const selector = "electron-mail-db-view-mails-export";

@Component({
    selector,
    templateUrl: "./db-view-mails-export.component.html",
    styleUrls: ["./db-view-mails-export.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DbViewMailsExportComponent extends DbViewAbstractComponent implements OnInit {
    @Input()
    mailsBundleItems?: MailsBundle["items"];

    @Input()
    rootConversationNode?: View.RootConversationNode;

    readonly formControls: Record<"exportDir" | "fileType" | "includingAttachments", AbstractControl> = {
        exportDir: new FormControl(
            null,
            Validators.required, // eslint-disable-line @typescript-eslint/unbound-method
        ),
        fileType: new FormControl(
            "eml",
            Validators.pattern(/^(eml|json)$/), // eslint-disable-line @typescript-eslint/unbound-method
        ),
        includingAttachments: new FormControl(false),
    };

    readonly form = new FormGroup(this.formControls);

    @Input()
    title = "";

    @Input()
    titleSuffix = "";

    modalRef?: BsModalRef;

    modalOpeningProgress = false;

    constructor(
        store: Store<State>,
        private readonly api: ElectronService,
        private readonly modalService: BsModalService,
    ) {
        super(store);
    }

    ngOnInit(): void {
        this.onlineAndSignedIn$
            .pipe(takeUntil(this.ngOnDestroy$))
            .subscribe((onlineAndSignedIn) => {
                this.formControls.includingAttachments[onlineAndSignedIn ? "enable" : "disable"]();
                if (!onlineAndSignedIn) {
                    this.formControls.includingAttachments.patchValue(false);
                }
            });
        this.modalService.onShown
            .pipe(takeUntil(this.ngOnDestroy$))
            .subscribe(() => this.modalOpeningProgress = false);
    }

    openModal(
        modalTemplate: TemplateRef<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
    ): void {
        if (this.modalRef) {
            this.modalRef.hide();
            this.form.reset();
        }

        this.formControls.fileType.patchValue("eml");
        this.modalOpeningProgress = true;
        this.markDirty();

        setTimeout(
            () => {
                this.modalRef = this.modalService.show(
                    modalTemplate,
                    {
                        initialState: clone(
                            pick(this, ["mailsBundleItems", "rootConversationNode"]),
                        ),
                        class: `modal-lg ${selector}-modal`,
                        backdrop: "static",
                        ignoreBackdropClick: true,
                    },
                );
            },
            ONE_SECOND_MS / 10,
        );
    }

    selectExportDir(): void {
        from(this.api.ipcMainClient()("selectPath")())
            .pipe(
                takeUntil(this.ngOnDestroy$),
                mergeMap((value) => {
                    return "location" in value
                        ? [value]
                        : EMPTY;
                }),
            )
            .subscribe(
                ({location}) => {
                    this.formControls.exportDir.patchValue(location);
                },
                (error) => this.store.dispatch(NOTIFICATION_ACTIONS.Error(error)),
            );
    }

    submit(): void {
        const mails: View.Mail[] = this.mailsBundleItems
            ? this.mailsBundleItems.map(({mail}) => mail)
            : this.rootConversationNode
                ? filterConversationNodesMails([this.rootConversationNode])
                : [];

        this.store.dispatch(
            DB_VIEW_ACTIONS.DbExport({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                exportDir: this.formControls.exportDir.value,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                fileType: this.formControls.fileType.value,
                // eslint-disable-next-line max-len, @typescript-eslint/no-unsafe-assignment
                includingAttachments: this.formControls.includingAttachments.value,
                ...this.webAccountPk,
                ...(mails.length && {mailPks: mails.map(({pk}) => pk)}),
            }),
        );

        if (this.modalRef) {
            this.modalRef.hide();
        }
    }
}
