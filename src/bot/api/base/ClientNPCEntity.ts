import type ClientNpc from '#/dash3d/ClientNpc.js';
import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type { BotLogFn } from '#/bot/BotLog.js';
import type BotAPI from '../BotAPI';
import { assertApi } from '../botApiAssert.js';
import Utility from '../Utility';

/** Same slot → opcode mapping as `Client.addNpcOptions` for non-attack NPC ops (`op[0]` → OP_NPC1, …). */
export const BOT_NPC_OP_SLOT_TO_MENU: readonly number[] = [
    MiniMenuAction.OP_NPC1,
    MiniMenuAction.OP_NPC2,
    MiniMenuAction.OP_NPC3,
    MiniMenuAction.OP_NPC4,
    MiniMenuAction.OP_NPC5
];

function npcAttackMenuOpcode(npc: ClientNpc, localCombatLevel: number | undefined): number | null {
    const t = npc.type;
    if (!t?.op) {
        return null;
    }
    for (let i = 4; i >= 0; i--) {
        if (t.op[i]?.toLowerCase() !== 'attack') {
            continue;
        }
        const base = BOT_NPC_OP_SLOT_TO_MENU[i] ?? MiniMenuAction.OP_NPC1;
        let priority = 0;
        if (localCombatLevel !== undefined && t.vislevel > localCombatLevel) {
            priority = MiniMenuAction._PRIORITY;
        }
        return priority + base;
    }
    return null;
}

/** Op slots `i` for non-null, non-attack `npc.type.op[i]`, in the same order the client adds them (i = 4 … 0). */
function nonAttackNpcOpSlotsInMenuOrder(npc: ClientNpc): number[] {
    const t = npc.type?.op;
    if (!t) {
        return [];
    }
    const slots: number[] = [];
    for (let i = 4; i >= 0; i--) {
        if (t[i] === null || t[i]?.toLowerCase() === 'attack') {
            continue;
        }
        slots.push(i);
    }
    return slots;
}

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

    private botLog(): BotLogFn | undefined {
        return (level, source, message, detail) => this.api.bot.log(level, source, message, detail);
    }

    private npcInteractParams(): { rx: number; rz: number } {
        return { rx: this.npc.routeX[0], rz: this.npc.routeZ[0] };
    }

    attack() {
        const logFn = this.botLog();
        const live = this.api.surface.npcs[this.uid];
        assertApi(live === this.npc, logFn, 'ClientNPCEntity.attack', 'NPC uid slot no longer matches entity reference', { uid: this.uid, id: this.id });
        const lp = this.api.surface.localPlayer;
        const opcode = npcAttackMenuOpcode(this.npc, lp?.combatLevel);
        if (opcode == null) {
            assertApi(false, logFn, 'ClientNPCEntity.attack', 'No Attack option on NPC type', { uid: this.uid, id: this.id });
            return;
        }
        const { rx, rz } = this.npcInteractParams();
        this.api.doAction(opcode, this.uid, rx, rz);
    }

    /**
     * Triggers the n-th **non-attack** NPC context option, in the same order as the real client menu
     * (iterates `op[4]` … `op[0]`, skipping null and Attack), using `MiniMenuAction.OP_NPC1` … `OP_NPC5`.
     */
    interact(optionIndex: number) {
        const logFn = this.botLog();
        const slots = nonAttackNpcOpSlotsInMenuOrder(this.npc);
        assertApi(optionIndex >= 0, logFn, 'ClientNPCEntity.interact', 'optionIndex must be >= 0', { optionIndex, uid: this.uid, id: this.id });
        assertApi(optionIndex < slots.length, logFn, 'ClientNPCEntity.interact', 'optionIndex out of range for this NPC non-attack ops', {
            optionIndex,
            available: slots.length,
            slots,
            opLabels: slots.map(i => this.npc.type?.op?.[i] ?? '?')
        });
        if (optionIndex < 0 || optionIndex >= slots.length) {
            return;
        }
        const slot = slots[optionIndex]!;
        const opcode = BOT_NPC_OP_SLOT_TO_MENU[slot] ?? MiniMenuAction.OP_NPC1;
        const { rx, rz } = this.npcInteractParams();
        this.api.bot.log('INFO', 'ClientNPCEntity.interact', 'interact', {
            optionIndex,
            opSlot: slot,
            opcode,
            verb: this.npc.type?.op?.[slot],
            uid: this.uid,
            id: this.id
        });
        this.api.doAction(opcode, this.uid, rx, rz);
    }

    /**
     * Invokes the non-attack NPC op whose label equals `verb` (case-insensitive).
     * Uses the config op slot directly (not context-menu order), so it stays correct when op1/op3
     * gaps reorder entries in the right-click list.
     */
    interactByOpEquals(verb: string): boolean {
        const logFn = this.botLog();
        const t = this.npc.type?.op;
        if (!t) {
            assertApi(false, logFn, 'ClientNPCEntity.interactByOpEquals', 'NPC has no type ops', { uid: this.uid, id: this.id, verb });
            return false;
        }
        const want = verb.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const o = t[i];
            if (o === null || o === undefined || o.toLowerCase() === 'attack') {
                continue;
            }
            if (o.toLowerCase() === want) {
                const opcode = BOT_NPC_OP_SLOT_TO_MENU[i] ?? MiniMenuAction.OP_NPC1;
                const { rx, rz } = this.npcInteractParams();
                this.api.bot.log('INFO', 'ClientNPCEntity.interactByOpEquals', 'matched', { verb, opSlot: i, opcode, uid: this.uid, id: this.id });
                this.api.doAction(opcode, this.uid, rx, rz);
                return true;
            }
        }
        this.api.bot.log('WARN', 'ClientNPCEntity.interactByOpEquals', 'no matching op', { verb, uid: this.uid, id: this.id, ops: [...t] });
        return false;
    }

    /**
     * Invokes the first non-attack NPC op whose label contains `needle` (case-insensitive).
     * Typical use: `interactByOpIncludes('pickpocket')` or `'steal'`.
     */
    interactByOpIncludes(needle: string): boolean {
        const logFn = this.botLog();
        const t = this.npc.type?.op;
        if (!t) {
            assertApi(false, logFn, 'ClientNPCEntity.interactByOpIncludes', 'NPC has no type ops', { uid: this.uid, id: this.id, needle });
            return false;
        }
        const lower = needle.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const o = t[i];
            if (o === null || o === undefined || o.toLowerCase() === 'attack') {
                continue;
            }
            if (o.toLowerCase().includes(lower)) {
                const opcode = BOT_NPC_OP_SLOT_TO_MENU[i] ?? MiniMenuAction.OP_NPC1;
                const { rx, rz } = this.npcInteractParams();
                this.api.bot.log('INFO', 'ClientNPCEntity.interactByOpIncludes', 'matched', { needle, opSlot: i, opcode, verb: o, uid: this.uid, id: this.id });
                this.api.doAction(opcode, this.uid, rx, rz);
                return true;
            }
        }
        this.api.bot.log('WARN', 'ClientNPCEntity.interactByOpIncludes', 'no matching op', { needle, uid: this.uid, id: this.id, ops: [...t] });
        return false;
    }

    examine() {
        this.api.bot.log('INFO', 'ClientNPCEntity.examine', 'examine', { uid: this.uid, id: this.id });
        const { rx, rz } = this.npcInteractParams();
        this.api.doAction(MiniMenuAction.OP_NPC6, this.uid, rx, rz);
    }

    isInArea(x1: number, z1: number, x2: number, z2: number) {
        if (x1 > x2 || z1 > z2) {
            throw 'Invalid area.';
        }
        const x = this.npc.routeX[0] + this.api.surface.sceneBaseTileX;
        const z = this.npc.routeZ[0] + this.api.surface.sceneBaseTileZ;
        return x >= x1 && x <= x2 && z >= z1 && z <= z2;
    }
}
