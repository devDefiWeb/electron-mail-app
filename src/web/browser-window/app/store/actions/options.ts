import {PasswordBasedPreset} from "fs-json-store-encryption-adapter";
import {ofType, unionize} from "@vladimiry/unionize";

import {
    AccountConfigCreateUpdatePatch,
    LoginFieldContainer,
    PasswordChangeContainer,
    PasswordFieldContainer,
} from "src/shared/model/container";
import {BaseConfig, Config, Settings} from "src/shared/model/options";
import {InitResponse} from "src/shared/api/main";
import {ProgressPatch, State} from "src/web/browser-window/app/store/reducers/options";

export const OPTIONS_ACTIONS = unionize({
        AddAccountRequest: ofType<AccountConfigCreateUpdatePatch>(),
        UpdateAccountRequest: ofType<AccountConfigCreateUpdatePatch>(),
        ChangeAccountOrderRequest: ofType<LoginFieldContainer & { index: number }>(),
        RemoveAccountRequest: ofType<{ login: string }>(),
        ChangeMasterPasswordRequest: ofType<PasswordChangeContainer>(),
        GetConfigRequest: ofType<{ justRead?: boolean }>(),
        GetConfigResponse: ofType<Config>(),
        GetSettingsRequest: ofType<{}>(),
        GetSettingsResponse: ofType<Pick<Settings, "_rev" | "accounts">>(),
        InitRequest: ofType<{}>(),
        InitResponse: ofType<InitResponse>(),
        PatchBaseSettingsRequest: ofType<BaseConfig>(),
        PatchProgress: ofType<ProgressPatch>(),
        ReEncryptSettings: ofType<{ password: string, encryptionPreset: PasswordBasedPreset }>(),
        SignInRequest: ofType<Partial<PasswordFieldContainer> & { savePassword?: boolean; }>(),
        ToggleCompactRequest: ofType<{}>(),
        ToggleLocalDbMailsListViewMode: ofType<{}>(),
        SetupMainProcessNotification: ofType<{}>(),
        PatchMainProcessNotification: ofType<State["mainProcessNotification"]>(),
        TrayIconDataURL: ofType<{ value: string }>(),
    },
    {
        tag: "type",
        value: "payload",
        tagPrefix: "options:",
    },
);
