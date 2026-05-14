import type Entity from "#/dash3d/entity/Entity";
import type BotAPI from "../BotAPI";

export default class GroundItemEntity {
    api: BotAPI;
    x: number;
    z: number;
    id: number;
    count: number;
    playerDist: number;

    constructor(api: BotAPI, id: number, count: number, x: number, z: number) {
        this.api = api;
        this.id = id;
        this.count = count;
        this.x = x;
        this.z = z;
        this.playerDist = Number.MAX_SAFE_INTEGER;
    }

    pickUp() {
        this.api.bot.log('INFO', 'GroundItemEntity.pickUp', 'pickUp', { id: this.id, x: this.x, z: this.z });
        this.api.doAction(99, this.id, this.x, this.z);
    }
}