import {Actions, Effect} from "@ngrx/effects";
import {catchError, filter, map, switchMap, tap} from "rxjs/operators";
import {concat, of} from "rxjs";
import {Injectable, NgZone} from "@angular/core";
import {Location} from "@angular/common";
import {Router} from "@angular/router";

import {ACCOUNTS_OUTLET, SETTINGS_OUTLET, SETTINGS_PATH} from "_@web/src/app/app.constants";
import {NAVIGATION_ACTIONS} from "_@web/src/app/store/actions";
import {ElectronService} from "./electron.service";
import {EffectsService} from "./effects.service";

@Injectable()
export class NavigationEffects {
    @Effect({dispatch: false})
    navigate$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.Go),
        map((action) => action.payload),
        tap(({path, queryParams, extras}) => {
            // TODO remove "zone.run" execution on https://github.com/angular/angular/issues/18254 resolving
            // or use @angular/router v4.1.3 and older
            this.zone.run(async () => {
                // tslint:disable-next-line:no-floating-promises
                await this.router.navigate(path, {queryParams, ...extras});
            });
        }),
        catchError(this.effectsService.buildFailActionObservable.bind(this.effectsService)),
    );

    @Effect({dispatch: false})
    navigateBack$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.Back),
        tap(() => this.location.back()),
        catchError(this.effectsService.buildFailActionObservable.bind(this.effectsService)),
    );

    @Effect({dispatch: false})
    navigateForward$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.Forward),
        tap(() => this.location.forward()),
        catchError(this.effectsService.buildFailActionObservable.bind(this.effectsService)),
    );

    @Effect()
    toggleBrowserWindow$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.ToggleBrowserWindow),
        switchMap(({payload}) => this.electronService
            .callIpcMain("toggleBrowserWindow")(payload)
            .pipe(
                catchError((error) => this.effectsService.buildFailActionObservable(error)),
            )));

    @Effect()
    openAboutWindow$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.OpenAboutWindow),
        switchMap(() => this.electronService
            .callIpcMain("openAboutWindow")()
            .pipe(
                catchError((error) => this.effectsService.buildFailActionObservable(error)),
            )));

    @Effect()
    openExternal$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.OpenExternal),
        switchMap(({payload}) => this.electronService
            .callIpcMain("openExternal")({url: payload.url})
            .pipe(
                catchError((error) => this.effectsService.buildFailActionObservable(error)),
            )));

    @Effect()
    openSettingsFolder$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.OpenSettingsFolder),
        switchMap(() => this.electronService
            .callIpcMain("openSettingsFolder")()
            .pipe(
                catchError((error) => this.effectsService.buildFailActionObservable(error)),
            )));

    @Effect()
    logout$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.Logout),
        switchMap(() => {
            const concatenated = concat(
                this.electronService.callIpcMain("logout")(),
                of(NAVIGATION_ACTIONS.Go({
                    path: [{
                        outlets: {
                            [ACCOUNTS_OUTLET]: null,
                            [SETTINGS_OUTLET]: SETTINGS_PATH,
                        },
                    }],
                })),
            );

            return concatenated.pipe(
                catchError((error) => this.effectsService.buildFailActionObservable(error)),
            );
        }),
    );

    @Effect()
    quit$ = this.actions$.pipe(
        filter(NAVIGATION_ACTIONS.is.Quit),
        switchMap(() => this.electronService
            .callIpcMain("quit")()
            .pipe(
                catchError((error) => this.effectsService.buildFailActionObservable(error)),
            )));

    constructor(private effectsService: EffectsService,
                private electronService: ElectronService,
                private actions$: Actions,
                private router: Router,
                private location: Location,
                private zone: NgZone) {}
}
