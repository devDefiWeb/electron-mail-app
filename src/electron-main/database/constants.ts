import {DbFsDataContainer, MAIL_FOLDER_TYPE, PROTONMAIL_MAILBOX_IDENTIFIERS} from "src/shared/model/database";

export const DATABASE_VERSION = "3";

type Folder = Unpacked<DbFsDataContainer["folders"]["values"]>;

export const PROTONMAIL_STATIC_FOLDERS: readonly Folder[] = (
    [
        [PROTONMAIL_MAILBOX_IDENTIFIERS.Inbox, MAIL_FOLDER_TYPE.INBOX],
        [PROTONMAIL_MAILBOX_IDENTIFIERS.Drafts, MAIL_FOLDER_TYPE.DRAFT],
        [PROTONMAIL_MAILBOX_IDENTIFIERS.Sent, MAIL_FOLDER_TYPE.SENT],
        [PROTONMAIL_MAILBOX_IDENTIFIERS.Starred, MAIL_FOLDER_TYPE.STARRED],
        [PROTONMAIL_MAILBOX_IDENTIFIERS.Archive, MAIL_FOLDER_TYPE.ARCHIVE],
        [PROTONMAIL_MAILBOX_IDENTIFIERS.Spam, MAIL_FOLDER_TYPE.SPAM],
        [PROTONMAIL_MAILBOX_IDENTIFIERS.Trash, MAIL_FOLDER_TYPE.TRASH],
        [PROTONMAIL_MAILBOX_IDENTIFIERS["All Mail"], MAIL_FOLDER_TYPE.ALL],
    ] as Array<[Folder["id"], Folder["folderType"]]>
).map(([id, folderType]) => ({
    _validated: undefined,
    pk: id,
    id,
    raw: "{}",
    folderType,
    name: PROTONMAIL_MAILBOX_IDENTIFIERS._.resolveNameByValue(id as any),
    mailFolderId: id,
}));
