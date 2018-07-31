import {from} from "rxjs";

import {AccountConfig} from "src/shared/model/account";
import {Context} from "src/electron-main/model";
import {Endpoints} from "src/shared/api/main";
import {pickAccountStrict} from "src/shared/util";

export async function buildEndpoints(
    ctx: Context,
): Promise<Pick<Endpoints, "addAccount" | "updateAccount" | "changeAccountOrder" | "removeAccount">> {
    return {
        addAccount: ({type, login, entryUrl, storeMails, credentials, credentialsKeePass}) => from((async () => {
            const account = {
                type,
                login,
                entryUrl,
                storeMails,
                credentials,
                credentialsKeePass,
            } as AccountConfig; // TODO ger rid of "TS as" casting
            const settings = await ctx.settingsStore.readExisting();

            settings.accounts.push(account);

            return await ctx.settingsStore.write(settings);
        })()),

        // TODO update "updateAccount" api method test (entryUrl, changed credentials structure)
        updateAccount: ({login, entryUrl, storeMails, credentials, credentialsKeePass}) => from((async () => {
            const settings = await ctx.settingsStore.readExisting();
            const account = pickAccountStrict(settings.accounts, {login});
            const {credentials: existingCredentials, credentialsKeePass: existingCredentialsKeePass} = account;

            if (typeof storeMails !== "undefined") {
                account.storeMails = storeMails;
            }

            if (typeof entryUrl !== "undefined") {
                account.entryUrl = entryUrl;
            }

            if (credentials) {
                if ("password" in credentials) {
                    existingCredentials.password = credentials.password;
                }
                if ("twoFactorCode" in credentials) {
                    existingCredentials.twoFactorCode = credentials.twoFactorCode;
                }
                if (account.type === "protonmail" && "mailPassword" in credentials) {
                    account.credentials.mailPassword = credentials.mailPassword;
                }
            }

            if (credentialsKeePass) {
                if ("password" in credentialsKeePass) {
                    existingCredentialsKeePass.password = credentialsKeePass.password;
                }
                if ("twoFactorCode" in credentialsKeePass) {
                    existingCredentialsKeePass.twoFactorCode = credentialsKeePass.twoFactorCode;
                }
                if (account.type === "protonmail" && "mailPassword" in credentialsKeePass) {
                    account.credentialsKeePass.mailPassword = credentialsKeePass.mailPassword;
                }
            }

            return await ctx.settingsStore.write(settings);
        })()),

        changeAccountOrder: ({login, index: moveToIndex}) => from((async () => {
            const settings = await ctx.settingsStore.readExisting();

            if (isNaN(moveToIndex) || moveToIndex < 0 || moveToIndex >= settings.accounts.length) {
                throw new Error(`Invalid "index" value`);
            }

            const accountToMove = pickAccountStrict(settings.accounts, {login});
            const removeIndex = settings.accounts.indexOf(accountToMove);

            if (removeIndex === moveToIndex) {
                return settings;
            }

            settings.accounts.splice(removeIndex, 1);
            settings.accounts.splice(moveToIndex, 0, accountToMove);

            return await ctx.settingsStore.write(settings);
        })()),

        removeAccount: ({login}) => from((async () => {
            const settings = await ctx.settingsStore.readExisting();
            const account = pickAccountStrict(settings.accounts, {login});
            const index = settings.accounts.indexOf(account);

            settings.accounts.splice(index, 1);

            return await ctx.settingsStore.write(settings);
        })()),
    };
}
