import type ClientNpc from '#/dash3d/ClientNpc.js';
import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type { BotLogFn } from '#/bot/BotLog.js';
import type BotAPI from '../BotAPI';
import { assertApi } from '../botApiAssert.js';
import Utility from '../Utility';

function npcAttackMenuOpcode(npc: ClientNpc, localCombatLevel: number | undefined): number | null {
    const t = npc.type;
    if (!t?.op) {
        return null;
    }
    for (let i = 4; i >= 0; i--) {
        if (t.op[i]?.toLowerCase() !== 'attack') {
            continue;
        }
        const slotOpcodes = [MiniMenuAction.OP_NPC1, MiniMenuAction.OP_NPC2, MiniMenuAction.OP_NPC3, MiniMenuAction.OP_NPC4, MiniMenuAction.OP_NPC5];
        const base = slotOpcodes[i] ?? MiniMenuAction.OP_NPC1;
        let priority = 0;
        if (localCombatLevel !== undefined && t.vislevel > localCombatLevel) {
            priority = MiniMenuAction._PRIORITY;
        }
        return priority + base;
    }
    return null;
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
        this.api.doAction(opcode, this.uid, this.npc.routeX[0], this.npc.routeZ[0]);
    }

    interact(optionIndex: number) {
        const logFn = this.botLog();
        assertApi(optionIndex >= 0 && optionIndex <= 4, logFn, 'ClientNPCEntity.interact', 'optionIndex out of range', { optionIndex, uid: this.uid, id: this.id });
        const optionIDs = [728, 6, 963];
        const opcode = optionIDs[optionIndex];
        this.api.bot.log('WARN', 'ClientNPCEntity.interact', 'using legacy opcode triple; verify against MiniMenuAction if interactions fail', {
            optionIndex,
            opcode,
            uid: this.uid,
            id: this.id
        });
        this.api.doAction(opcode, this.uid, this.npc.x, this.npc.z);
    }

    examine() {
        this.api.bot.log('INFO', 'ClientNPCEntity.examine', 'examine', { uid: this.uid, id: this.id });
        this.api.doAction(MiniMenuAction.OP_NPC6, this.uid, this.npc.routeX[0], this.npc.routeZ[0]);
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
