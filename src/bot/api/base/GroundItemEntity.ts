import { MiniMenuAction } from '#/client/MiniMenuAction.js';
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
        // Must match Client ground-object menu: default "Take" and op[2] use OP_OBJ3 → OPOBJ3 / type.op[2] on server.
        this.api.doAction(MiniMenuAction.OP_OBJ3, this.id, this.x, this.z);
    }
}