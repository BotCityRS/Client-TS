import { describe, expect, test } from 'bun:test';
import {
    BOT_LEGACY_MENU_OPCODE_BOT_USED,
    CLIENT_BOT_LEGACY_MENU_OPCODES_SORTED,
    CLIENT_ONLY_LEGACY_MENU_OPCODES
} from '../botLegacyMenuOpcodes.js';

describe('botLegacyMenuOpcodes', () => {
    test('merged client list is sorted unique union of extras and bot-used', () => {
        const merged = [...new Set([...CLIENT_ONLY_LEGACY_MENU_OPCODES, ...BOT_LEGACY_MENU_OPCODE_BOT_USED])].sort((a, b) => a - b);
        expect([...CLIENT_BOT_LEGACY_MENU_OPCODES_SORTED]).toEqual(merged);
    });

    test('bot-used list is subset of full client list', () => {
        const full = new Set(CLIENT_BOT_LEGACY_MENU_OPCODES_SORTED);
        for (const n of BOT_LEGACY_MENU_OPCODE_BOT_USED) {
            expect(full.has(n)).toBe(true);
        }
    });

    test('client-only extras do not overlap bot-used', () => {
        const bot = new Set(BOT_LEGACY_MENU_OPCODE_BOT_USED);
        for (const n of CLIENT_ONLY_LEGACY_MENU_OPCODES) {
            expect(bot.has(n)).toBe(false);
        }
    });
});
