import type ClientNpc from "#/dash3d/ClientNpc.js";
import type BotAPI from "../BotAPI";
import Utility from "../Utility";

export default class ClientNPCEntity {
    api: BotAPI;
    uid: number;
    id: number;
    npc: ClientNpc;
    playerDist: number;

    constructor(api: BotAPI, uid: number, npc: ClientNpc) {
        this.api = api;
        this.uid = uid;
        this.npc = npc;
        this.id = npc.type?.id ?? -1;
        this.playerDist = Utility.getDistance(api.player.getLocalX(), api.player.getLocalZ(), npc.routeX[0], npc.routeZ[0]);
    }

    attack() {
        this.api.doAction(542, this.uid, this.npc.x, this.npc.z);
    }

    interact(optionIndex: number) {
        const optionIDs = [728, 6, 963];
        this.api.doAction(optionIDs[optionIndex], this.uid, this.npc.x, this.npc.z);
    }

    examine() {
        this.api.doAction(1607, this.uid, this.npc.x, this.npc.z);
    }

    isInArea(x1: number, z1: number, x2: number, z2: number) {
        if (x1 > x2 || z1 > z2) {
            throw "Invalid area.";
        }
        const x = this.npc.routeX[0] + this.api.surface.sceneBaseTileX;
        const z = this.npc.routeZ[0] + this.api.surface.sceneBaseTileZ;
        return x >= x1 && x <= x2 && z >= z1 && z <= z2;
    }
}
