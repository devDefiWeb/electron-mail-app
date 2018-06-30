import {KeePassRef} from "./keepasshttp";
import {NotificationType} from "_@shared/api/webview/notification-output";

export interface AccountCredentials {
    password: {
        value?: string;
        keePassRef?: KeePassRef;
    };
    mailPassword: {
        value?: string;
        keePassRef?: KeePassRef;
    };
    twoFactorCode?: {
        value?: string;
        keePassRef?: KeePassRef;
    };
}

export interface AccountConfig {
    credentials: AccountCredentials;
    login: string;
}

export interface WebAccountProgress {
    password?: boolean;
    password2fa?: boolean;
    mailPassword?: boolean;
}

export type WebAccountPageType = "login" | "login2fa" | "unlock";

export interface WebAccountPageLocation {
    url: string;
    type?: WebAccountPageType;
}

export interface WebAccount {
    accountConfig: AccountConfig;
    progress: WebAccountProgress;
    sync: {
        title?: string;
        unread?: number;
        pageType: WebAccountPageLocation;
    } & Partial<Record<NotificationType, any>>;
}
