import {Actions} from "@ngrx/effects";
import {EMPTY, Observable, merge, of, race, timer} from "rxjs";
import {Injectable} from "@angular/core";
import {Store, select} from "@ngrx/store";
import {delay, distinctUntilChanged, filter, map, mergeMap, pairwise, switchMap, take, takeUntil, tap} from "rxjs/operators";
import {equals, pick} from "remeda";

import {ACCOUNTS_ACTIONS, unionizeActionFilter} from "src/web/browser-window/app/store/actions";
import {AccountsSelectors} from "src/web/browser-window/app/store/selectors";
import {LoginFieldContainer} from "src/shared/model/container";
import {ONE_SECOND_MS} from "src/shared/constants";
import {State} from "src/web/browser-window/app/store/reducers/accounts";
import {WebAccount} from "src/web/browser-window/app/model";
import {getRandomInt} from "src/shared/util";
import {getZoneNameBoundWebLogger} from "src/web/browser-window/util";

@Injectable()
export class AccountsService {
    constructor(
        private readonly store: Store<State>,
        private readonly actions$: Actions<{
            type: string;
            payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        }>,
    ) {}

    buildLoginDelaysResetAction(
        {login}: LoginFieldContainer,
    ): ReturnType<typeof ACCOUNTS_ACTIONS.Patch> {
        return ACCOUNTS_ACTIONS.Patch({
            login,
            patch: {loginDelayedSeconds: undefined, loginDelayedUntilSelected: undefined},
        });
    }

    setupLoginDelayTrigger(
        {login}: NoExtraProperties<Pick<WebAccount["accountConfig"], "login">>,
        logger: ReturnType<typeof getZoneNameBoundWebLogger>,
    ): Observable<{ trigger: string }> {
        const account$ = this.store.pipe(
            select(AccountsSelectors.ACCOUNTS.pickAccount({login})),
        );
        const props = ["loginDelayUntilSelected", "loginDelaySecondsRange"] as const;

        return account$.pipe(
            mergeMap((account) => account ? [account] as const : [] as const),
            distinctUntilChanged(({accountConfig: prev}, {accountConfig: curr}) => {
                // check if related props changed
                return equals(pick(prev, props), pick(curr, props));
            }),
            // WARN: "switchMap" used to drop previously setup notification (we don't need them to run in parallel)
            // so we re-setup the "delay" logic if related props changed (see above "distinctUntilChanged" check)
            switchMap(({accountConfig}) => {
                const {loginDelaySecondsRange, loginDelayUntilSelected} = pick(accountConfig, [...props]);
                const delayTriggers: Array<Observable<{ trigger: string }>> = [];

                logger.info(`login delay configs: ${JSON.stringify({loginDelayUntilSelected, loginDelaySecondsRange})}`);

                this.store.dispatch(this.buildLoginDelaysResetAction({login}));

                if (loginDelaySecondsRange) {
                    const {start, end} = loginDelaySecondsRange;
                    const delayTimeMs = getRandomInt(start, end) * ONE_SECOND_MS;

                    logger.info(`resolved login delay (ms): ${delayTimeMs}`);

                    delayTriggers.push(
                        merge(
                            timer(delayTimeMs).pipe(
                                map(() => ({trigger: `triggered on login delay expiration (ms): ${delayTimeMs}`})),
                            ),
                            timer(0, ONE_SECOND_MS).pipe(
                                mergeMap((value) => {
                                    const loginDelayedSeconds = (delayTimeMs / ONE_SECOND_MS) - value;
                                    this.store.dispatch(
                                        ACCOUNTS_ACTIONS.Patch({login, patch: {loginDelayedSeconds}}),
                                    );
                                    return EMPTY;
                                }),
                            ),
                        ),
                    );
                }

                if (loginDelayUntilSelected) {
                    const deselectAccount$ = (
                        () => {
                            this.store.dispatch(ACCOUNTS_ACTIONS.DeSelect({login}));
                            return timer(ONE_SECOND_MS);
                        }
                    )();

                    delayTriggers.push(
                        deselectAccount$.pipe(
                            mergeMap(() => merge(
                                (() => {
                                    this.store.dispatch(
                                        ACCOUNTS_ACTIONS.Patch({login, patch: {loginDelayedUntilSelected: true}}),
                                    );
                                    return EMPTY;
                                })(),
                                this.store.pipe(
                                    select(AccountsSelectors.FEATURED.selectedLogin),
                                    filter((selectedLogin) => selectedLogin === login),
                                    // delay handles the case if the app has no selected account and "on select" trigger gets disabled
                                    // if there is no selected account the app will select the account automatically
                                    // and previously setup "on select" trigger kicks in before it gets reset by new TryToLogin action
                                    delay(ONE_SECOND_MS * 1.5),
                                    map(() => ({trigger: "triggered on account selection"})),
                                ),
                            )),
                        ),
                    );
                }

                const delayTriggersDispose$ = race([
                    this.actions$.pipe(
                        unionizeActionFilter(ACCOUNTS_ACTIONS.is.TryToLogin),
                        filter(({payload}) => payload.account.accountConfig.login === login),
                        map(({type: actionType}) => `another "${actionType}" action triggered`),
                    ),
                    account$.pipe(
                        mergeMap((account) => account ? [account] : []),
                        map(({notifications: {pageType}}) => pageType.type),
                        distinctUntilChanged(),
                        pairwise(),
                        filter(([/* prev */, curr]) => curr !== "unknown"),
                        map((value) => `page type changed to ${JSON.stringify(value)}`),
                    ),
                    account$.pipe(
                        map((account) => {
                            if (!account) {
                                return `Account has been removed`;
                            }
                            if (account.progress.password) {
                                return `"login" action performing is already in progress`;
                            }
                            return void 0;
                        }),
                        filter((reason) => typeof reason === "string"),
                    ),
                ]).pipe(
                    take(1),
                    tap((reason) => {
                        logger.info(`disposing delayed "login" action with the following reason: ${String(reason)}`);
                    }),
                );
                const trigger$ = delayTriggers.length
                    ? race(delayTriggers).pipe(
                        take(1), // WARN: just one notification
                        takeUntil(delayTriggersDispose$),
                    )
                    : of({trigger: "triggered immediate login (as no delays defined)"});

                return trigger$.pipe(
                    mergeMap(({trigger}) => this.store.pipe(
                        select(AccountsSelectors.FEATURED.selectedLogin),
                        take(1),
                        map((selectedLogin) => {
                            if (!selectedLogin) {
                                // let's select the account if none has been selected
                                this.store.dispatch(ACCOUNTS_ACTIONS.Select({login}));
                            }
                            return {trigger};
                        }),
                    )),
                    tap(({trigger}) => {
                        this.store.dispatch(this.buildLoginDelaysResetAction({login}));
                        logger.info(`login trigger: ${trigger})`);
                    }),
                );
            }),
        );
    }
}
