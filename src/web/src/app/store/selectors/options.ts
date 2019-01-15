import {createFeatureSelector, createSelector} from "@ngrx/store";

import {LoginFieldContainer} from "src/shared/model/container";
import {State, featureName} from "src/web/src/app/store/reducers/options";
import {accountPickingPredicate, pickBaseConfigProperties} from "src/shared/util";

export const STATE = createFeatureSelector<State>(featureName);

export const FEATURED = {
    config: createSelector(STATE, ({config}) => config),
    settings: createSelector(STATE, ({settings}) => settings),
    progress: createSelector(STATE, ({progress}) => progress),
    electronLocations: createSelector(STATE, ({electronLocations}) => electronLocations),
    hasSavedPassword: createSelector(STATE, ({hasSavedPassword}) => hasSavedPassword),
    mainProcessNotification: createSelector(STATE, ({mainProcessNotification}) => mainProcessNotification),
};

export const CONFIG = {
    base: createSelector(FEATURED.config, pickBaseConfigProperties),
    compactLayout: createSelector(FEATURED.config, (c) => c.compactLayout),
    unreadNotifications: createSelector(FEATURED.config, (c) => c.unreadNotifications),
    timeouts: createSelector(FEATURED.config, (c) => c.timeouts),
};

export const SETTINGS = (() => {
    const accountsSelector = createSelector(FEATURED.settings, ({accounts}) => accounts);

    return {
        accounts: accountsSelector,
        pickAccount: (criteria: LoginFieldContainer) => createSelector(
            accountsSelector,
            (accounts) => accounts.find(accountPickingPredicate(criteria)),
        ),
        localStoreEnabledCount: createSelector(accountsSelector, (accounts) => {
            return accounts.reduce(
                (accumulator, {database}) => accumulator + Number(Boolean(database)),
                0,
            );
        }),
    };
})();
