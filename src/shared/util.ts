import {AccountConfig} from "./model/account";
import {BaseConfig, Config} from "./model/options";
import {BatchEntityUpdatesDbPatch} from "./api/common";
import {LoginFieldContainer} from "./model/container";
import {StatusCodeError} from "./model/error";
import {View} from "src/shared/model/database";
import {WEBVIEW_SRC_WHITELIST} from "./constants";

export function pickBaseConfigProperties(
    {closeToTray, compactLayout, startMinimized, unreadNotifications, checkForUpdatesAndNotify, logLevel}: Config,
): BaseConfig {
    return {closeToTray, compactLayout, startMinimized, unreadNotifications, checkForUpdatesAndNotify, logLevel};
}

export const isWebViewSrcWhitelisted = (src: string) => WEBVIEW_SRC_WHITELIST.some((allowedPrefix) => {
    return src.startsWith(allowedPrefix);
});

export const accountPickingPredicate = (criteria: LoginFieldContainer): (account: AccountConfig) => boolean => {
    return ({login}) => login === criteria.login;
};

export const pickAccountStrict = (accounts: AccountConfig[], criteria: LoginFieldContainer): AccountConfig => {
    const account = accounts.find(accountPickingPredicate(criteria));

    if (!account) {
        throw new StatusCodeError(`Account with "${criteria.login}" login has not been found`, "NotFoundAccount");
    }

    return account;
};

export const asyncDelay = async <T>(pauseTimeMs: number, resolveAction?: () => Promise<T>): Promise<T | void> => {
    return await new Promise<T | void>((resolve) => {
        setTimeout(() => typeof resolveAction === "function" ? resolve(resolveAction()) : resolve(), pauseTimeMs);
    });
};

export const curryFunctionMembers = <T extends any>(src: T, ...args: any[]): T => {
    const dest: T = typeof src === "function" ? src.bind(undefined) : {};
    for (const key of Object.getOwnPropertyNames(src)) {
        const srcMember = src[key];
        if (typeof srcMember === "function") {
            dest[key] = srcMember.bind(undefined, ...args);
        }
    }
    return dest;
};

export function isEntityUpdatesPatchNotEmpty({conversationEntries, folders, mails, contacts}: BatchEntityUpdatesDbPatch): boolean {
    return [
        conversationEntries.remove,
        conversationEntries.upsert,
        mails.remove,
        mails.upsert,
        folders.remove,
        folders.upsert,
        contacts.remove,
        contacts.upsert,
    ].some(({length}) => Boolean(length));
}

export function walkConversationNodesTree(rootNodes: View.ConversationNode[], fn: (node: View.ConversationNode) => void): void {
    const state: { nodes: View.ConversationNode[]; } = {nodes: [...rootNodes]};

    while (state.nodes.length) {
        const node = state.nodes.pop();

        if (!node) {
            continue;
        }

        fn(node);

        state.nodes.unshift(...[...node.children]);
    }
}

export function reduceNodesMails(
    nodes: View.ConversationNode[],
    filter: (mail: View.Mail) => boolean = () => true,
): View.Mail[] {
    const mails: View.Mail[] = [];

    walkConversationNodesTree(nodes, (node) => {
        if (!node.mail || !filter(node.mail)) {
            return;
        }
        mails.push(node.mail);
    });

    mails.sort((o1, o2) => o2.sentDate - o1.sentDate);

    return mails;
}

export function mapBy<T, K>(iterable: Iterable<T>, by: (t: T) => K): Map<K, T[]> {
    const map = new Map<K, T[]>();

    for (const el of iterable) {
        const key = by(el);
        const list = map.get(key) || [];

        list.push(el);
        map.set(key, list);
    }

    return map;
}

// TODO consider using https://github.com/cedx/enum.js instead
export function buildEnumBundle<V extends string | number = string>(
    nameValueMap: { [k: string]: V },
) {
    type M = typeof nameValueMap;
    const {names, values, valueNameMap} = Object
        .entries(nameValueMap)
        .reduce((accumulator: { names: Array<keyof M>; values: V[]; valueNameMap: { [k in V]: string } }, [key, value]) => {
            accumulator.names.push(key);
            accumulator.values.push(value as V);
            accumulator.valueNameMap[value] = key;
            return accumulator;
        }, {values: [], names: [], valueNameMap: {} as any});
    const resolveNameByValue = (value: V, strict: boolean = true): string => {
        if (strict && !(value in valueNameMap)) {
            throw new Error(`Failed to parse "${value}" value from the "${JSON.stringify(nameValueMap)}" map`);
        }
        return valueNameMap[value];
    };
    const parseValue = (rawValue: any, strict: boolean = true): V => nameValueMap[resolveNameByValue(rawValue, strict)] as V;

    // TODO deep freeze the result object
    return Object.assign(
        {
            _: {resolveNameByValue, parseValue, names, values, nameValueMap},
        },
        nameValueMap,
    );
}
