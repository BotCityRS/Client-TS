import { describe, expect, test } from 'bun:test';
import { BOT_NPC_OP_SLOT_TO_MENU } from '../api/base/ClientNPCEntity.js';
import { MiniMenuAction } from '#/client/MiniMenuAction.js';

describe('BOT_NPC_OP_SLOT_TO_MENU', () => {
    test('slot i maps to OP_NPC(i+1) menu ids', () => {
        expect([...BOT_NPC_OP_SLOT_TO_MENU]).toEqual([
            MiniMenuAction.OP_NPC1,
            MiniMenuAction.OP_NPC2,
            MiniMenuAction.OP_NPC3,
            MiniMenuAction.OP_NPC4,
            MiniMenuAction.OP_NPC5
        ]);
    });
});
