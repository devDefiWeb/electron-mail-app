import {AngularCompilerPlugin, NgToolsLoader, PLATFORM} from "@ngtools/webpack";
import {DefinePlugin} from "webpack";
import {readConfiguration} from "@angular/compiler-cli";

import {BuildAngularCompilationFlags, BuildEnvironment} from "webpack-configs/model";
import {ENVIRONMENT, ENVIRONMENT_STATE, rootRelativePath} from "webpack-configs/lib";
import {WEB_CHUNK_NAMES} from "src/shared/constants";
import {browserWindowAppPath, browserWindowPath, buildBaseWebConfig, cssRuleSetUseItems} from "./lib";

// TODO enable "ivy" and "aot" in all modes
const angularCompilationFlags: BuildAngularCompilationFlags = {
    aot: ENVIRONMENT_STATE.production,
    ivy: ENVIRONMENT_STATE.production,
};

const tsConfigFile = browserWindowPath(({
    production: "./tsconfig.json",
    development: "./tsconfig.development.json",
    test: "./test/tsconfig.json",
} as Record<BuildEnvironment, string>)[ENVIRONMENT]);

const config = buildBaseWebConfig(
    {
        module: {
            rules: [
                {
                    test: angularCompilationFlags.aot
                        ? /(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/
                        : /\.ts$/,
                    use: [
                        "@angular-devkit/build-optimizer/webpack-loader",
                        NgToolsLoader,
                    ],
                },
                {
                    test: /[\/\\]@angular[\/\\].+\.js$/,
                    sideEffects: false,
                    parser: {
                        system: true,
                    },
                },
                {
                    test: /\.scss$/,
                    use: [
                        "to-string-loader",
                        ...cssRuleSetUseItems(),
                        "resolve-url-loader",
                        "sass-loader",
                    ],
                    include: [
                        browserWindowAppPath(),
                    ],
                },
            ],
        },
        resolve: {
            alias: {
                images: rootRelativePath("images"),
            },
        },
        plugins: [
            new DefinePlugin({
                BUILD_ANGULAR_COMPILATION_FLAGS: JSON.stringify(angularCompilationFlags),
            }),
            new AngularCompilerPlugin({
                contextElementDependencyConstructor: require("webpack/lib/dependencies/ContextElementDependency"),
                tsConfigPath: tsConfigFile,
                compilerOptions: {
                    preserveWhitespaces: false,
                    disableTypeScriptVersionCheck: true,
                    strictInjectionParameters: true,
                    // TODO ivy: get back templates type check after https://github.com/angular/angular/issues/30080 resolving
                    fullTemplateTypeCheck: false, // TODO ivy: angularCompilationFlags.aot || angularCompilationFlags.ivy
                    ivyTemplateTypeCheck: false, // TODO ivy: angularCompilationFlags.ivy
                    enableIvy: angularCompilationFlags.ivy,
                    ...readConfiguration(tsConfigFile).options,
                },
                platform: PLATFORM.Browser,
                skipCodeGeneration: !angularCompilationFlags.aot,
                nameLazyFiles: true,
                discoverLazyRoutes: true, // TODO disable "discoverLazyRoutes" once switched to Ivy renderer
                directTemplateLoading: false,
                entryModule: `${browserWindowAppPath("./app.module")}#AppModule`,
                additionalLazyModules: {
                    ["./_db-view/db-view.module#DbViewModule"]: browserWindowAppPath("./_db-view/db-view.module.ts"),
                },
            }),
        ],
        optimization: {
            splitChunks: {
                cacheGroups: {
                    commons: {
                        test: /[\\/]node_modules[\\/]|[\\/]vendor[\\/]/,
                        name: "vendor",
                        chunks: "all",
                    },
                },
            },
        },
    },
    {
        tsConfigFile,
        chunkName: WEB_CHUNK_NAMES["browser-window"],
    },
);

export default config;
