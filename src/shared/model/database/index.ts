import {AccountConfig, AccountType} from "src/shared/model/account";
import {NumberString, Omit, Timestamp} from "src/shared/types";

export * from "./constants";

export interface Entity {
    pk: string;
    raw: string;
    id: string;
}

export interface Folder extends Entity {
    folderType: string;
    name: string;
}

export interface Mail extends Entity {
    date: Timestamp;
    subject: string;
    body: string;
    sender: MailAddress;
    toRecipients: MailAddress[];
    ccRecipients: MailAddress[];
    bccRecipients: MailAddress[];
    attachments: File[];
    unread: boolean;
}

export interface MailAddress extends Entity {
    address: string;
    name: string;
}

export interface File extends Entity {
    mimeType?: string;
    name: string;
    size: number;
}

export interface Contact extends Entity {
    comment: string;
    company: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    role: string;
    title?: string;
    addresses: ContactAddress[];
    birthday?: Birthday;
    mailAddresses: ContactMailAddress[];
    phoneNumbers: ContactPhoneNumber[];
    socialIds: ContactSocialId[];
}

export interface ContactAddress extends Entity {
    type: string;
    customTypeName: string;
    address: string;
}

export interface ContactMailAddress extends Entity {
    type: string;
    customTypeName: string;
    address: string;
}

export interface Birthday extends Entity {
    day: NumberString;
    month: NumberString;
    year?: NumberString;
}

export interface ContactPhoneNumber extends Entity {
    type: string;
    customTypeName: string;
    number: string;
}

export interface ContactSocialId extends Entity {
    type: string;
    customTypeName: string;
    socialId: string;
}

export interface EntityMap<V extends Entity, K extends V["pk"] = V["pk"]> extends Omit<Map<K, V>, "set"> {
    validateAndSet(value: V): Promise<this>;

    toObject(): Record<K, V>;
}

interface EntitiesMapContainer {
    mails: EntityMap<Mail>;
    folders: EntityMap<Folder>;
    contacts: EntityMap<Contact>;
}

interface EntitiesRecordContainer {
    mails: Record<Mail["pk"], Mail>;
    folders: Record<Folder["pk"], Folder>;
    contacts: Record<Contact["pk"], Contact>;
}

type GenericDb<T extends AccountType, M, EntitiesContainer extends EntitiesMapContainer | EntitiesRecordContainer> =
    Record<T,
        Record<AccountConfig<T>["login"],
            Readonly<EntitiesContainer & { metadata: { type: T } & M }>>>;

interface TutanotaMetadataPart {
    groupEntityEventBatchIds: Record</* Rest.Model.Group["_id"] */ string, /* Rest.Model.EntityEventBatch["_id"][1] */ string>;
}

interface ProtonmailMetadataPart {
    propertyPlaceholder?: string;
}

export type MemoryDb =
    GenericDb<"tutanota", TutanotaMetadataPart, EntitiesMapContainer>
    &
    GenericDb<"protonmail", ProtonmailMetadataPart, EntitiesMapContainer>;

export type FsDb =
    GenericDb<"tutanota", TutanotaMetadataPart, EntitiesRecordContainer>
    &
    GenericDb<"protonmail", ProtonmailMetadataPart, EntitiesRecordContainer>;

export type MemoryDbAccount<T extends keyof MemoryDb = keyof MemoryDb> = MemoryDb[T][string];
