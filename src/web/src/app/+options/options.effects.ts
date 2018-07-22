import {catchError, concat, filter, finalize, map, mergeMap, switchMap, tap, withLatestFrom} from "rxjs/operators";
import {EMPTY, merge, of} from "rxjs";
import {Injectable} from "@angular/core";
import {Actions, Effect} from "@ngrx/effects";
import {Store} from "@ngrx/store";

import {ACCOUNTS_OUTLET, ACCOUNTS_PATH, SETTINGS_OUTLET, SETTINGS_PATH} from "src/web/src/app/app.constants";
import {CORE_ACTIONS, NAVIGATION_ACTIONS, OPTIONS_ACTIONS} from "src/web/src/app/store/actions";
import {ElectronService} from "src/web/src/app/+core/electron.service";
import {OptionsService} from "./options.service";
import {ProgressPatch, settingsSelector, State} from "src/web/src/app/store/reducers/options";

@Injectable()
export class OptionsEffects {
    // TODO release: remove "databaseObserveTest" method
    @Effect()
    initRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.InitRequest),
        switchMap(() => this.electronService
            .ipcMainClient()("init")()
            .pipe(
                mergeMap((payload) => [
                    OPTIONS_ACTIONS.InitResponse(payload),
                    this.optionsService.buildNavigationAction({path: ""}),
                ]),
                concat(
                    this.electronService.ipcMainClient()("databaseObserveTest")().pipe(
                        tap((rows) => {
                            // TODO release: disable console.log stuff
                            // tslint:disable-next-line:no-console
                            console.log({rows});
                        }),
                        mergeMap(() => []),
                    ),
                ),
                catchError((error) => of(CORE_ACTIONS.Fail(error))),
            ),
        ));

    @Effect()
    getConfigRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.GetConfigRequest),
        switchMap(() => this.electronService
            .ipcMainClient()("readConfig")()
            .pipe(
                mergeMap((config) => [
                    OPTIONS_ACTIONS.GetConfigResponse(config),
                    this.optionsService.buildNavigationAction({path: ""}),
                ]),
                catchError((error) => of(CORE_ACTIONS.Fail(error))),
            ),
        ));

    @Effect()
    getSettingsRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.GetSettingsRequest),
        withLatestFrom(this.store.select(settingsSelector)),
        switchMap(([action, settings]) => {
            if ("_rev" in settings) {
                return of(this.optionsService.buildNavigationAction({
                    path: settings.accounts.length ? "" : "account-edit",
                }));
            }

            return this.electronService
                .ipcMainClient()("settingsExists")()
                .pipe(
                    map((readable) => this.optionsService.buildNavigationAction({
                        path: readable ? "login" : "settings-setup",
                    })),
                    catchError((error) => of(CORE_ACTIONS.Fail(error))),
                );
        }),
    );

    @Effect()
    signInRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.SignInRequest),
        switchMap(({payload}) => merge(
            of(this.buildPatchProgress({signingIn: true})),
            this.electronService
                .ipcMainClient()("readSettings")(payload)
                .pipe(
                    mergeMap((settings) => [
                        OPTIONS_ACTIONS.GetSettingsResponse(settings),
                        NAVIGATION_ACTIONS.Go({
                            path: [{
                                outlets: {
                                    [SETTINGS_OUTLET]: settings.accounts.length ? null : `${SETTINGS_PATH}/account-edit`,
                                    [ACCOUNTS_OUTLET]: ACCOUNTS_PATH,
                                },
                            }],
                        }),
                    ]),
                    catchError((error) => {
                        error.message = "Failed to log in";
                        return of(CORE_ACTIONS.Fail(error));
                    }),
                    finalize(() => this.dispatchProgress({signingIn: false})),
                ),
        )));

    @Effect()
    addAccountRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.AddAccountRequest),
        switchMap(({payload}) => merge(
            of(this.buildPatchProgress({addingAccount: true})),
            this.electronService
                .ipcMainClient()("addAccount")(payload)
                .pipe(
                    mergeMap((settings) => [
                        OPTIONS_ACTIONS.GetSettingsResponse(settings),
                        this.optionsService.buildNavigationAction({
                            path: "account-edit",
                            queryParams: {login: payload.login},
                        }),
                    ]),
                    catchError((error) => of(CORE_ACTIONS.Fail(error))),
                    finalize(() => this.dispatchProgress({addingAccount: false})),
                ),
        )));

    @Effect()
    updateAccountRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.UpdateAccountRequest),
        switchMap(({payload}) => merge(
            of(this.buildPatchProgress({updatingAccount: true})),
            this.electronService
                .ipcMainClient()("updateAccount")(payload)
                .pipe(
                    map((settings) => OPTIONS_ACTIONS.GetSettingsResponse(settings)),
                    catchError((error) => of(CORE_ACTIONS.Fail(error))),
                    finalize(() => this.dispatchProgress({updatingAccount: false})),
                ),
        )));

    @Effect()
    removeAccountRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.RemoveAccountRequest),
        switchMap(({payload}) => merge(
            of(this.buildPatchProgress({removingAccount: true})),
            this.electronService
                .ipcMainClient()("removeAccount")({login: payload.login})
                .pipe(
                    map((settings) => OPTIONS_ACTIONS.GetSettingsResponse(settings)),
                    catchError((error) => of(CORE_ACTIONS.Fail(error))),
                    finalize(() => this.dispatchProgress({removingAccount: false})),
                ),
        )));

    @Effect()
    changeMasterPasswordRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.ChangeMasterPasswordRequest),
        switchMap(({payload}) => merge(
            of(this.buildPatchProgress({changingPassword: true})),
            this.electronService
                .ipcMainClient()("changeMasterPassword")(payload)
                .pipe(
                    mergeMap(() => EMPTY),
                    catchError((error) => {
                        error.message = "Failed to change the master password! " +
                            "Please make sure that correct current password has been entered.";
                        return of(CORE_ACTIONS.Fail(error));
                    }),
                    finalize(() => this.dispatchProgress({changingPassword: false})),
                ),
        )));

    @Effect()
    associateSettingsWithKeePassRequest$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.AssociateSettingsWithKeePassRequest),
        switchMap(({payload}) => merge(
            of(this.buildPatchProgress({keePassReferencing: true})),
            this.electronService
                .ipcMainClient()("associateSettingsWithKeePass")(payload)
                .pipe(
                    map((settings) => OPTIONS_ACTIONS.GetSettingsResponse(settings)),
                    catchError((error) => of(CORE_ACTIONS.Fail(error))),
                    finalize(() => this.dispatchProgress({keePassReferencing: false})),
                ),
        )));

    @Effect()
    toggleCompactLayout$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.ToggleCompactRequest),
        switchMap(() => merge(
            of(this.buildPatchProgress({togglingCompactLayout: true})),
            this.electronService
                .ipcMainClient()("toggleCompactLayout")()
                .pipe(
                    map((config) => OPTIONS_ACTIONS.GetConfigResponse(config)),
                    catchError((error) => of(CORE_ACTIONS.Fail(error))),
                    finalize(() => this.dispatchProgress({togglingCompactLayout: false})),
                ),
        )));

    @Effect()
    updateBaseSettings$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.PatchBaseSettingsRequest),
        switchMap(({payload}) => merge(
            of(this.buildPatchProgress({updatingBaseSettings: true})),
            this.electronService
                .ipcMainClient()("patchBaseSettings")(payload)
                .pipe(
                    map((config) => OPTIONS_ACTIONS.GetConfigResponse(config)),
                    catchError((error) => of(CORE_ACTIONS.Fail(error))),
                    finalize(() => this.dispatchProgress({updatingBaseSettings: false})),
                ),
        )));

    @Effect()
    reEncryptingSettings$ = this.actions$.pipe(
        filter(OPTIONS_ACTIONS.is.ReEncryptSettings),
        switchMap(({payload}) => {
            const {encryptionPreset, password} = payload;

            return merge(
                of(this.buildPatchProgress({reEncryptingSettings: true})),
                this.electronService
                    .ipcMainClient()("reEncryptSettings")({encryptionPreset, password})
                    .pipe(
                        map((settings) => OPTIONS_ACTIONS.GetSettingsResponse(settings)),
                        catchError((error) => of(CORE_ACTIONS.Fail(error))),
                        finalize(() => this.dispatchProgress({reEncryptingSettings: false})),
                    ),
            );
        }));

    constructor(private optionsService: OptionsService,
                private electronService: ElectronService,
                private store: Store<State>,
                private actions$: Actions) {}

    private buildPatchProgress(patch: ProgressPatch) {
        return OPTIONS_ACTIONS.PatchProgress(patch);
    }

    private dispatchProgress(patch: ProgressPatch) {
        this.store.dispatch(this.buildPatchProgress(patch));
    }
}
