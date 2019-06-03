import fastGlob from "fast-glob";
import fs from "fs";
import fsExtra from "fs-extra";
import mkdirp from "mkdirp";
import path from "path";

import {CWD, LOG, LOG_LEVELS, execShell} from "scripts/lib";
import {Locale, Unpacked} from "src/shared/types";
import {normalizeLocale} from "src/shared/util";

interface Dictionary {
    locale: Locale;
    files: string[];
}

export async function copyDictionaryFiles(destDir: string) {
    const dictionaries = await prepareDictionaries();

    LOG(LOG_LEVELS.title(
        `Copying files of ${LOG_LEVELS.value(String(dictionaries.size))} dictionaries to ${LOG_LEVELS.value(destDir)} directory:`,
    ));

    mkdirp.sync(destDir);

    for (const dictionary of dictionaries.values()) {
        for (const file of dictionary.files) {
            fs.copyFileSync(
                file,
                path.join(destDir, path.basename(file)),
            );
            LOG(LOG_LEVELS.value(file));
        }
    }
}

async function prepareDictionaries(): Promise<Map<Locale, Dictionary>> {
    const outcomeDir = path.join(CWD, "./output/git-wooorm-dictionaries-outcome");
    const files: string[] = [];

    if (fsExtra.pathExistsSync(outcomeDir)) {
        const existingFiles = await fastGlob.async<string>(
            path.join(outcomeDir, "./*"),
            {
                absolute: true,
                deep: 1,
                onlyFiles: true,
                stats: false,
            },
        );
        if (existingFiles.length) {
            files.push(...existingFiles);
        }
    }

    if (!files.length) {
        const repoCwd = path.join(CWD, "./output/git-wooorm-dictionaries");

        if (!fsExtra.pathExistsSync(repoCwd)) {
            await execShell(["git", ["clone", "https://github.com/wooorm/dictionaries.git", repoCwd]]);
            await execShell(["git", ["checkout", "44f122685cbcb52008a34abadc417149e31134f2"], {cwd: repoCwd}]);
            await execShell(["git", ["show", "--summary"], {cwd: repoCwd}]);
        }

        const resolvedDictionaries: Array<{ locale: string, aff: string; dic: string; license?: string; }> = [];
        const localeDirs = await fastGlob.async<string>(
            path.join(repoCwd, "./dictionaries/*"),
            {
                absolute: true,
                deep: 1,
                onlyDirectories: true,
                stats: false,
            },
        );

        for (const localeDir of localeDirs) {
            const locale = normalizeLocale(
                path.basename(localeDir),
            );

            if (String(locale.split("_").pop()).length > 2) {
                LOG(LOG_LEVELS.warning(`Skipping ${LOG_LEVELS.value(locale)} dictionary`));
                continue;
            }

            const license = path.join(localeDir, "./license");

            resolvedDictionaries.push({
                locale,
                aff: path.join(localeDir, "./index.aff"),
                dic: path.join(localeDir, "./index.dic"),
                license: fsExtra.pathExistsSync(license)
                    ? license
                    : undefined,
            });
        }

        mkdirp.sync(outcomeDir);

        for (const {locale, aff, dic, license} of resolvedDictionaries) {
            const dest: Unpacked<typeof resolvedDictionaries> & { license: string } = {
                locale,
                aff: path.join(outcomeDir, `./${locale}.aff`),
                dic: path.join(outcomeDir, `./${locale}.dic`),
                license: path.join(outcomeDir, `./${locale}.license`),
            };

            fs.copyFileSync(aff, dest.aff);
            files.push(dest.aff);

            fs.copyFileSync(dic, dest.dic);
            files.push(dest.dic);

            if (license) {
                fs.copyFileSync(license, dest.license);
                files.push(dest.license);
            }
        }
    }

    const result: Map<Locale, Dictionary> = new Map();

    for (const file of files) {
        const locale: Locale = path.basename(file, path.extname(file));
        let dictionary: Dictionary | undefined = result.get(locale);

        if (!dictionary) {
            dictionary = {locale, files: []};
            result.set(locale, dictionary);
        }

        dictionary.files.push(file);
    }

    LOG(LOG_LEVELS.title(
        `Prepared ${LOG_LEVELS.value(String(files.length))} dictionary files of ${LOG_LEVELS.value(String(result.size))} locales.`,
    ));

    return result;
}
