import {IsIn, IsOptional, IsString} from "class-validator";

import * as Model from "src/shared/model/database";
import {Entity} from "./base";

export class ConversationEntry extends Entity implements Model.ConversationEntry {
    @IsIn(Model.CONVERSATION_TYPE._.values)
    conversationType!: Model.ConversationEntry["conversationType"];

    @IsString()
    messageId!: Model.ConversationEntry["messageId"];

    @IsOptional()
    @IsString()
    previousPk?: Model.ConversationEntry["pk"];

    @IsOptional()
    @IsString()
    mailPk?: Model.Mail["pk"];
}
