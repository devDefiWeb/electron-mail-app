import {LogLevel} from "electron-log";

import {AccountType} from "src/shared/model/account";
import {BuildEnvironment} from "./model/common";
import {EntryUrlItem} from "./types";

// tslint:disable-next-line:no-var-requires no-import-zones
const {name: APP_NAME, version: APP_VERSION} = require("package.json");

export {
    APP_NAME,
    APP_VERSION,
};

// user data dir, defaults to app.getPath("userData")
export const RUNTIME_ENV_USER_DATA_DIR = `EMAIL_SECURELY_APP_USER_DATA_DIR`;

// boolean
export const RUNTIME_ENV_E2E = `EMAIL_SECURELY_APP_E2E`;

export const ONE_SECOND_MS = 1000;

export const DEFAULT_API_CALL_TIMEOUT = ONE_SECOND_MS * 25;

export const PROVIDER_REPO: Record<AccountType, { repo: string, version: string; commit: string; }> = {
    protonmail: {
        repo: "https://github.com/ProtonMail/WebClient.git",
        commit: "31df90fcb0f15bb68423ab91d2d9df9310b9a202",
        version: "3.15.5",
    },
    tutanota: {
        repo: "https://github.com/tutao/tutanota.git",
        commit: "da030995693cc82afcf98d669243cadb0912d3c7",
        version: "3.42.4",
    },
};

export const LOCAL_WEBCLIENT_PROTOCOL_PREFIX = "webclient";
export const LOCAL_WEBCLIENT_PROTOCOL_RE_PATTERN = `${LOCAL_WEBCLIENT_PROTOCOL_PREFIX}[\\d]+`;

export const ACCOUNTS_CONFIG_ENTRY_URL_LOCAL_PREFIX = "local:::";
export const ACCOUNTS_CONFIG: Record<AccountType, Record<"entryUrl", EntryUrlItem[]>> = {
    protonmail: {
        entryUrl: [
            {
                value: "https://app.protonmail.ch",
                title: "https://app.protonmail.ch",
            },
            {
                value: "https://mail.protonmail.com",
                title: "https://mail.protonmail.com",
            },
            ...((process.env.NODE_ENV as BuildEnvironment) === "development" ? [
                {
                    value: `${ACCOUNTS_CONFIG_ENTRY_URL_LOCAL_PREFIX}https://mail.protonmail.com`,
                    title: `https://mail.protonmail.com (${getBuiltInWebClientTitle("protonmail")})`,
                },
            ] : []),
            {
                value: "https://beta.protonmail.com",
                title: "https://beta.protonmail.com",
            },
            {
                value: "https://protonirockerxow.onion",
                title: "https://protonirockerxow.onion",
            },
            ...((process.env.NODE_ENV as BuildEnvironment) === "development" ? [
                {
                    value: `${ACCOUNTS_CONFIG_ENTRY_URL_LOCAL_PREFIX}https://protonirockerxow.onion`,
                    title: `https://protonirockerxow.onion (${getBuiltInWebClientTitle("protonmail")})`,
                },
            ] : []),
        ],
    },
    tutanota: {
        entryUrl: [
            {
                value: "https://mail.tutanota.com",
                title: "https://mail.tutanota.com",
            },
            ...((process.env.NODE_ENV as BuildEnvironment) === "development" ? [
                {
                    value: `${ACCOUNTS_CONFIG_ENTRY_URL_LOCAL_PREFIX}https://mail.tutanota.com`,
                    title: `https://mail.tutanota.com (${getBuiltInWebClientTitle("tutanota")})`,
                },
            ] : []),
        ],
    },
};

function getBuiltInWebClientTitle(accountType: AccountType): string {
    return `Built-in Web Client v${PROVIDER_REPO[accountType].version}-${PROVIDER_REPO[accountType].commit.substr(0, 7)}`;
}

export const LOG_LEVELS: LogLevel[] = Object.keys(((stub: Record<LogLevel, null>) => stub)({
    error: null,
    warn: null,
    info: null,
    verbose: null,
    debug: null,
    silly: null,
})) as LogLevel[];
