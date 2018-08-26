import compareVersions from "compare-versions";

import {APP_VERSION} from "src/shared/constants";
import {Config, Settings} from "src/shared/model/options";
import {INITIAL_STORES} from "./constants";

const CONFIG_UPGRADES: Record<string, (config: Config) => void> = {
    "1.1.0": (config) => {
        if ("appVersion" in config) {
            delete (config as any).appVersion;
        }
    },
    "1.2.0": (config) => {
        if (typeof config.logLevel === "undefined") {
            config.logLevel = INITIAL_STORES.config().logLevel;
        }
    },
};

const SETTINGS_UPGRADES: Record<string, (settings: Settings) => void> = {
    "1.1.1": (settings) => {
        settings.accounts.forEach((account) => {
            if (typeof account.credentials === "undefined") {
                account.credentials = {};
            }
            if (typeof account.credentialsKeePass === "undefined") {
                account.credentialsKeePass = {};
            }
        });
    },
    "1.4.2": (settings) => {
        if (!settings.dbEncryptionKey) {
            settings.dbEncryptionKey = INITIAL_STORES.settings().dbEncryptionKey;
        }
    },
};

export function upgradeConfig(config: Config): boolean {
    return upgrade(config, CONFIG_UPGRADES);
}

export function upgradeSettings(settings: Settings): boolean {
    return upgrade(settings, SETTINGS_UPGRADES);
}

function upgrade<T extends Config | Settings>(entity: T, upgrades: Record<string, (entity: T) => void>): boolean {
    const input = JSON.stringify(entity);

    Object
        .keys(upgrades)
        .filter((upgraderVersion) => compareVersions(upgraderVersion, APP_VERSION) <= 0)
        .sort(compareVersions)
        .forEach((version) => upgrades[version](entity));

    return JSON.stringify(entity) !== input;
}
