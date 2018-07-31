import {createFeatureSelector, createSelector} from "@ngrx/store";

import {accountPickingPredicate} from "src/shared/util";
import {featureName, State} from "src/web/src/app/store/reducers/accounts";
import {LoginFieldContainer} from "src/shared/model/container";

export const STATE = createFeatureSelector<State>(featureName);

const accountsSelector = createSelector(STATE, ({accounts}) => accounts);

export const FEATURED = {
    initialized: createSelector(STATE, ({initialized}) => initialized),
    accounts: accountsSelector,
    selectedLogin: createSelector(STATE, ({selectedLogin}) => selectedLogin),
    selectedAccount: createSelector(
        STATE,
        ({selectedLogin, accounts}) => accounts.find(({accountConfig}) => accountConfig.login === selectedLogin),
    ),
};

export const ACCOUNTS = {
    pickAccount: (criteria: LoginFieldContainer) => createSelector(
        accountsSelector,
        (accounts) => {
            const index = accounts.map((a) => a.accountConfig).findIndex(accountPickingPredicate(criteria));
            return index === -1 ? null : accounts[index];
        },
    ),
    loggedInAndUnreadSummary: createSelector(accountsSelector, (accounts) => {
        return accounts.reduce(
            (accumulator, {notifications}) => {
                accumulator.unread += notifications.unread;
                if (!notifications.loggedIn) {
                    accumulator.hasLoggedOut = true;
                }
                return accumulator;
            },
            {
                hasLoggedOut: false,
                unread: 0,
            },
        );
    }),
};
