import {createFeatureSelector, createSelector} from "@ngrx/store";

import * as fromRoot from "./root";
import {Config, Settings} from "_@shared/model/options";
import {ElectronContextLocations} from "_@shared/model/electron";
import {OPTIONS_ACTIONS} from "_@web/src/app/store/actions";
import {pickBaseConfigProperties} from "_@shared/util";
import {UnionOf} from "unionize";
import {updateIn} from "hydux-mutator";

export const featureName = "options";

interface Progress {
    addingAccount?: boolean;
    changingPassword?: boolean;
    keePassReferencing?: boolean;
    reEncryptingSettings?: boolean;
    removingAccount?: boolean;
    signingIn?: boolean;
    togglingCompactLayout?: boolean;
    updatingAccount?: boolean;
    updatingBaseSettings?: boolean;
}

export interface ProgressPatch extends Partial<Progress> {}

export interface State extends fromRoot.State {
    config: Config;
    settings: Settings;
    progress: Progress;
    electronLocations?: ElectronContextLocations;
    hasSavedPassword?: boolean;
}

const initialState: State = {
    config: {} as Config,
    settings: {} as Settings,
    progress: {},
};

export function reducer(state = initialState, action: UnionOf<typeof OPTIONS_ACTIONS>): State {
    return OPTIONS_ACTIONS.match(action, {
        InitResponse: (payload) => ({...state, ...payload}),
        GetConfigResponse: (config) => ({...state, config}),
        GetSettingsResponse: (settings) => ({...state, settings}),
        PatchProgress: (patch) => updateIn(
            state,
            (_) => _.progress,
            (progress) => ({...progress, ...patch}),
        ),
        default: () => state,
    });
}

export const stateSelector = createFeatureSelector<State>(featureName);

// progress
export const progressSelector = createSelector(stateSelector, ({progress}) => progress);

// electronLocations
export const electronLocationsSelector = createSelector(stateSelector, ({electronLocations}) => electronLocations);

// hasSavedPassword
export const hasSavedPasswordSelector = createSelector(stateSelector, ({hasSavedPassword}) => hasSavedPassword);

// config
export const configSelector = createSelector(stateSelector, ({config}) => config);
export const baseConfigSelector = createSelector(configSelector, (config) => pickBaseConfigProperties(config));
export const configCompactLayoutSelector = createSelector(configSelector, ({compactLayout}) => compactLayout);
export const configUnreadNotificationsSelector = createSelector(configSelector, ({unreadNotifications}) => unreadNotifications);

// settings
export const settingsSelector = createSelector(stateSelector, ({settings}) => settings);
export const settingsAccountsSelector = createSelector(settingsSelector, ({accounts}) => accounts);
export const settingsAccountByLoginSelector = (login: string) => createSelector(
    settingsAccountsSelector,
    (accounts) => accounts
        .filter(({login: accountLogin}) => accountLogin === login)
        .shift(),
);
export const settingsKeePassClientConfSelector = createSelector(
    settingsSelector,
    ({keePassClientConf}) => keePassClientConf,
);
export const settingsKeePassRefSelector = createSelector(settingsSelector, ({keePassRef}) => keePassRef);
