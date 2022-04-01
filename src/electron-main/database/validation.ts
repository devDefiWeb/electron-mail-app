import _logger from "electron-log";
import {ClassType, transformAndValidate, TransformValidationOptions} from "class-transformer-validator";
import {flatten} from "remeda";
import {ValidationError} from "class-validator";

import {Contact, Entity, Folder, FsDbDataContainer, Mail, ValidatedEntity} from "src/shared/model/database";
import {curryFunctionMembers} from "src/shared/util";
import * as Entities from "./entity";
import {IPC_MAIN_API_NOTIFICATION$} from "src/electron-main/api/const";
import {IPC_MAIN_API_NOTIFICATION_ACTIONS} from "src/shared/api/main-process/actions";

const logger = curryFunctionMembers(_logger, __filename);

const transformValidationOptions: TransformValidationOptions = {
    validator: {
        // prevent unknown to "class-validator" objects to pass validation
        forbidUnknownValues: true,
        // stripe out unknown properties
        whitelist: true,
        // do not attach to error object an entity being validated
        validationError: {target: false},
    },
};

const entityClassesMap = {
    conversationEntries: Entities.ConversationEntry,
    mails: Entities.Mail,
    folders: Entities.Folder,
    contacts: Entities.Contact,
} as const;

function flattenValidationError(rawError: Error): Error | string {
    if (!Array.isArray(rawError)) {
        return rawError;
    }

    const errors: ValidationError[] = flatten(rawError); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const messages: string[] = [];

    if (!errors.length || !(errors[0] instanceof ValidationError)) {
        return rawError;
    }

    while (errors.length) {
        const error = errors.shift();

        if (!error) {
            continue;
        }

        messages.push(
            error.property
            +
            ": "
            +
            Object.entries(error.constraints ?? {})
                .map(([key, value]) => `${key}: ${value}`)
                .join(", "),
        );

        if (error.children) {
            errors.push(...error.children);
        }
    }

    return messages.join("; ");
}

export async function validateEntity<T extends Entity>(
    entityType: keyof FsDbDataContainer,
    entity: T,
): Promise<T & ValidatedEntity> {
    const classType = entityClassesMap[entityType] as unknown as ClassType<T>;

    try {
        const validatedEntityInstance = await transformAndValidate(
            classType,
            entity,
            transformValidationOptions,
        );

        // TODO performance: why JSON.parse <= JSON.stringify call?
        return JSON.parse( // eslint-disable-line @typescript-eslint/no-unsafe-return
            JSON.stringify(validatedEntityInstance),
        );
    } catch (error) {
        logger.error("original validation error", error);

        IPC_MAIN_API_NOTIFICATION$.next(
            IPC_MAIN_API_NOTIFICATION_ACTIONS.ErrorMessage({
                message: "Local database entity validation error has occurred: " + JSON.stringify({
                    entityType,
                    ...(() => { // eslint-disable-line @typescript-eslint/explicit-function-return-type
                        if (entityType === "mails") {
                            return {
                                sentDate: (entity as unknown as Mail).sentDate,
                                subject: (entity as unknown as Mail).subject,
                            };
                        }
                        if (entityType === "contacts") {
                            return {
                                firstName: (entity as unknown as Contact).firstName,
                                lastName: (entity as unknown as Contact).lastName,
                            };
                        }
                        if (entityType === "folders") {
                            return {
                                folderName: (entity as unknown as Folder).name,
                            };
                        }
                        return {};
                    })(),
                    error: flattenValidationError(error as Error),
                }),
            }),
        );

        throw new Error(
            `Local database saving and data syncing iterations aborted due to the "${entityType}" entity validation error`,
        );
    }
}
