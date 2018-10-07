import {buildEnumBundle} from "src/shared/util";

export const OPERATION_TYPE = buildEnumBundle({
    CREATE: "0",
    UPDATE: "1",
    DELETE: "2",
});

export const MAIL_FOLDER_TYPE = buildEnumBundle({
    CUSTOM: "0",
    INBOX: "1",
    SENT: "2",
    TRASH: "3",
    ARCHIVE: "4",
    SPAM: "5",
    DRAFT: "6",
});

export const MAIL_STATE = buildEnumBundle({
    DRAFT: "0",
    SENT: "1",
    RECEIVED: "2",
    INBOX_AND_SENT: "100",
});

export const REPLY_TYPE = buildEnumBundle({
    NONE: "0",
    REPLY: "1",
    FORWARD: "2",
    REPLY_FORWARD: "3",
});

export const CONVERSATION_TYPE = buildEnumBundle({
    NEW: "0",
    REPLY: "1",
    FORWARD: "2",
    // TODO unexpected "CONVERSATION_TYPE=3" value actually used by Tutanota
    // not presented in https://github.com/tutao/tutanota/blob/b689218e6bae45bb38cfef7929494c708aa0f252/src/api/common/TutanotaConstants.js
    UNEXPECTED: "3",
});

export const CONTACT_ADDRESS_TYPE = buildEnumBundle({
    PRIVATE: "0",
    WORK: "1",
    OTHER: "2",
    CUSTOM: "3",
});

export const CONTACT_PHONE_NUMBER_TYPE = buildEnumBundle({
    PRIVATE: "0",
    WORK: "1",
    MOBILE: "2",
    FAX: "3",
    OTHER: "4",
    CUSTOM: "5",
});

export const CONTACT_SOCIAL_TYPE = buildEnumBundle({
    TWITTER: "0",
    FACEBOOK: "1",
    XING: "2",
    LINKED_IN: "3",
    OTHER: "4",
    CUSTOM: "5",
});
