import {Arguments, Logger} from "src/shared/types";
import {Endpoints} from "src/shared/api/main";
import {ONE_SECOND_MS} from "src/shared/constants";

const apiClient = __ELECTRON_EXPOSURE__.buildIpcMainClient({options: {timeoutMs: ONE_SECOND_MS * 3}});
const apiMethod = apiClient("log");

type Args = Arguments<Endpoints["log"]>[0];

const callApi = async (level: Args["level"], ...dataArgs: Args["dataArgs"]) => {
    // TODO filter "level" argument by value taken from the main process's logger
    // TODO consider turning args from any to "() => any" and then execute the functions only if "level" is enabled (lazy args resolving)

    setTimeout(async () => {
        try {
            await apiMethod({level, dataArgs}).toPromise();
        } catch (e) {
            console.error(e); // tslint:disable-line:no-console
        }
    });
};

export const LOGGER: Logger = {
    error: callApi.bind(null, "error"),
    warn: callApi.bind(null, "warn"),
    info: callApi.bind(null, "info"),
    verbose: callApi.bind(null, "verbose"),
    debug: callApi.bind(null, "debug"),
    silly: callApi.bind(null, "silly"),
};
