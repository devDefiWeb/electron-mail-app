import chalk from "chalk";
import fs from "fs";
import path from "path";
import {promisify} from "util";

import {FolderAsDomainEntry, chalkConsoleValue, consoleError, consoleLog, execAccountTypeFlow, execShell} from "./lib";
import {Unpacked} from "src/shared/types";

const folderAsDomainEntries: Array<FolderAsDomainEntry<{
    configApiParam:
        | "email-securely-app:app.protonmail.ch"
        | "email-securely-app:mail.protonmail.com"
        | "email-securely-app:protonirockerxow.onion";
}>> = [
    {
        folderNameAsDomain: "app.protonmail.ch",
        options: {
            configApiParam: "email-securely-app:app.protonmail.ch",
        },
    },
    {
        folderNameAsDomain: "mail.protonmail.com",
        options: {
            configApiParam: "email-securely-app:mail.protonmail.com",
        },
    },
    {
        folderNameAsDomain: "protonirockerxow.onion",
        options: {
            configApiParam: "email-securely-app:protonirockerxow.onion",
        },
    },
];

execAccountTypeFlow({
    accountType: "protonmail",
    folderAsDomainEntries,
    repoRelativeDistDir: "./dist",
    flow: async ({repoDir, folderAsDomainEntry}) => {
        await build({repoDir, ...folderAsDomainEntry});
    },
}).catch(consoleError);

async function build({repoDir, options, folderNameAsDomain}: { repoDir: string; } & Unpacked<typeof folderAsDomainEntries>) {
    const {configApiParam} = options;
    const file = path.join(repoDir, "./env/env.json");
    const data = JSON.stringify({
        [configApiParam]: {
            api: `https://${folderNameAsDomain}/api`,
            sentry: {},
        },
    });

    consoleLog(chalk.magenta(`Writing file: `), chalkConsoleValue(JSON.stringify({file, data})));
    await promisify(fs.writeFile)(file, data);

    await execShell(["npm", ["run", "config", "--", `--api`, configApiParam, `--debug`, "true"], {cwd: repoDir}]);
    await execShell(["npm", ["run", "dist"], {cwd: repoDir}]);
}
