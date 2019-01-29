// tslint:disable-next-line:no-import-zones
import {LogLevel} from "electron-log";

import {LOG_LEVELS} from "src/shared/constants";
import {curryFunctionMembers} from "src/shared/util";

// TODO ban direct "__ELECTRON_EXPOSURE__.buildLoggerBundle" referencing in tslint, but only via "getZoneNameBoundWebLogger" call

type ZoneNameBoundWebLogger = typeof LOGGER & { zoneName: () => string };

const LOGGER = __ELECTRON_EXPOSURE__.buildLoggerBundle("[WEB]");

const formatZoneName = () => `<${Zone.current.name}>`;

export const getZoneNameBoundWebLogger = (...args: string[]): ZoneNameBoundWebLogger => {
    const logger = curryFunctionMembers(LOGGER, ...args);
    const zoneName = formatZoneName;

    for (const level of LOG_LEVELS) {
        logger[level] = ((original) => {
            return function(this: typeof logger) {
                return original.apply(this, [zoneName()].concat(Array.prototype.slice.call(arguments)));
            };
        })(logger[level]);
    }

    return {...logger, zoneName};
};

// TODO consider building own RxJS pipeable operator
export const logActionTypeAndBoundLoggerWithActionType = <P extends object, T extends string>(
    {_logger}: { _logger: ZoneNameBoundWebLogger }, level: LogLevel = "info",
): (pipeInput: { type: string; payload: P }) => { type: string; payload: P } & { logger: ZoneNameBoundWebLogger } => {
    return (aciton) => {
        const logger = curryFunctionMembers(_logger, JSON.stringify({actionType: aciton.type}));

        logger[level]();

        return {
            ...aciton,
            logger,
        };
    };
};
