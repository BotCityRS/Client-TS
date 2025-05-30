import type Entity from "#/dash3d/entity/Entity";

export default class ClientEntity {
    uid: number;
    entity: Entity;

    constructor(uid: number, entity: Entity) {
        this.uid = uid;
        this.entity = entity;
    }
}