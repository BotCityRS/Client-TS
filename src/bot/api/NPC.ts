import ClientNPCEntity from './base/ClientNPCEntity';
import type BotAPI from './BotAPI';
import { assertApi } from './botApiAssert.js';
import Utility from './Utility';

export type NPCNameMatcher = string | RegExp;

export type NPCSearchArea = {
    x1: number;
    z1: number;
    x2: number;
    z2: number;
};

export type NPCSearchOptions = {
    maxDistance?: number;
    area?: NPCSearchArea;
    reachable?: boolean;
    combatState?: 'any' | 'idle' | 'inCombat';
    includeInCombat?: boolean;
    plane?: number;
};

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

    private nameMatches(name: string | null, matcher: NPCNameMatcher): boolean {
        if (!name) {
            return false;
        }
        if (matcher instanceof RegExp) {
            return matcher.test(name);
        }
        return name.toLowerCase() === matcher.toLowerCase();
    }

    private opMatches(npc: ClientNPCEntity, op: string, exact: boolean): boolean {
        const want = op.toLowerCase();
        return npc.ops.some(label => {
            const lower = label?.toLowerCase();
            return exact ? lower === want : lower?.includes(want) === true;
        });
    }

    private combatStateFromOptions(opts?: NPCSearchOptions, includeInCombat?: boolean): 'any' | 'idle' | 'inCombat' {
        if (opts?.combatState) {
            return opts.combatState;
        }
        if (opts?.includeInCombat !== undefined) {
            return opts.includeInCombat ? 'any' : 'idle';
        }
        if (includeInCombat !== undefined) {
            return includeInCombat ? 'any' : 'idle';
        }
        return 'idle';
    }

    private matchesOptions(npc: ClientNPCEntity, opts?: NPCSearchOptions, includeInCombat?: boolean): boolean {
        const combatState = this.combatStateFromOptions(opts, includeInCombat);
        if (combatState === 'idle' && npc.isInCombat()) {
            return false;
        }
        if (combatState === 'inCombat' && !npc.isInCombat()) {
            return false;
        }
        if (opts?.maxDistance !== undefined && npc.playerDist > opts.maxDistance) {
            return false;
        }
        if (opts?.plane !== undefined && npc.getWorldPosition().plane !== opts.plane) {
            return false;
        }
        if (opts?.area && !npc.isInArea(opts.area.x1, opts.area.z1, opts.area.x2, opts.area.z2)) {
            return false;
        }
        if (opts?.reachable) {
            const srcX = this.api.player.getLocalX();
            const srcZ = this.api.player.getLocalZ();
            const pos = npc.getLocalPosition();
            if (this.api.surface.pathfindStepsToTile(srcX, srcZ, pos.x, pos.z) < 0) {
                return false;
            }
        }
        return true;
    }

    private nearest(npcs: ClientNPCEntity[]): ClientNPCEntity | null {
        let nearestNPC: ClientNPCEntity | null = null;
        for (const npc of npcs) {
            if (!nearestNPC || npc.playerDist < nearestNPC.playerDist) {
                nearestNPC = npc;
            }
        }
        return nearestNPC;
    }

    getNearest(predicate: (npc: ClientNPCEntity) => boolean, opts?: NPCSearchOptions): ClientNPCEntity | null {
        if (!this.api.isLoggedIn()) {
            return null;
        }
        return this.nearest(this.getAll().filter(npc => predicate(npc) && this.matchesOptions(npc, opts)));
    }

    getByName(name: NPCNameMatcher, opts?: NPCSearchOptions): ClientNPCEntity[] {
        return this.getAll().filter(npc => this.nameMatches(npc.name, name) && this.matchesOptions(npc, opts));
    }

    getNearestByName(name: NPCNameMatcher, opts?: NPCSearchOptions): ClientNPCEntity | null {
        return this.nearest(this.getByName(name, opts));
    }

    getByOp(op: string, opts?: NPCSearchOptions & { exact?: boolean }): ClientNPCEntity[] {
        return this.getAll().filter(npc => this.opMatches(npc, op, opts?.exact ?? true) && this.matchesOptions(npc, opts));
    }

    getNearestByOp(op: string, opts?: NPCSearchOptions & { exact?: boolean }): ClientNPCEntity | null {
        return this.nearest(this.getByOp(op, opts));
    }

    getAllByIds(ids: number[], includeInCombat: boolean = false): ClientNPCEntity[] {
        if (!this.api.isLoggedIn()) {
            return [];
        }
        const npcs = this.getAll();
        const orderedNPCs: ClientNPCEntity[] = [];
        for (let i = 0; i < npcs.length; ++i) {
            if (npcs[i] && Utility.includes(ids, npcs[i].id) && this.matchesOptions(npcs[i], undefined, includeInCombat)) {
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
            if (Utility.includes(ids, n.id) && this.matchesOptions(n, undefined, includeInCombat)) {
                npcs.push(n);
            }
        }
        const nearestNPC = this.nearest(npcs);
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
        return this.getNearest(npc => Utility.includes(ids, npc.id) && checkFunc(npc));
    }
}
