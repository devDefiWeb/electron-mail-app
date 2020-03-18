import fs from "fs";
import fsExtra from "fs-extra";
import mkdirp from "mkdirp";
import os from "os";
import path from "path";
import {promisify} from "util";

import {CWD, LOG, LOG_LEVELS, execShell, fetchUrl} from "scripts/lib";

const SERVICE_NAME = "ffsend";
const SERVICE_VERSION = "v0.2.58";
const SERVICE_BINARY_DOWNLOAD_URL_PREFIX = `https://github.com/timvisee/${SERVICE_NAME}/releases/download/${SERVICE_VERSION}`;
const SERVICE_DOWNLOAD_URL_PREFIX = "https://send.firefox.com/download/";
const SERVICE_DOWNLOAD_COUNT = "1"; // only 1 is supported in anonymous mode

const [, , ACTION_TYPE_ARG, FILE_ARG] = process.argv as [null, null, "upload" | string, string];

async function resolveCommand(): Promise<{ command: string }> {
    const binaryFileName = (() => {
        const fileNames: Record<Extract<ReturnType<typeof os.platform>, "darwin" | "linux" | "win32">, string> = Object.freeze({
            darwin: `${SERVICE_NAME}-${SERVICE_VERSION}-macos`,
            linux: `${SERVICE_NAME}-${SERVICE_VERSION}-linux-x64-static`,
            win32: `${SERVICE_NAME}-${SERVICE_VERSION}-windows-x64-static.exe`,
        });
        const platform = os.platform();

        if (platform in fileNames) {
            return fileNames[platform as keyof typeof fileNames];
        }

        throw new Error(`Failed to resolve SERVICE binary name for ${platform} platform`);
    })();
    const binaryFile = path.resolve(CWD, "./output", binaryFileName);
    const returnExecutableCommand: () => Promise<{ command: string }> = async () => {
        if (os.platform() !== "win32") {
            await execShell(["chmod", ["+x", binaryFile]]);
        }
        return {command: binaryFile};
    };

    if (await fsExtra.pathExists(binaryFile)) {
        LOG(
            LOG_LEVELS.title(`Binary ${LOG_LEVELS.value(binaryFile)} exists`),
        );
        return returnExecutableCommand();
    }

    await (async () => {
        const url = `${SERVICE_BINARY_DOWNLOAD_URL_PREFIX}/${binaryFileName}`;
        const response = await fetchUrl([url]);

        mkdirp.sync(path.dirname(binaryFile));
        await promisify(fs.writeFile)(binaryFile, await response.buffer());

        if (!(await fsExtra.pathExists(binaryFile))) {
            throw new Error(`Failed to save ${url} to ${binaryFile} file`);
        }
    })();

    return returnExecutableCommand();
}

async function uploadFileArg(): Promise<{ downloadUrl: string }> {
    const {command} = await resolveCommand();
    const {stdout: downloadUrl} = await execShell([
        command,
        [
            "upload",
            "--no-interact",
            "--incognito",
            "--downloads", SERVICE_DOWNLOAD_COUNT,
            FILE_ARG,
        ],
    ]);

    if (!downloadUrl.startsWith(SERVICE_DOWNLOAD_URL_PREFIX)) {
        throw new Error(`Download url "${downloadUrl}" doesn't start from "${SERVICE_DOWNLOAD_URL_PREFIX}"`);
    }

    return {downloadUrl};
}

(async () => {
    if (ACTION_TYPE_ARG !== "upload") {
        throw new Error(`Unsupported action type: ${LOG_LEVELS.value(ACTION_TYPE_ARG)}`);
    }
    await uploadFileArg();
})().catch((error) => {
    LOG(error);
    process.exit(1);
});
