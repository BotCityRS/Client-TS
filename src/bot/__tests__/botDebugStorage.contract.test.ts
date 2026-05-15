import { afterEach, beforeAll, describe, expect, test } from 'bun:test';

beforeAll(() => {
    if (typeof globalThis.localStorage === 'undefined') {
        const store = new Map<string, string>();
        globalThis.localStorage = {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => {
                store.set(key, value);
            },
            removeItem: (key: string) => {
                store.delete(key);
            },
            clear: () => store.clear(),
            key: (index: number) => [...store.keys()][index] ?? null,
            get length() {
                return store.size;
            }
        } as Storage;
    }
});
import {
    BOT_DEBUG_FLAGS_STORAGE_KEY,
    BOT_DEBUG_MODE_STORAGE_KEY,
    readBotDebugModeEnabled,
    readEffectiveBotDebugFlags,
    readStoredBotDebugFlags,
    writeBotDebugModeEnabled,
    writeStoredBotDebugFlags
} from '../botDebugStorage.js';

describe('botDebugStorage', () => {
    afterEach(() => {
        localStorage.removeItem(BOT_DEBUG_MODE_STORAGE_KEY);
        localStorage.removeItem(BOT_DEBUG_FLAGS_STORAGE_KEY);
    });

    test('overlay flags are off when debug mode is disabled', () => {
        writeStoredBotDebugFlags({
            itemIds: true,
            npcIds: true,
            worldObjectIds: true,
            walkTileCoords: true
        });
        writeBotDebugModeEnabled(false);

        expect(readBotDebugModeEnabled()).toBe(false);
        expect(readEffectiveBotDebugFlags()).toEqual({
            itemIds: false,
            npcIds: false,
            worldObjectIds: false,
            walkTileCoords: false
        });
        expect(readStoredBotDebugFlags().itemIds).toBe(true);
    });

    test('overlay flags follow storage when debug mode is enabled', () => {
        writeBotDebugModeEnabled(true);
        writeStoredBotDebugFlags({
            itemIds: true,
            npcIds: false,
            worldObjectIds: true,
            walkTileCoords: false
        });

        expect(readEffectiveBotDebugFlags()).toEqual({
            itemIds: true,
            npcIds: false,
            worldObjectIds: true,
            walkTileCoords: false
        });
    });
});
