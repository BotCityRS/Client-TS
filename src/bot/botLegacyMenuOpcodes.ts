/**
 * Fork-specific menu action ids used by the bot API but not represented in `MiniMenuAction`.
 * The client merges these with `CLIENT_ONLY_LEGACY_MENU_OPCODES` into `Client._botLegacyMenuOpcodes`.
 */

export const BOT_MENU_BANK_CLOSE = 947;

/** Numeric legacy opcodes invoked from bot API source (sorted unique). */
export const BOT_LEGACY_MENU_OPCODE_BOT_USED: readonly number[] = Object.freeze(
    [...new Set<number>([BOT_MENU_BANK_CLOSE])].sort((a, b) => a - b)
);

/**
 * Legacy menu ids allowlisted only in the client (mouse / other paths), not emitted from bot API modules.
 * Must remain part of the merged `Client._botLegacyMenuOpcodes` set.
 */
export const CLIENT_ONLY_LEGACY_MENU_OPCODES: readonly number[] = [960, 728, 6, 963, 1607] as const;

/** Full sorted unique list for `Client._botLegacyMenuOpcodes`. */
export const CLIENT_BOT_LEGACY_MENU_OPCODES_SORTED: readonly number[] = Object.freeze(
    [...new Set<number>([...CLIENT_ONLY_LEGACY_MENU_OPCODES, ...BOT_LEGACY_MENU_OPCODE_BOT_USED])].sort((a, b) => a - b)
);
