import type { Client } from "#/client/Client";
import NpcEntity from "#/dash3d/entity/NpcEntity";
import type BotAPI from "../BotAPI";

export default class ClientNPCEntity {
    api: BotAPI;
    uid: number;
    id: number;
    npc: NpcEntity;
    playerDist: number;

    constructor(api: BotAPI, uid: number, npc: NpcEntity) {
        this.api = api;
        this.uid = npc.uid = uid;
        this.id = npc.id = npc.npcType?.id ?? -1;
        this.npc = npc;
        this.playerDist = Number.MAX_SAFE_INTEGER;
    }

    attack() {
        this.api.doAction(542, this.uid, this.npc.x, this.npc.z);
    }

    interact(optionIndex: number) {
        const optionIDs = [728, 6, 963]; //TODO 963 maybe
        this.api.doAction(optionIDs[optionIndex], this.uid, this.npc.x, this.npc.z)
    }

    examine() {
        this.api.doAction(1607, this.uid, this.npc.x, this.npc.z)
    }
}