// TODO remove the "tslint:disable:await-promise" when spectron gets proper declaration files
// TODO track this issue https://github.com/DefinitelyTyped/DefinitelyTyped/issues/25186
// tslint:disable:await-promise

import {accountBadgeCssSelector, CI, initApp, test} from "./workflow";
import {AccountType} from "src/shared/model/account";
import {ONE_SECOND_MS} from "src/shared/constants";

// protonmail account to login during e2e tests running
const RUNTIME_ENV_E2E_PROTONMAIL_LOGIN = `EMAIL_SECURELY_APP_E2E_PROTONMAIL_LOGIN`;
const RUNTIME_ENV_E2E_PROTONMAIL_PASSWORD = `EMAIL_SECURELY_APP_E2E_PROTONMAIL_PASSWORD`;
const RUNTIME_ENV_E2E_PROTONMAIL_2FA_CODE = `EMAIL_SECURELY_APP_E2E_PROTONMAIL_2FA_CODE`;
const RUNTIME_ENV_E2E_PROTONMAIL_UNREAD_MIN = `EMAIL_SECURELY_APP_E2E_PROTONMAIL_UNREAD_MIN`;
// tutanota account to login during e2e tests running
const RUNTIME_ENV_E2E_TUTANOTA_LOGIN = `EMAIL_SECURELY_APP_E2E_TUTANOTA_LOGIN`;
const RUNTIME_ENV_E2E_TUTANOTA_PASSWORD = `EMAIL_SECURELY_APP_E2E_TUTANOTA_PASSWORD`;
const RUNTIME_ENV_E2E_TUTANOTA_2FA_CODE = `EMAIL_SECURELY_APP_E2E_TUTANOTA_2FA_CODE`;
const RUNTIME_ENV_E2E_TUTANOTA_UNREAD_MIN = `EMAIL_SECURELY_APP_E2E_TUTANOTA_UNREAD_MIN`;

for (const {type, login, password, twoFactorCode, unread} of ([
    {
        type: "protonmail",
        login: process.env[RUNTIME_ENV_E2E_PROTONMAIL_LOGIN],
        password: process.env[RUNTIME_ENV_E2E_PROTONMAIL_PASSWORD],
        twoFactorCode: process.env[RUNTIME_ENV_E2E_PROTONMAIL_2FA_CODE],
        unread: Number(process.env[RUNTIME_ENV_E2E_PROTONMAIL_UNREAD_MIN]),
    },
    {
        type: "tutanota",
        login: process.env[RUNTIME_ENV_E2E_TUTANOTA_LOGIN],
        password: process.env[RUNTIME_ENV_E2E_TUTANOTA_PASSWORD],
        twoFactorCode: process.env[RUNTIME_ENV_E2E_TUTANOTA_2FA_CODE],
        unread: Number(process.env[RUNTIME_ENV_E2E_TUTANOTA_UNREAD_MIN]),
    },
] as Array<{ type: AccountType, login: string, password: string, twoFactorCode: string, unread: number }>)) {
    if (!login || !password || !unread || isNaN(unread)) {
        continue;
    }

    test.serial(`unread check: ${type}`, async (t) => {
        const workflow = await initApp(t, {initial: true});
        const pauseMs = ONE_SECOND_MS * (type === "tutanota" ? (CI ? 80 : 40) : 20);
        const unreadBadgeSelector = accountBadgeCssSelector();
        const state: { parsedUnreadText?: string } = {};

        await workflow.login({setup: true, savePassword: false});
        await workflow.addAccount({type, login, password, twoFactorCode});
        await workflow.selectAccount();

        await t.context.app.client.pause(pauseMs);

        try {
            try {
                state.parsedUnreadText = await t.context.app.client.getText(unreadBadgeSelector);
            } catch (e) {
                t.fail(`failed to locate DOM element by "${unreadBadgeSelector}" selector after the "${pauseMs}" milliseconds pause`);
                throw e;
            }

            const parsedUnread = Number(state.parsedUnreadText.replace(/\D/g, ""));
            t.true(parsedUnread >= unread, `parsedUnread(${parsedUnread}) >= unread(${unread})`);
        } finally {
            await workflow.destroyApp();
        }
    });
}
