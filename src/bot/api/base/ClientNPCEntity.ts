import type ClientNpc from '#/dash3d/ClientNpc.js';
import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type { BotLogFn } from '#/bot/BotLog.js';
import type BotAPI from '../BotAPI';
import { assertApi } from '../botApiAssert.js';
import Utility from '../Utility';
import type InvInterfaceItem from './InvInterfaceItem';

export type NPCTilePosition = {
    x: number;
    z: number;
    plane: number;
};

export type NPCAnimationState = {
    id: number;
    frame: number;
    delay: number;
    loop: number;
};

export type NPCTarget =
    | { kind: 'npc'; slot: number; raw: number }
    | { kind: 'player'; slot: number; raw: number };

export type NPCHealthBar = {
    current: number;
    total: number;
    percent: number;
};

export type NPCHitmark = {
    slot: number;
    value: number;
    type: number;
    cycle: number;
};

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

    get type() {
        return this.npc.type;
    }

    get name(): string | null {
        return this.type?.name ?? null;
    }

    get description(): string | null {
        return this.type?.desc ?? null;
    }

    get combatLevel(): number {
        return this.type?.vislevel ?? -1;
    }

    get size(): number {
        return this.type?.size ?? this.npc.size ?? 1;
    }

    get ops(): readonly (string | null)[] {
        return this.type?.op ?? [];
    }

    get localX(): number {
        return this.npc.routeX[0] ?? -1;
    }

    get localZ(): number {
        return this.npc.routeZ[0] ?? -1;
    }

    getLocalPosition(): NPCTilePosition {
        return {
            x: this.localX,
            z: this.localZ,
            plane: this.api.surface.currentLevel
        };
    }

    getWorldPosition(): NPCTilePosition {
        const local = this.getLocalPosition();
        return {
            x: local.x >= 0 ? local.x + this.api.surface.sceneBaseTileX : -1,
            z: local.z >= 0 ? local.z + this.api.surface.sceneBaseTileZ : -1,
            plane: local.plane
        };
    }

    getAnimation(): NPCAnimationState {
        return {
            id: this.npc.primaryAnim ?? -1,
            frame: this.npc.primaryAnimFrame ?? -1,
            delay: this.npc.primaryAnimDelay ?? -1,
            loop: this.npc.primaryAnimLoop ?? -1
        };
    }

    getTarget(): NPCTarget | null {
        const raw = this.npc.faceEntity ?? -1;
        if (raw < 0) {
            return null;
        }
        if (raw < 32768) {
            return { kind: 'npc', slot: raw, raw };
        }
        return { kind: 'player', slot: raw - 32768, raw };
    }

    getHealthBar(): NPCHealthBar {
        const current = this.npc.health ?? 0;
        const total = this.npc.totalHealth ?? 0;
        return {
            current,
            total,
            percent: total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0
        };
    }

    getHitmarks(): NPCHitmark[] {
        const hitmarks: NPCHitmark[] = [];
        for (let slot = 0; slot < this.npc.damageValues.length && slot < this.npc.damageTypes.length && slot < this.npc.damageCycles.length; slot++) {
            hitmarks.push({
                slot,
                value: this.npc.damageValues[slot],
                type: this.npc.damageTypes[slot],
                cycle: this.npc.damageCycles[slot]
            });
        }
        return hitmarks;
    }

    isInCombat(): boolean {
        return (this.npc.faceEntity ?? -1) !== -1;
    }

    isStale(): boolean {
        return this.api.surface.npcs[this.uid] !== this.npc;
    }

    private isLiveReference(action: string): boolean {
        const live = this.api.surface.npcs[this.uid];
        if (live === this.npc) {
            return true;
        }
        assertApi(false, this.botLog(), action, 'NPC uid slot no longer matches entity reference', {
            uid: this.uid,
            id: this.id,
            liveId: live?.type?.id ?? null
        });
        return false;
    }

    private opMatches(label: string | null | undefined, needle: string, mode: 'equals' | 'includes'): boolean {
        if (!label) {
            return false;
        }
        const op = label.toLowerCase();
        const want = needle.toLowerCase();
        return mode === 'equals' ? op === want : op.includes(want);
    }

    private interactByOp(needle: string, mode: 'equals' | 'includes', opts?: { includeAttack?: boolean }): boolean {
        const logFn = this.botLog();
        const t = this.npc.type?.op;
        const source = mode === 'equals' ? 'ClientNPCEntity.interactByOpEquals' : 'ClientNPCEntity.interactByOpIncludes';
        if (!t) {
            assertApi(false, logFn, source, 'NPC has no type ops', { uid: this.uid, id: this.id, needle });
            return false;
        }
        if (!this.isLiveReference(source)) {
            return false;
        }
        for (let i = 4; i >= 0; i--) {
            const o = t[i];
            const isAttack = o?.toLowerCase() === 'attack';
            if (isAttack && !opts?.includeAttack) {
                continue;
            }
            if (this.opMatches(o, needle, mode)) {
                const opcode = isAttack
                    ? npcAttackMenuOpcode(this.npc, this.api.surface.localPlayer?.combatLevel)
                    : BOT_NPC_OP_SLOT_TO_MENU[i] ?? MiniMenuAction.OP_NPC1;
                if (opcode == null) {
                    assertApi(false, logFn, source, 'No Attack option opcode on NPC type', { uid: this.uid, id: this.id });
                    return false;
                }
                const { rx, rz } = this.npcInteractParams();
                this.api.bot.log('INFO', source, 'matched', { needle, opSlot: i, opcode, verb: o, uid: this.uid, id: this.id });
                this.api.doAction(opcode, this.uid, rx, rz);
                return true;
            }
        }
        this.api.bot.log('WARN', source, 'no matching op', { needle, uid: this.uid, id: this.id, ops: [...t], includeAttack: opts?.includeAttack === true });
        return false;
    }

    attack(): boolean {
        const logFn = this.botLog();
        if (!this.isLiveReference('ClientNPCEntity.attack')) {
            return false;
        }
        const lp = this.api.surface.localPlayer;
        const opcode = npcAttackMenuOpcode(this.npc, lp?.combatLevel);
        if (opcode == null) {
            assertApi(false, logFn, 'ClientNPCEntity.attack', 'No Attack option on NPC type', { uid: this.uid, id: this.id });
            return false;
        }
        const { rx, rz } = this.npcInteractParams();
        this.api.doAction(opcode, this.uid, rx, rz);
        return true;
    }

    /**
     * Triggers the n-th **non-attack** NPC context option, in the same order as the real client menu
     * (iterates `op[4]` … `op[0]`, skipping null and Attack), using `MiniMenuAction.OP_NPC1` … `OP_NPC5`.
     */
    interact(optionIndex: number): boolean {
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
            return false;
        }
        if (!this.isLiveReference('ClientNPCEntity.interact')) {
            return false;
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
        return true;
    }

    /**
     * Invokes the non-attack NPC op whose label equals `verb` (case-insensitive).
     * Uses the config op slot directly (not context-menu order), so it stays correct when op1/op3
     * gaps reorder entries in the right-click list.
     */
    interactByOpEquals(verb: string, opts?: { includeAttack?: boolean }): boolean {
        return this.interactByOp(verb, 'equals', opts);
    }

    /**
     * Invokes the first non-attack NPC op whose label contains `needle` (case-insensitive).
     * Typical use: `interactByOpIncludes('pickpocket')` or `'steal'`.
     */
    interactByOpIncludes(needle: string, opts?: { includeAttack?: boolean }): boolean {
        return this.interactByOp(needle, 'includes', opts);
    }

    examine(): boolean {
        if (!this.isLiveReference('ClientNPCEntity.examine')) {
            return false;
        }
        this.api.bot.log('INFO', 'ClientNPCEntity.examine', 'examine', { uid: this.uid, id: this.id });
        const { rx, rz } = this.npcInteractParams();
        this.api.doAction(MiniMenuAction.OP_NPC6, this.uid, rx, rz);
        return true;
    }

    useItem(item: InvInterfaceItem): boolean {
        if (!this.isLiveReference('ClientNPCEntity.useItem')) {
            return false;
        }
        return item.useOnNpc(this);
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
