import _logger from "electron-log";
import fs from "fs";
import path from "path";
import url from "url";
import {EncryptionAdapter} from "fs-json-store-encryption-adapter";
import {Model as StoreModel} from "fs-json-store";

import {Context} from "./model";
import {PLATFORM} from "src/electron-main/constants";
import {curryFunctionMembers} from "src/shared/util";

const logger = curryFunctionMembers(_logger, "[src/electron-main/util]");

export function linuxLikePlatform(): boolean {
    return PLATFORM !== "win32" && PLATFORM !== "darwin";
}

export async function injectVendorsAppCssIntoHtmlFile(
    pageLocation: string,
    {vendorsAppCssLinkHref}: Context["locations"],
): Promise<{ html: string; baseURLForDataURL: string }> {
    const pageContent = fs.readFileSync(pageLocation).toString();
    const baseURLForDataURL = formatFileUrl(`${path.dirname(pageLocation)}${path.sep}`);
    const htmlInjection = `<link rel="stylesheet" href="${vendorsAppCssLinkHref}"/>`;
    const html = pageContent.replace(/(.*)(<head>)(.*)/i, `$1$2${htmlInjection}$3`);

    if (!html.includes(htmlInjection)) {
        logger.error(JSON.stringify({html}));
        throw new Error(`Failed to inject "${htmlInjection}" into the "${pageLocation}" page`);
    }

    return {html, baseURLForDataURL};
}

export async function buildSettingsAdapter(
    {configStore}: Context,
    password: string,
): Promise<StoreModel.StoreAdapter> {
    return new EncryptionAdapter(
        {password, preset: (await configStore.readExisting()).encryptionPreset},
        {keyDerivationCache: true, keyDerivationCacheLimit: 3},
    );
}

export function hrtimeDuration(): { end: () => number } {
    const start = process.hrtime();

    return {
        end() {
            const time = process.hrtime(start);

            return Math.round((time[0] * 1000) + (time[1] / 1000000));
        },
    };
}

export function formatFileUrl(pathname: string): string {
    return url.format({pathname, protocol: "file:", slashes: true});
}
