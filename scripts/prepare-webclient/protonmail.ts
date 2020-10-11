import fsExtra from "fs-extra";
import path from "path";

import {BINARY_NAME, PROVIDER_REPO_MAP, PROVIDER_REPO_NAMES} from "src/shared/constants";
import {CWD, execShell} from "scripts/lib";
import {FolderAsDomainEntry, executeBuildFlow, printAndWriteFile} from "./lib";

const folderAsDomainEntries: Array<FolderAsDomainEntry<{
    configApiParam:
        | "electron-mail:app.protonmail.ch"
        | "electron-mail:mail.protonmail.com"
        | "electron-mail:protonirockerxow.onion";
}>> = [
    {
        folderNameAsDomain: "app.protonmail.ch",
        options: {
            configApiParam: "electron-mail:app.protonmail.ch",
        },
    },
    {
        folderNameAsDomain: "mail.protonmail.com",
        options: {
            configApiParam: "electron-mail:mail.protonmail.com",
        },
    },
    {
        folderNameAsDomain: "protonirockerxow.onion",
        options: {
            configApiParam: "electron-mail:protonirockerxow.onion",
        },
    },
];

async function configure(
    {cwd, envFileName = "./appConfig.json", repoType}: { cwd: string; envFileName?: string; repoType: keyof typeof PROVIDER_REPO_MAP },
    {folderNameAsDomain, options}: Unpacked<typeof folderAsDomainEntries>,
): Promise<{ configApiParam: string }> {
    const {configApiParam} = options;

    printAndWriteFile(
        path.join(cwd, envFileName),
        JSON.stringify({
            appConfig: PROVIDER_REPO_MAP[repoType].protonPack.appConfig,
            [configApiParam]: {
                // https://github.com/ProtonMail/WebClient/issues/166#issuecomment-561060855
                api: `https://${folderNameAsDomain}/api`,
                secure: "https://secure.protonmail.com",
            },
            // so "dsn: SENTRY_CONFIG[env].sentry" code line not throwing ("env" variable gets resolved with "dev" value)
            // https://github.com/ProtonMail/WebClient/blob/aebd13605eec849bab199ffc0e58407a2e0d6537/env/config.js#L146
            dev: {},
        }, null, 2),
    );

    return {configApiParam};
}

function resolveWebpackConfigPatchingCode(
    {
        webpackConfigVarName,
        webpackIndexEntryItems
    }: {
        webpackConfigVarName: string
        webpackIndexEntryItems?: unknown
    },
): string {
    const disableMangling = Boolean(webpackIndexEntryItems);
    const result = `
        ${webpackConfigVarName}.devtool = false;

        Object.assign(
            ${webpackConfigVarName}.optimization,
            {
                minimize: ${!disableMangling /* eslint-disable-line @typescript-eslint/restrict-template-expressions */},
                moduleIds: "named",
                namedChunks: true,
                namedModules: true,

                // allows resolving individual modules from "window.webpackJsonp"
                concatenateModules: ${!disableMangling /* eslint-disable-line @typescript-eslint/restrict-template-expressions */},

                // allows resolving individual modules by path-based names (from "window.webpackJsonp")
                namedModules: ${disableMangling /* eslint-disable-line @typescript-eslint/restrict-template-expressions */},

                // allows preserving in the bundle some constants we reference in the provider api code
                // TODO proton v4: figure how to apply "usedExports: false" to specific files only
                usedExports: ${!disableMangling /* eslint-disable-line @typescript-eslint/restrict-template-expressions */},

                // TODO proton v4: switch to to "mangleExports" optimization option recently introduced in webpack v5
                // mangleExports: false,
            },
        );

        ${disableMangling
        ? `{
            const items = ${JSON.stringify(webpackIndexEntryItems, null, 2)}.map((item) => item.substr(1)); // turn "./" => "/"
            Object.assign(
                (${webpackConfigVarName}.optimization.splitChunks.cacheGroups
                    = ${webpackConfigVarName}.optimization.splitChunks.cacheGroups || {}),
                {
                    ${JSON.stringify(BINARY_NAME)}: {
                        test(module) {
                            const resource = module && module.resource
                            return resource && items.some((item) => resource.endsWith(item))
                        },
                        enforce: true,
                        minSize: 0,
                        name: "${BINARY_NAME}-chunk",
                    },
                },
            );
        }` : ""}

        ${disableMangling
        ? `
            const terserPluginInstance = ${webpackConfigVarName}.optimization.minimizer
                .find((plugin) => plugin.constructor.name === "TerserPlugin");
            if (!terserPluginInstance) {
                throw new Error("TerserPlugin instance resolving failed");
            }
            // terserPluginInstance.options.minify = false;
            terserPluginInstance.options.parallel = false;
            Object.assign(
                terserPluginInstance.options.terserOptions,
                {
                    // proton v4: needed to preserve original function names
                    //            just "{keep_fnames: true, mangle: false}" is not sufficient
                    ...({keep_fnames: true, compress: false}),
                },
            );
        `
        : `delete ${webpackConfigVarName}.optimization.minimizer;`}

        ${webpackIndexEntryItems
        ? `{
            const items = ${JSON.stringify(webpackIndexEntryItems, null, 2)};
            ${webpackConfigVarName}.entry.index.push(...items);
        }`
        : ""}

        for (const rule of ${webpackConfigVarName}.module.rules) {
            const babelLoaderOptions = (
                typeof rule === "object"
                &&
                Array.isArray(rule.use)
                &&
                (rule.use.find((item) => item.loader === "babel-loader") || {}).options
            );
            if (babelLoaderOptions) {
                babelLoaderOptions.compact = false;
            }
        }

        ${webpackConfigVarName}.plugins = ${webpackConfigVarName}.plugins.filter((plugin) => {
            switch (plugin.constructor.name) {
                case "HtmlWebpackPlugin":
                    plugin.options.minify = false;
                    break;
                case "ImageminPlugin":
                    return false;
                case "FaviconsWebpackPlugin":
                    return false;
                case "OptimizeCSSAssetsPlugin":
                    return false;
                case "OptimizeCssAssetsWebpackPlugin":
                    return false;
                case "SourceMapDevToolPlugin":
                    return false;
                case "HashedModuleIdsPlugin":
                    return false;
            }
            return true;
        });
    `;

    return result;
}

(async () => { // eslint-disable-line @typescript-eslint/no-floating-promises
    for (const repoType of PROVIDER_REPO_NAMES) {
        await executeBuildFlow({
            repoType,
            folderAsDomainEntries,
            destSubFolder: PROVIDER_REPO_MAP[repoType].baseDirName,
            flows: {
                async install({repoDir}) {
                    await execShell(["npm", ["ci"], {cwd: repoDir}]);

                    await execShell([
                        "git",
                        [
                            "apply",
                            "--ignore-whitespace",
                            "--reject",
                            path.join(CWD, `./patches/protonmail/${repoType}.patch`),
                        ],
                        {cwd: repoDir},
                    ]);
                },

                build: async ({repoDir: cwd, folderAsDomainEntry}) => {
                    const {configApiParam} = await configure({cwd, repoType}, folderAsDomainEntry);

                    {
                        const webpackPatch = repoType === "proton-account"
                            ? {publicPath: `/${PROVIDER_REPO_MAP[repoType].baseDirName}/`}
                            : undefined;
                        const webpackIndexEntryItems = repoType === "proton-mail"
                            ? PROVIDER_REPO_MAP[repoType].protonPack.webpackIndexEntryItems
                            : undefined;

                        // https://github.com/ProtonMail/proton-pack/tree/2e44d5fd9d2df39787202fc08a90757ea47fe480#how-to-configure
                        printAndWriteFile(
                            path.join(cwd, "./proton.config.js"),
                            `
                            module.exports = (webpackConfig) => {
                                ${
                                resolveWebpackConfigPatchingCode({
                                    webpackConfigVarName: "webpackConfig",
                                    webpackIndexEntryItems,
                                })}
                                ${
                                webpackPatch?.publicPath
                                    ? "webpackConfig.output.publicPath = " + JSON.stringify(webpackPatch?.publicPath)
                                    : ""}
                                return webpackConfig;
                            }
                            `,
                        );
                    }

                    await execShell([
                        "npm",
                        [
                            "run",
                            "build",
                            "--",
                            "--api", configApiParam,
                            // "--appMode", "standalone" | "sso" | undefined, // https://github.com/ProtonMail/WebClient/issues/205
                            ...(
                                repoType === "proton-mail-settings"
                                    ? ["--featureFlags", "sub-folder" /* + " mail-import" */]
                                    : []
                            ),
                        ],
                        {cwd},
                    ]);

                    await (async () => {
                        const {stdout} = await execShell([
                            "npx",
                            [
                                "--no-install",
                                "ts-node",
                                "-O", `{"module": "commonjs"}`,
                                "-e", `import {VERSION_PATH} from "./src/app/config"; console.log(VERSION_PATH);`,
                            ],
                            {cwd},
                        ]);
                        const versionPathParts = path
                            .normalize(stdout.trim())
                            .split(path.sep)
                            .filter((item) => Boolean(item));
                        if (!versionPathParts.length) {
                            throw new Error("Failed to resolve version path");
                        }
                        if (versionPathParts[0] === PROVIDER_REPO_MAP[repoType].baseDirName) {
                            // TODO explore VERSION_PATH build arg setting capability rather than dealing with the default value
                            versionPathParts.shift();
                        }
                        const versionOutput = path.join(
                            cwd,
                            PROVIDER_REPO_MAP[repoType].repoRelativeDistDir,
                            ...versionPathParts,
                        );
                        fsExtra.ensureDirSync(path.dirname(versionOutput));
                        await execShell([
                            "./node_modules/proton-bundler/scripts/createVersionJSON.sh",
                            ["--output", versionOutput],
                            {cwd},
                        ]);
                    })();
                },
            },
        });
    }
})();
