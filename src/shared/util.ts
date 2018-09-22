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
