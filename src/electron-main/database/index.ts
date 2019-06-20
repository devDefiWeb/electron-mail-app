import * as FsJsonStore from "fs-json-store";
import _logger from "electron-log";
import asap from "asap-es";
import {BASE64_ENCODING, KEY_BYTES_32} from "fs-json-store-encryption-adapter/lib/private/constants";
import {KeyBasedPreset} from "fs-json-store-encryption-adapter";

import {DATABASE_VERSION} from "./constants";
import {DbAccountPk, FsDb, FsDbAccount, MAIL_FOLDER_TYPE, Mail} from "src/shared/model/database";
import {ReadonlyDeep} from "type-fest";
import {SerializationAdapter} from "./serialization";
import {curryFunctionMembers} from "src/shared/util";
import {hrtimeDuration} from "src/electron-main/util";
import {resolveFsAccountFolders} from "./util";

const logger = curryFunctionMembers(_logger, "[electron-main/database]");

export class Database {
    static buildEmptyDb(): FsDb {
        return {
            version: DATABASE_VERSION,
            accounts: {tutanota: {}, protonmail: {}},
        };
    }

    static buildEmptyAccountMetadata<T extends keyof FsDb["accounts"]>(type: T): FsDbAccount<T>["metadata"] {
        const metadata: { [key in keyof FsDb["accounts"]]: FsDbAccount<key>["metadata"] } = {
            tutanota: {type: "tutanota", groupEntityEventBatchIds: {}},
            protonmail: {type: "protonmail", latestEventId: ""},
        };
        return metadata[type];
    }

    private dbInstance: FsDb = Database.buildEmptyDb();

    private saveToFileQueue = new asap();

    constructor(
        public readonly options: Readonly<{
            file: string;
            encryption: Readonly<{
                keyResolver: () => Promise<string>;
                presetResolver: () => Promise<KeyBasedPreset>;
            }>
        }>,
        public readonly fileFs: FsJsonStore.Model.StoreFs = FsJsonStore.Fs.Fs.fs,
    ) {}

    getVersion(): string {
        return this.dbInstance.version;
    }

    getAccount<TL extends DbAccountPk>({type, login}: TL): FsDbAccount<TL["type"]> | undefined {
        const account = this.dbInstance.accounts[type][login];
        if (!account) {
            return;
        }
        return account as FsDbAccount<TL["type"]>;
    }

    initAccount<TL extends DbAccountPk>({type, login}: TL): FsDbAccount<TL["type"]> {
        const account: FsDbAccount = {
            conversationEntries: Object.create(null),
            mails: Object.create(null),
            folders: Object.create(null),
            contacts: Object.create(null),
            metadata: Database.buildEmptyAccountMetadata(type) as any,
        };

        this.dbInstance.accounts[type][login] = account;

        return account as FsDbAccount<TL["type"]>;
    }

    accountsIterator(): {
        [Symbol.iterator]: () => Iterator<{ account: FsDbAccount; pk: DbAccountPk }>;
    } {
        logger.info("accountsIterator()");

        const accounts = this.dbInstance.accounts;
        const pks = this.getPks();

        let pkPointer = 0;

        return {
            [Symbol.iterator]: () => ({
                next(): IteratorResult<{ account: FsDbAccount; pk: DbAccountPk }> {
                    if (pkPointer >= pks.length) {
                        return {
                            done: true,
                            value: null as any,
                        };
                    }

                    const pk = pks[pkPointer++];
                    const account = accounts[pk.type][pk.login];

                    return {
                        done: false,
                        value: {pk, account},
                    };
                },
            }),
        };
    }

    deleteAccount<TL extends DbAccountPk>({type, login}: TL): void {
        delete this.dbInstance.accounts[type][login];
    }

    async persisted(): Promise<boolean> {
        // TODO get rid of "fs-json-store" use
        return await new FsJsonStore.Store<FsDb>({
            file: this.options.file,
            fs: this.fileFs,
        }).readable();
    }

    async loadFromFile(): Promise<void> {
        logger.info("loadFromFile()");

        if (!(await this.persisted())) {
            throw new Error(`${this.options.file} does not exist`);
        }

        const duration = hrtimeDuration();
        const serializationAdapter = await this.buildSerializationAdapter();

        this.dbInstance = await serializationAdapter.read(
            await this.fileFs.readFile(
                this.options.file,
            ),
        );

        logger.verbose(`loadFromFile().stat: ${JSON.stringify({
            ...this.stat(),
            time: duration.end(),
        })}`);
    }

    async saveToFile(): Promise<void> {
        logger.info("saveToFile()");

        return this.saveToFileQueue.q(async () => {
            const startTime = Date.now();
            const serializationAdapter = await this.buildSerializationAdapter();

            await this.fileFs.writeFileAtomic(
                this.options.file,
                await serializationAdapter.write({
                    ...this.readonlyDbInstance(),
                    version: DATABASE_VERSION,
                }),
            );

            logger.verbose(`saveToFile().stat: ${JSON.stringify({...this.stat(), time: Date.now() - startTime})}`);
        });
    }

    readonlyDbInstance(): ReadonlyDeep<FsDb> {
        return this.dbInstance;
    }

    reset() {
        this.dbInstance = Database.buildEmptyDb();
    }

    stat(): { records: number, conversationEntries: number, mails: number, folders: number, contacts: number } {
        logger.info("stat()");

        const stat = {records: 0, conversationEntries: 0, mails: 0, folders: 0, contacts: 0};

        for (const {account} of this.accountsIterator()) {
            const {conversationEntries, mails, folders, contacts} = this.accountStat(account, true);
            stat.records++;
            stat.conversationEntries += conversationEntries;
            stat.mails += mails;
            stat.folders += folders;
            stat.contacts += contacts;
        }

        return stat;
    }

    accountStat(
        account: FsDbAccount,
        includingSpam: boolean = false,
    ): { conversationEntries: number, mails: number, folders: number; contacts: number; unread: number } {
        const hasSpamEmail: (mail: Mail) => boolean = includingSpam
            ? () => false
            : this.spamFolderTester(account);

        return {
            conversationEntries: Object.keys(account.conversationEntries).length,
            mails: Object.keys(account.mails).length,
            folders: Object.keys(account.folders).length,
            contacts: Object.keys(account.contacts).length,
            unread: Object.values(account.mails).reduce(
                (unread, mail) => hasSpamEmail(mail)
                    ? unread
                    : unread + Number(mail.unread),
                0,
            ),
        };
    }

    private getPks(): DbAccountPk[] {
        const {accounts} = this.dbInstance;

        return (Object.keys(accounts) as Array<keyof typeof accounts>).reduce(
            (keys: DbAccountPk[], type) => {
                for (const login of Object.keys(accounts[type])) {
                    keys.push({type, login});
                }
                return keys;
            },
            [],
        );
    }

    private spamFolderTester(account: FsDbAccount): (mail: Mail) => boolean {
        const folder = resolveFsAccountFolders(account).find(({folderType}) => folderType === MAIL_FOLDER_TYPE.SPAM);
        const mailFolderId = folder && folder.mailFolderId;
        const result: ReturnType<typeof Database.prototype.spamFolderTester> = typeof mailFolderId !== "undefined"
            ? ({mailFolderIds}) => mailFolderIds.includes(mailFolderId)
            : () => false;

        return result;
    }

    private async buildSerializationAdapter(): Promise<SerializationAdapter> {
        const key = Buffer.from(await this.options.encryption.keyResolver(), BASE64_ENCODING);

        if (key.length !== KEY_BYTES_32) {
            throw new Error(`Invalid encryption key length, expected: ${KEY_BYTES_32}, actual: ${key.length}`);
        }

        return new SerializationAdapter({
            key,
            preset: await this.options.encryption.presetResolver(),
        });
    }
}
