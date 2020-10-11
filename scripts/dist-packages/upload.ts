import archiver from "archiver";
import fs from "fs";
import path from "path";
import {platform} from "os";

import {CONSOLE_LOG, execShell} from "scripts/lib";
import {listInstallationPackageFiles} from "./lib";

const [, , DIST_DIRECTORY, OUTPUT_DIRECTORY] = process.argv as [null, null, string, string];

const outputFile = path.join(OUTPUT_DIRECTORY, `dist-${platform()}.tar`);
const outputStream = fs.createWriteStream(outputFile);
const outputArchiver = archiver("tar");

outputStream.on("finish", async () => {
    await execShell(["yarn", ["scripts/transfer", "upload", outputFile]]);
});

outputArchiver.pipe(outputStream);

(async () => { // eslint-disable-line @typescript-eslint/no-floating-promises
    for (const file of await listInstallationPackageFiles(DIST_DIRECTORY)) {
        if (file.endsWith(".blockmap")) {
            continue;
        }

        outputArchiver.file(file, {name: path.basename(file)});
        CONSOLE_LOG(`Adding ${file} to ${outputFile} archive`);
    }

    await outputArchiver.finalize();
})();
