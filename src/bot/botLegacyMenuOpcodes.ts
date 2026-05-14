/**
 * Fork-specific menu action ids used by the bot API but not represented in `MiniMenuAction`.
 * The client merges these with `CLIENT_ONLY_LEGACY_MENU_OPCODES` into `Client._botLegacyMenuOpcodes`.
 */

export const BOT_MENU_BANK_CLOSE = 947;
export const BOT_MENU_BANK_DEPOSIT_1 = 602;
export const BOT_MENU_BANK_DEPOSIT_X = 415;
export const BOT_MENU_BANK_DEPOSIT_ALL = 892;

/** World object primary interact opcodes by option index (see `WorldObjectEntity.interact`). */
export const BOT_MENU_LOC_OP_0 = 285;
export const BOT_MENU_LOC_OP_1 = 504;
export const BOT_MENU_LOC_OP_2 = 364;
export const BOT_MENU_LOC_OP_3 = 581;
export const BOT_MENU_LOC_OP_4 = 1501;

export const BOT_MENU_LOC_EXAMINE = 1175;

/** Ordered list passed to `doAction` for `interact(optionIndex)`. */
export const BOT_WORLD_OBJECT_LOC_INTERACT_OPCODES: readonly number[] = [
    BOT_MENU_LOC_OP_0,
    BOT_MENU_LOC_OP_1,
    BOT_MENU_LOC_OP_2,
    BOT_MENU_LOC_OP_3,
    BOT_MENU_LOC_OP_4
] as const;

/** Numeric legacy opcodes invoked from bot API source (sorted unique). */
export const BOT_LEGACY_MENU_OPCODE_BOT_USED: readonly number[] = Object.freeze(
    [
        ...new Set<number>([
            BOT_MENU_BANK_CLOSE,
            BOT_MENU_BANK_DEPOSIT_1,
            BOT_MENU_BANK_DEPOSIT_X,
            BOT_MENU_BANK_DEPOSIT_ALL,
            BOT_MENU_LOC_OP_0,
            BOT_MENU_LOC_OP_1,
            BOT_MENU_LOC_OP_2,
            BOT_MENU_LOC_OP_3,
            BOT_MENU_LOC_OP_4,
            BOT_MENU_LOC_EXAMINE
        ])
    ].sort((a, b) => a - b)
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
