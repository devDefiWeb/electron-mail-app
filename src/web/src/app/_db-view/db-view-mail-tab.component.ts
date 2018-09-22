import {ChangeDetectionStrategy, Component, Input} from "@angular/core";
import {Store, select} from "@ngrx/store";
import {map, mergeMap} from "rxjs/operators";

import {DB_VIEW_ACTIONS} from "src/web/src/app/store/actions/db-view";
import {DbAccountPk, View} from "src/shared/model/database";
import {FEATURED} from "src/web/src/app/store/selectors/db-view";
import {State} from "src/web/src/app/store/reducers/db-view";

@Component({
    selector: "email-securely-app-db-view-mail-tab",
    templateUrl: "./db-view-mail-tab.component.html",
    styleUrls: ["./db-view-mail-tab.component.scss"],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DbViewMailTabComponent {
    @Input()
    dbAccountPk!: DbAccountPk;

    // TODO optimize DbViewMailTabComponent.state$ value emitting, it's called 4 times for single folder selection
    state$ = this.store.pipe(
        select((state) => FEATURED.accountRecord(this.dbAccountPk)(state)),
        mergeMap((account) => account ? [account] : []),
    ).pipe(
        map(({data, filters}) => {
            const state = {
                folders: data.folders,
                rootConversationNodes: [...data.folders.system, ...data.folders.custom]
                    .reduce((list: typeof folder.rootConversationNodes, folder) => {
                        return folder.pk === filters.selectedFolderPk ? [...list, ...folder.rootConversationNodes] : list;
                    }, []),
                selectedFolderPk: filters.selectedFolderPk,
            };

            state.rootConversationNodes.sort((o1, o2) => o2.summary.sentDateMax - o1.summary.sentDateMax);

            return state;
        }),
    );

    constructor(
        private store: Store<State>,
    ) {}

    trackFolderByPk(index: number, {pk}: View.Folder) {
        return pk;
    }

    selectFolder({pk: selectedFolderPk}: View.Folder) {
        this.store.dispatch(DB_VIEW_ACTIONS.PatchInstanceFilters({dbAccountPk: this.dbAccountPk, patch: {selectedFolderPk}}));
    }
}
