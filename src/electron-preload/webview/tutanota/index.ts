import {authenticator} from "otplib";
import {concatMap, distinctUntilChanged, map, tap} from "rxjs/operators";
import {from, interval, merge, Observable, of, Subscriber} from "rxjs";

import {
    NOTIFICATION_LOGGED_IN_POLLING_INTERVAL,
    NOTIFICATION_PAGE_TYPE_POLLING_INTERVAL,
    WEBVIEW_LOGGERS,
} from "src/electron-preload/webview/constants";
import {
    buildDbFolder,
    buildDbMail,
    buildPk,
    fetchMailFoldersWithSubFolders,
    resolveInstanceId,
    sameRefType,
} from "src/electron-preload/webview/tutanota/lib/util";
import * as Rest from "./lib/rest";
import * as DatabaseModel from "src/shared/model/database";
import {BatchEntityUpdatesDbPatch} from "src/shared/api/common";
import {buildLoggerBundle} from "src/electron-preload/util";
import {curryFunctionMembers, MailFolderTypeService} from "src/shared/util";
import {fetchEntitiesRange} from "src/electron-preload/webview/tutanota/lib/rest";
import {fillInputValue, getLocationHref, submitTotpToken, waitElements} from "src/electron-preload/webview/util";
import {generateStartId} from "./lib/util";
import {ONE_SECOND_MS} from "src/shared/constants";
import {resolveWebClientApi, WebClientApi} from "src/electron-preload/webview/tutanota/lib/tutanota-api";
import {TUTANOTA_IPC_WEBVIEW_API, TutanotaApi, TutanotaNotificationOutput} from "src/shared/api/webview/tutanota";
import {EntityUpdate} from "./lib/rest/model";

const WINDOW = window as any;
const _logger = curryFunctionMembers(WEBVIEW_LOGGERS.tutanota, "[index]");

resolveWebClientApi()
    .then(bootstrapApi)
    .catch(_logger.error);

function bootstrapApi(webClientApi: WebClientApi) {
    delete WINDOW.Notification;

    const {GENERATED_MAX_ID} = webClientApi["src/api/common/EntityFunctions"];
    const login2FaWaitElementsConfig = {
        input: () => document.querySelector("#modal input.input") as HTMLInputElement,
        button: () => document.querySelector("#modal input.input ~ div > button") as HTMLElement,
    };
    const endpoints: TutanotaApi = {
        ping: () => of(null),

        bootstrapFetch: ({bootstrappedMailId, zoneName}) => from((async () => {
            const logger = curryFunctionMembers(_logger, "bootstrapFetch()", zoneName);
            logger.info();

            const controller = getUserController();

            if (!controller) {
                throw new Error("User controller is supposed to be defined");
            }

            const initialRun = typeof bootstrappedMailId === "undefined";

            // last entity event batches fetching must be happening BEFORE mails and folders fetching and only INITIALLY (once)
            // so app does further entity event batches fetching starting from the boostrap/this stage
            const metadata: Partial<Pick<DatabaseModel.DbContent<"tutanota">["metadata"], "groupEntityEventBatchIds">> = {};
            if (initialRun) {
                metadata.groupEntityEventBatchIds = {};
                for (const {group} of controller.user.memberships) {
                    const entityEventBatches = await Rest.fetchEntitiesRange(
                        Rest.Model.EntityEventBatchTypeRef,
                        group,
                        {
                            count: 1,
                            reverse: true,
                            start: GENERATED_MAX_ID,
                        },
                    );
                    if (entityEventBatches.length) {
                        metadata.groupEntityEventBatchIds[group] = resolveInstanceId(entityEventBatches[0]);
                    }
                }
                logger.info(`fetched metadata for ${Object.keys(metadata.groupEntityEventBatchIds).length} entity event batches`);
            }

            const startId = await generateStartId(bootstrappedMailId);
            const folders = await fetchMailFoldersWithSubFolders(controller.user);
            const mails = [];

            logger.info(`startId: ${initialRun ? "initial" : 'provided "instanceId" based'}`);

            for (const folder of folders) {
                const folderMails = await Rest.fetchEntitiesRangeUntilTheEnd(
                    Rest.Model.MailTypeRef,
                    folder.mails,
                    {start: startId, count: 500},
                );
                for (const mail of folderMails) {
                    mails.push(await buildDbMail(mail));
                }
            }

            logger.info(`returning ${folders.length} folders and ${mails.length} mails`);

            return {
                mails,
                folders: folders.map((folder) => buildDbFolder(folder)),
                metadata,
            };
        })()),

        buildBatchEntityUpdatesDbPatch: ({groupEntityEventBatchIds, zoneName}) => from((async () => {
            const logger = curryFunctionMembers(_logger, "entityEventBatchesFetch()", zoneName);
            logger.info();

            const controller = getUserController();

            if (!controller) {
                throw new Error("User controller is supposed to be defined");
            }

            const entitiesUpdates: Rest.Model.EntityEventBatch[] = [];
            const metadata: Required<Pick<DatabaseModel.DbContent<"tutanota">["metadata"], "groupEntityEventBatchIds">> = {
                groupEntityEventBatchIds: {},
            };

            for (const {group} of controller.user.memberships) {
                const startId = await generateStartId(groupEntityEventBatchIds[group]);
                const entityEventBatches = await Rest.fetchEntitiesRangeUntilTheEnd(
                    Rest.Model.EntityEventBatchTypeRef,
                    group,
                    {start: startId, count: 500},
                );
                entitiesUpdates.push(...entityEventBatches);
                if (entityEventBatches.length) {
                    metadata.groupEntityEventBatchIds[group] = resolveInstanceId(entityEventBatches[entityEventBatches.length - 1]);
                }
            }
            logger.verbose(`fetched ${entitiesUpdates.length} entity event batches`);

            const databasePatch = await buildBatchEntityUpdatesDbPatch({entitiesUpdates, _logger: logger});

            return {
                ...databasePatch,
                metadata,
            };
        })()),

        fillLogin: ({login, zoneName}) => from((async () => {
            const logger = curryFunctionMembers(_logger, "fillLogin()", zoneName);
            logger.info();

            const cancelEvenHandler = (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
            };
            const elements = await waitElements({
                username: () => document.querySelector("form [type=email]") as HTMLInputElement,
                storePasswordCheckbox: () => document.querySelector("form .items-center [type=checkbox]") as HTMLInputElement,
                storePasswordCheckboxBlock: () => document.querySelector("form .checkbox.pt.click") as HTMLInputElement,
            });
            logger.verbose(`elements resolved`);

            await fillInputValue(elements.username, login);
            elements.username.readOnly = true;
            logger.verbose(`input values filled`);

            elements.storePasswordCheckbox.checked = false;
            elements.storePasswordCheckbox.disabled = true;
            elements.storePasswordCheckboxBlock.removeEventListener("click", cancelEvenHandler);
            elements.storePasswordCheckboxBlock.addEventListener("click", cancelEvenHandler, true);
            logger.verbose(`"store" checkbox disabled`);

            return null;
        })()),

        login: ({password: passwordValue, login, zoneName}) => from((async () => {
            const logger = curryFunctionMembers(_logger, "login()", zoneName);
            logger.info();

            await endpoints.fillLogin({login, zoneName}).toPromise();
            logger.verbose(`fillLogin() executed`);

            const elements = await waitElements({
                password: () => document.querySelector("form [type=password]") as HTMLInputElement,
                submit: () => document.querySelector("form button") as HTMLElement,
            });
            logger.verbose(`elements resolved`);

            if (elements.password.value) {
                throw new Error(`Password is not supposed to be filled already on "login" stage`);
            }

            await fillInputValue(elements.password, passwordValue);
            logger.verbose(`input values filled`);

            elements.submit.click();
            logger.verbose(`clicked`);

            return null;
        })()),

        login2fa: ({secret, zoneName}) => from((async () => {
            const logger = curryFunctionMembers(_logger, "login2fa()", zoneName);
            logger.info();

            const elements = await waitElements(login2FaWaitElementsConfig);
            logger.verbose(`elements resolved`);

            const spacesLessSecret = secret.replace(/\s/g, "");

            return await submitTotpToken(
                elements.input,
                elements.button,
                () => authenticator.generate(spacesLessSecret),
                logger,
            );
        })()),

        notification: ({entryUrl, zoneName}) => {
            const logger = curryFunctionMembers(_logger, "notification()", zoneName);
            logger.info();

            type LoggedInOutput = Required<Pick<TutanotaNotificationOutput, "loggedIn">>;
            type PageTypeOutput = Required<Pick<TutanotaNotificationOutput, "pageType">>;
            type UnreadOutput = Required<Pick<TutanotaNotificationOutput, "unread">>;
            type BatchEntityUpdatesCounterOutput = Required<Pick<TutanotaNotificationOutput, "batchEntityUpdatesCounter">>;

            // TODO add "entity event batches" listening notification instead of the polling
            // so app reacts to the mails/folders updates instantly

            const observables: [
                Observable<LoggedInOutput>,
                Observable<PageTypeOutput>,
                Observable<UnreadOutput>,
                Observable<BatchEntityUpdatesCounterOutput>
                ] = [
                interval(NOTIFICATION_LOGGED_IN_POLLING_INTERVAL).pipe(
                    map(() => isLoggedIn()),
                    distinctUntilChanged(),
                    map((loggedIn) => ({loggedIn})),
                ),

                // TODO listen for location.href change instead of starting polling interval
                interval(NOTIFICATION_PAGE_TYPE_POLLING_INTERVAL).pipe(
                    concatMap(() => from((async () => {
                        const url = getLocationHref();
                        const pageType: PageTypeOutput["pageType"] = {url, type: "unknown"};
                        const loginUrlDetected = (url === `${entryUrl}/login` || url.startsWith(`${entryUrl}/login?`));

                        if (loginUrlDetected && !isLoggedIn()) {
                            let twoFactorElements;

                            try {
                                twoFactorElements = await waitElements(login2FaWaitElementsConfig, {iterationsLimit: 1});
                            } catch (e) {
                                // NOOP
                            }

                            const twoFactorCodeVisible = twoFactorElements
                                && twoFactorElements.input.offsetParent
                                && twoFactorElements.button.offsetParent;

                            if (twoFactorCodeVisible) {
                                pageType.type = "login2fa";
                            } else {
                                pageType.type = "login";
                            }
                        }

                        return {pageType};
                    })())),
                    distinctUntilChanged(({pageType: prev}, {pageType: curr}) => curr.type === prev.type),
                    tap((value) => logger.verbose(JSON.stringify(value))),
                ),

                // TODO listen for "unread" change instead of starting polling interval
                Observable.create((observer: Subscriber<UnreadOutput>) => {
                    const notifyUnreadValue = async () => {
                        const controller = getUserController();

                        if (!controller || !isLoggedIn() || !navigator.onLine) {
                            return;
                        }

                        const folders = await fetchMailFoldersWithSubFolders(controller.user);
                        const inboxFolder = folders.find(({folderType}) => MailFolderTypeService.testValue(folderType, "inbox"));

                        if (!inboxFolder) {
                            return;
                        }

                        const emails = await fetchEntitiesRange(
                            Rest.Model.MailTypeRef,
                            inboxFolder.mails,
                            {
                                count: 50,
                                reverse: true,
                                start: GENERATED_MAX_ID,
                            },
                        );
                        const unread = emails.reduce((sum, mail) => sum + Number(mail.unread), 0);

                        observer.next({unread});
                    };

                    setInterval(notifyUnreadValue, ONE_SECOND_MS * 60);
                    setTimeout(notifyUnreadValue, ONE_SECOND_MS * 15);
                }).pipe(
                    distinctUntilChanged(({unread: prev}, {unread: curr}) => curr === prev),
                ),

                Observable.create((subscriber: Subscriber<BatchEntityUpdatesCounterOutput>) => {
                    const notification = {batchEntityUpdatesCounter: 0};
                    const {EntityEventController} = webClientApi["src/api/main/EntityEventController"];

                    EntityEventController.prototype.notificationReceived = ((original) => function(
                        this: typeof EntityEventController,
                        entityUpdate: Rest.Model.EntityUpdate,
                    ) {
                        (async () => {
                            const entitiesUpdates = [{events: [entityUpdate]}];
                            const {folders, mails} = await buildBatchEntityUpdatesDbPatch(
                                {entitiesUpdates, _logger: logger},
                                // mocking db model builders, we only need the data structure to be formed at this point
                                // so no need to produce unnecessary fetch requests
                                {mail: async () => null as any, folder: async () => null as any},
                            );

                            if ([folders.remove, folders.upsert, mails.remove, mails.upsert].some(({length}) => Boolean(length))) {
                                notification.batchEntityUpdatesCounter++;
                                subscriber.next(notification);
                            }
                        })().catch((error) => {
                            subscriber.error(error);
                            logger.error(error);
                        });

                        return original.apply(this, arguments);
                    })(EntityEventController.prototype.notificationReceived);
                }),
            ];

            return merge(...observables);
        },
    };

    TUTANOTA_IPC_WEBVIEW_API.registerApi(endpoints);
    _logger.verbose(`api registered, url: ${getLocationHref()}`);
}

async function buildBatchEntityUpdatesDbPatch(
    input: {
        entitiesUpdates: Array<{ events: EntityUpdate[] }>;
        _logger: ReturnType<typeof buildLoggerBundle>;
    },
    dbModelBuilders: {
        mail: (id: { instanceListId: Rest.Model.Id, instanceId: Rest.Model.Id }) => Promise<DatabaseModel.Mail>;
        folder: (id: { instanceListId: Rest.Model.Id, instanceId: Rest.Model.Id }) => Promise<DatabaseModel.Folder>;
    } = {
        mail: async ({instanceListId, instanceId}) => {
            const mail = await Rest.fetchEntity(Rest.Model.MailTypeRef, [instanceListId, instanceId]);
            return await buildDbMail(mail);
        },
        folder: async ({instanceListId, instanceId}) => {
            const folder = await Rest.fetchEntity(Rest.Model.MailFolderTypeRef, [instanceListId, instanceId]);
            return buildDbFolder(folder);
        },
    },
): Promise<BatchEntityUpdatesDbPatch> {
    const logger = curryFunctionMembers(input._logger, "buildBatchEntityUpdatesDbPatch()");
    logger.info();

    const mailsMap: Map<Rest.Model.Mail["_id"][1], Rest.Model.EntityUpdate[]> = new Map();
    const foldersMap: Map<Rest.Model.MailFolder["_id"][1], Rest.Model.EntityUpdate[]> = new Map();

    for (const entitiesUpdate of input.entitiesUpdates) {
        for (const event of entitiesUpdate.events) {
            if (sameRefType(Rest.Model.MailTypeRef, event)) {
                const events = mailsMap.get(event.instanceId) || [];
                events.push(event);
                mailsMap.set(event.instanceId, events);
            } else if (sameRefType(Rest.Model.MailFolderTypeRef, event)) {
                const events = foldersMap.get(event.instanceId) || [];
                events.push(event);
                foldersMap.set(event.instanceId, events);
            }
        }
    }

    logger.verbose(`resolved ${mailsMap.size} unique mails and ${foldersMap.size} unique folders`);

    const databasePatch: BatchEntityUpdatesDbPatch = {
        mails: {remove: [], upsert: []},
        folders: {remove: [], upsert: []},
    };

    for (const {entitiesUpdates, upsert, remove} of [
        {
            entitiesUpdates: mailsMap.values(),
            upsert: async (update: Rest.Model.EntityUpdate) => {
                databasePatch.mails.upsert.push(await dbModelBuilders.mail(update));
            },
            remove: (update: Rest.Model.EntityUpdate) => {
                databasePatch.mails.remove.push({pk: buildPk([update.instanceListId, update.instanceId])});
            },
        },
        {
            entitiesUpdates: foldersMap.values(),
            upsert: async (update: Rest.Model.EntityUpdate) => {
                databasePatch.folders.upsert.push(await dbModelBuilders.folder(update));
            },
            remove: (update: Rest.Model.EntityUpdate) => {
                databasePatch.folders.remove.push({pk: buildPk([update.instanceListId, update.instanceId])});
            },
        },
    ]) {
        for (const entityUpdates of entitiesUpdates) {
            let added = false;
            // entity updates sorted in ASC order, so reversing the entity updates list in order to fetch only the newest entity
            for (const entityUpdate of entityUpdates.reverse()) {
                if (!added && [Rest.Model.OperationType.CREATE, Rest.Model.OperationType.UPDATE].includes(entityUpdate.operation)) {
                    await upsert(entityUpdate);
                    added = true;
                }
                if ([Rest.Model.OperationType.DELETE].includes(entityUpdate.operation)) {
                    remove(entityUpdate);
                    break;
                }
            }
        }
    }

    logger.info(`upsert/remove mails: ${databasePatch.mails.upsert.length}/${databasePatch.mails.remove.length}`);
    logger.info(`upsert/remove folders: ${databasePatch.folders.upsert.length}/${databasePatch.folders.remove.length}`);

    return databasePatch;
}

function getUserController(): { accessToken: string, user: Rest.Model.User } | null {
    return WINDOW.tutao
    && WINDOW.tutao.logins
    && typeof WINDOW.tutao.logins.getUserController === "function"
    && WINDOW.tutao.logins.getUserController() ? WINDOW.tutao.logins.getUserController()
        : null;
}

function isLoggedIn(): boolean {
    const controller = getUserController();
    return !!(controller
        && controller.accessToken
        && controller.accessToken.length
    );
}
