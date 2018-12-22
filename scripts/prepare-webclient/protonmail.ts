import chalk from "chalk";
import fs from "fs";
import path from "path";
import {promisify} from "util";

import {FolderAsDomainEntry, chalkValue, consoleError, consoleLog, execAccountTypeFlow, execShell} from "./lib";
import {Unpacked} from "src/shared/types";

// tslint:disable-next-line:no-var-requires no-import-zones
const {name: APP_NAME} = require("package.json");

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

async function build({repoDir: cwd, options, folderNameAsDomain}: { repoDir: string; } & Unpacked<typeof folderAsDomainEntries>) {
    // configuring
    await (async () => {
        const {configApiParam} = options;
        const envFile = path.join(cwd, "./env/env.json");
        const envFileContent = JSON.stringify({
            [configApiParam]: {
                api: `https://${folderNameAsDomain}/api`,
                sentry: {},
            },
        }, null, 2);

        consoleLog(chalk.magenta(`Writing "${chalkValue(envFile)}" file:`), chalkValue(envFileContent));
        await promisify(fs.writeFile)(envFile, envFileContent);

        await execShell(["npm", ["run", "config", "--", "--api", configApiParam, "--debug", "true"], {cwd}]);
    })();

    // building
    await (async () => {
        const webpackFile = path.join(cwd, `./webpack.config.${APP_NAME}.js`);
        // tslint:disable:no-trailing-whitespace
        const webpackFileContent = `
            const config = require("./webpack.config");
            
            config.devtool = "source-map";
            
            config.optimization.minimize = false;
            delete config.optimization.minimizer;
            
            config.plugins = config.plugins.filter((plugin) => {
                switch (plugin.constructor.name) {
                    case "HtmlWebpackPlugin":
                        plugin.options.minify = false;
                        break;
                    case "OptimizeCSSAssetsPlugin":
                        return false;
                    case "ImageminPlugin":
                        return false;
                }
                return true;
            })
            
            module.exports = config;
        `;
        // tslint:enable:no-trailing-whitespace

        consoleLog(chalk.magenta(`Writing "${chalkValue(webpackFile)}" file:`), chalkValue(webpackFileContent));
        await promisify(fs.writeFile)(webpackFile, webpackFileContent);

        await execShell(["npm", ["run", "dist", "--", "--progress", "false", "--config", webpackFile], {cwd}]);
    })();
}
