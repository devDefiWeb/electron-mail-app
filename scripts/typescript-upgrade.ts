// TODO drop "scripts/typescript-upgrade.ts" after typescript gets updated to newer than 4.5.2 version
//      see https://github.com/microsoft/TypeScript/pull/46818

import {catchTopLeventAsync, execShell} from "scripts/lib";

const [, , ACTION_TYPE_ARG] = process.argv as [null, null, "upgrade" | "rollback" | unknown];

catchTopLeventAsync(async () => {
    if (ACTION_TYPE_ARG === "upgrade") {
        await execShell(["yarn", ["add", "--dev", "typescript@4.6.0-dev.20211119"]]);
        return;
    }
    if (ACTION_TYPE_ARG === "rollback") {
        await execShell(["yarn", ["add", "--dev", "typescript@4.5.2"]]);
        return;
    }
    throw new Error(`Unexpected action type argument: ${String(ACTION_TYPE_ARG)}`);
});
