import {Observable, Subject} from "rxjs";

import {BuildEnvironment} from "webpack-configs/model";
import {Except} from "type-fest";

type Impossible<K extends keyof any> = {
    [P in K]: never;
};

declare global {
    type Arguments<F extends (...x: any[]) => any> =
        F extends (...x: infer A) => any ? A : never;

    type Unpacked<T> =
        T extends Array<infer U1> ? U1 :
            T extends ReadonlyArray<infer U1> ? U1 :
                T extends Promise<infer U2> ? U2 :
                    T extends Observable<infer U3> ? U3 :
                        T extends Subject<infer U3> ? U3 :
                            T;

    type Mutable<T> = { -readonly [K in keyof T]: T[K]; };

    type NoExtraProperties<T, U extends T = T> = U & Impossible<Exclude<keyof U, keyof T>>;

    type Skip<T, K extends keyof T> = Except<T, K>; // eslint-disable-line @typescript-eslint/ban-types

    var BUILD_ENVIRONMENT: BuildEnvironment;
}
