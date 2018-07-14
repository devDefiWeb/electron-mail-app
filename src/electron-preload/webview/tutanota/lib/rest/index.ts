import {BaseEntity, Id, IdTuple, RequestParams, TypeRef} from "./model/index";
import {Omit} from "src/shared/types";

import * as Model from "./model";
import {resolveWebClientApi} from "src/electron-preload/webview/tutanota/lib/tutanota-api";

export async function fetchEntity<T extends BaseEntity, TypeRefType extends TypeRef<T>>(
    typeRef: TypeRef<T>,
    id: Id<T> | IdTuple<BaseEntity, T>,
): Promise<T> {
    const {load} = (await resolveWebClientApi())["src/api/main/Entity"];
    return load(typeRef, id);
}

export async function fetchEntitiesList<T extends BaseEntity, TypeRefType extends TypeRef<T>>(
    typeRef: TypeRef<T>,
    listId: Id<T>,
): Promise<T[]> {
    const {loadAll} = (await resolveWebClientApi())["src/api/main/Entity"];
    return loadAll(typeRef, listId);
}

export async function fetchEntitiesRange<T extends BaseEntity, TypeRefType extends TypeRef<T>>(
    typeRef: TypeRef<T>,
    listId: Id<T>,
    queryParams: Required<Omit<RequestParams, "ids">>,
): Promise<T[]> {
    const {loadRange} = (await resolveWebClientApi())["src/api/main/Entity"];
    return loadRange(typeRef, listId, queryParams.start, queryParams.count, queryParams.reverse);
}

export {
    Model,
};
