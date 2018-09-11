import {
    ArrayNotEmpty,
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import {Type} from "class-transformer";

import * as Model from "src/shared/model/database";
import {Entity} from "./base";

class MailAddress extends Entity implements Model.MailAddress {
    @IsNotEmpty()
    @IsString()
    address!: Model.MailAddress["address"];

    @IsString()
    name!: Model.MailAddress["name"];
}

class File extends Entity implements Model.File {
    @IsOptional()
    @IsString()
    mimeType?: Model.File["mimeType"];

    @IsString()
    @IsNotEmpty()
    name!: Model.File["name"];

    @IsNotEmpty()
    @IsInt()
    size!: Model.File["size"];
}

export class Mail extends Entity implements Model.Mail {
    @IsNotEmpty()
    @IsString()
    conversationEntryPk!: Model.ConversationEntry["pk"];

    @ArrayUnique()
    @IsArray()
    @IsString({each: true})
    mailFolderIds!: Array<Model.Folder["mailFolderId"]>;

    @IsNotEmpty()
    @IsInt()
    sentDate!: Model.Mail["sentDate"];

    @IsNotEmpty()
    @IsString()
    subject!: Model.Mail["subject"];

    @IsString()
    body!: Model.Mail["body"];

    @IsNotEmpty()
    @ValidateNested()
    @Type(() => MailAddress)
    sender!: MailAddress;

    @ValidateNested()
    @IsArray()
    @ArrayNotEmpty()
    @Type(() => MailAddress)
    toRecipients!: MailAddress[];

    @ValidateNested()
    @IsArray()
    @Type(() => MailAddress)
    ccRecipients!: MailAddress[];

    @ValidateNested()
    @IsArray()
    @Type(() => MailAddress)
    bccRecipients!: MailAddress[];

    @ValidateNested()
    @IsArray()
    @Type(() => File)
    attachments!: File[];

    @IsNotEmpty()
    @IsBoolean()
    unread!: Model.Mail["unread"];

    @IsIn(Model.MAIL_STATE._.values)
    state!: Model.Mail["state"];

    // TODO consider making Mail.confidential field optional, not used by protonmail?
    @IsNotEmpty()
    @IsBoolean()
    confidential!: Model.Mail["confidential"];

    @IsIn(Model.REPLY_TYPE._.values)
    replyType!: Model.Mail["replyType"];
}
