import { Client } from "#/client/Client";
import ClientNPCEntity from "./base/ClientNPCEntity";
import type BotAPI from "./BotAPI";
import Utility from "./Utility";

export default class NPC {
    private api: BotAPI;

    constructor(api: BotAPI) {
        this.api = api;
    }

    getAll() {
        if (!this.api.isLoggedIn()) {
            return [];
        }
        const _npcs = this.api.client.npcs;
        const npcs: ClientNPCEntity[] = [];
        for (let i = 0; i < _npcs.length; ++i) {
            let entity = _npcs[i];
            if (entity != null) {
                let clientNPC = new ClientNPCEntity(this.api, i, entity);
                npcs.push(clientNPC);
            }
        }
        return npcs;
    }

    getAllByIds(ids: number[], includeInCombat: boolean = false) {
        if (!this.api.isLoggedIn()) {
            return [];
        }
        const npcs = this.getAll();
        let orderedNPCs: ClientNPCEntity[] = [];
        for (let i = 0; i < npcs.length; ++i) {
            if (npcs[i] && Utility.includes(ids, npcs[i].id) && (!includeInCombat || npcs[i].npc.targetId == -1)) {
                orderedNPCs.push(npcs[i]);
            }
        }
        return orderedNPCs;
    }

    getNPCByIdsNearest(ids: number[], includeInCombat: boolean = false) {
        if (!this.api.isLoggedIn()) {
            return null;
        }
        const npcs = this.getAllByIds(ids, includeInCombat);
        let nearestNPC: ClientNPCEntity|null = null;
        for (let i = 0; i < npcs.length; ++i) {
            let dist = Utility.getDistance(this.api.player.x, this.api.player.z, npcs[i].x, npcs[i].z);
            npcs[i].playerDist = dist;
            if (!nearestNPC || dist < nearestNPC.playerDist) {
                nearestNPC = npcs[i];
            }
        }
        return nearestNPC;
    }
}