import type { Client } from "#/client/Client";
import NpcEntity from "#/dash3d/entity/NpcEntity";
import type BotAPI from "../BotAPI";
import Utility from "../Utility";

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
        this.playerDist = Utility.getDistance(api.player.getLocalX(), api.player.getLocalZ(), npc.routeFlagX[0], npc.routeFlagZ[0]);
    }

    attack() {
        this.api.doAction(542, this.uid, this.npc.x, this.npc.z); // TODO may not be npc.x/z
    }

    interact(optionIndex: number) {
        const optionIDs = [728, 6, 963]; //TODO 963 maybe
        this.api.doAction(optionIDs[optionIndex], this.uid, this.npc.x, this.npc.z) // TODO may not be npc.x/z
    }

    examine() {
        this.api.doAction(1607, this.uid, this.npc.x, this.npc.z) // TODO may not be npc.x/z
    }

    isInArea(x1: number, z1: number, x2: number, z2: number) {
        if (x1 > x2 || z1 > z2) {
            throw "Invalid area.";
        }
        const x = this.npc.routeFlagX[0] + this.api.client.sceneBaseTileX;
        const z = this.npc.routeFlagZ[0] + this.api.client.sceneBaseTileZ;
        return x >= x1 && x <= x2 && z >= z1 && z <= z2;
    }
}