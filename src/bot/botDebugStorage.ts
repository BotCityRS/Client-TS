export type BotDebugFlags = {
    itemIds: boolean;
    npcIds: boolean;
    worldObjectIds: boolean;
    walkTileCoords: boolean;
};

export const BOT_DEBUG_MODE_STORAGE_KEY = 'bot_debug_mode_enabled';
export const BOT_DEBUG_FLAGS_STORAGE_KEY = 'bot_debug_flags';

const DEFAULT_DEBUG_FLAGS: BotDebugFlags = {
    itemIds: false,
    npcIds: false,
    worldObjectIds: false,
    walkTileCoords: false
};

export function readBotDebugModeEnabled(): boolean {
    try {
        return localStorage.getItem(BOT_DEBUG_MODE_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

export function writeBotDebugModeEnabled(enabled: boolean): void {
    localStorage.setItem(BOT_DEBUG_MODE_STORAGE_KEY, enabled ? 'true' : 'false');
}

export function readStoredBotDebugFlags(): BotDebugFlags {
    try {
        const raw = localStorage.getItem(BOT_DEBUG_FLAGS_STORAGE_KEY);
        if (!raw) {
            return { ...DEFAULT_DEBUG_FLAGS };
        }
        const parsed = JSON.parse(raw) as Partial<BotDebugFlags>;
        return {
            itemIds: parsed.itemIds === true,
            npcIds: parsed.npcIds === true,
            worldObjectIds: parsed.worldObjectIds === true,
            walkTileCoords: parsed.walkTileCoords === true
        };
    } catch {
        return { ...DEFAULT_DEBUG_FLAGS };
    }
}

/** Overlay flags are only active while debug mode is enabled. */
export function readEffectiveBotDebugFlags(): BotDebugFlags {
    if (!readBotDebugModeEnabled()) {
        return { ...DEFAULT_DEBUG_FLAGS };
    }
    return readStoredBotDebugFlags();
}

export function writeStoredBotDebugFlags(flags: BotDebugFlags): void {
    localStorage.setItem(BOT_DEBUG_FLAGS_STORAGE_KEY, JSON.stringify(flags));
}
