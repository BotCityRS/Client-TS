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
        const _npcs = this.api.surface.npcs;
        const npcs: ClientNPCEntity[] = [];
        for (let i = 0; i < _npcs.length; ++i) {
            const entity = _npcs[i];
            if (entity != null) {
                npcs.push(new ClientNPCEntity(this.api, i, entity));
            }
        }
        return npcs;
    }

    getAllByIds(ids: number[], includeInCombat: boolean = false) {
        if (!this.api.isLoggedIn()) {
            return [];
        }
        const npcs = this.getAll();
        const orderedNPCs: ClientNPCEntity[] = [];
        for (let i = 0; i < npcs.length; ++i) {
            if (npcs[i] && Utility.includes(ids, npcs[i].id) && (!includeInCombat || npcs[i].npc.faceEntity == -1)) {
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
        let nearestNPC: ClientNPCEntity | null = null;
        for (let i = 0; i < npcs.length; ++i) {
            if (!nearestNPC || npcs[i].playerDist < nearestNPC.playerDist) {
                nearestNPC = npcs[i];
            }
        }
        return nearestNPC;
    }

    getNPCByIdsNearestIf(ids: number[], checkFunc: (npc: ClientNPCEntity) => boolean) {
        if (!this.api.isLoggedIn()) {
            return null;
        }
        const npcs = this.getAllByIds(ids, true);
        let nearestNPC: ClientNPCEntity | null = null;
        for (let i = 0; i < npcs.length; ++i) {
            if (checkFunc(npcs[i]) && (!nearestNPC || npcs[i].playerDist < nearestNPC.playerDist)) {
                nearestNPC = npcs[i];
            }
        }
        return nearestNPC;
    }
}
