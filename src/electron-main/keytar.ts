import {pick} from "ramda";

import {PROJECT_NAME} from "src/shared/constants";
import {Unpacked} from "src/shared/types";

const service = PROJECT_NAME;
const account = "master-password";

type Keytar = Pick<typeof import("keytar"), "getPassword" | "setPassword" | "deletePassword">;  // tslint:disable-line:no-import-zones

// TODO don't expose STATE
export const STATE: {
    resolveKeytar: () => Promise<Keytar>;
} = {
    resolveKeytar: async () => {
        const keytar = pick(
            ["getPassword", "setPassword", "deletePassword"],
            await import("keytar"), // tslint:disable-line:no-import-zones
        );

        STATE.resolveKeytar = async () => Promise.resolve(keytar);

        return keytar;
    },
};

export const getPassword: () => ReturnType<Unpacked<Keytar>["getPassword"]> = async () => {
    const keytar = await STATE.resolveKeytar();
    return await keytar.getPassword(service, account);
};

export const setPassword: (password: string) => ReturnType<Unpacked<Keytar>["setPassword"]> = async (password) => {
    const keytar = await STATE.resolveKeytar();
    return await keytar.setPassword(service, account, password);
};

export const deletePassword: () => ReturnType<Unpacked<Keytar>["deletePassword"]> = async () => {
    const keytar = await STATE.resolveKeytar();
    return await keytar.deletePassword(service, account);
};
