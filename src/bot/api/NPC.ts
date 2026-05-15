import ClientNPCEntity from './base/ClientNPCEntity';
import type BotAPI from './BotAPI';
import { assertApi } from './botApiAssert.js';
import Utility from './Utility';

export default class NPC {
    private api: BotAPI;

    constructor(api: BotAPI) {
        this.api = api;
    }

    private log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', source: string, message: string, detail?: unknown): void {
        this.api.bot.log(level, source, message, detail);
    }

    private logFn() {
        return (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', source: string, message: string, detail?: unknown) => this.api.bot.log(level, source, message, detail);
    }

    getAll(): ClientNPCEntity[] {
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

    getAllByIds(ids: number[], includeInCombat: boolean = false): ClientNPCEntity[] {
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

    getNPCByIdsNearest(ids: number[], includeInCombat: boolean = false): ClientNPCEntity | null {
        if (!this.api.isLoggedIn()) {
            return null;
        }
        const allWrappers = this.getAll();
        const npcs: ClientNPCEntity[] = [];
        for (let i = 0; i < allWrappers.length; ++i) {
            const n = allWrappers[i];
            if (Utility.includes(ids, n.id) && (!includeInCombat || n.npc.faceEntity == -1)) {
                npcs.push(n);
            }
        }
        let nearestNPC: ClientNPCEntity | null = null;
        for (let i = 0; i < npcs.length; ++i) {
            if (!nearestNPC || npcs[i].playerDist < nearestNPC.playerDist) {
                nearestNPC = npcs[i];
            }
        }
        if (!nearestNPC && allWrappers.length > 0) {
            assertApi(false, this.logFn(), 'NPC.getNPCByIdsNearest', 'No NPC matched ids (scene has other NPCs)', {
                ids,
                includeInCombat,
                sceneNpcCount: allWrappers.length,
                sceneTypeIdsSample: allWrappers.slice(0, 12).map(n => n.id)
            });
        }
        return nearestNPC;
    }

    getNPCByIdsNearestIf(ids: number[], checkFunc: (npc: ClientNPCEntity) => boolean): ClientNPCEntity | null {
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
