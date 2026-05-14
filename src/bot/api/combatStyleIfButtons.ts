/**
 * Maps combat sidebar root interface ids (from `interface.pack`) to IF_BUTTON
 * component ids in attack-style order: 0 attack, 1 strength, 2 shared, 3 defence.
 * Built from `Server/content/pack/interface.pack` (LostCity combat_* interfaces).
 */
const COMBAT_STYLE_BUTTONS_BY_OVERLAY_ROOT: ReadonlyMap<number, readonly number[]> = new Map([
    [328, [336, 335, 334]], // combat_staff_2 — three styles
    [425, [433, 432, 431]], // combat_blunt
    [776, [782, 785, 784, 783]], // combat_scythe
    [1698, [1704, 1707, 1706, 1705]], // combat_axe
    [1749, [1757, 1756, 1755]], // combat_crossbow
    [1764, [1772, 1771, 1770]], // combat_bow
    [2276, [2282, 2285, 2284, 2283]], // combat_stabsword
    [2423, [2429, 2432, 2431, 2430]], // combat_hacksword
    [3796, [3802, 3805, 3804, 3803]], // combat_spiked
    [4446, [4454, 4453, 4452]], // combat_thrown
    [4679, [4685, 4688, 4687, 4686]], // combat_spear
    [4705, [4711, 4714, 4713, 4712]], // combat_heavysword
    [5570, [5576, 5579, 5578, 5577]], // combat_pickaxe
    [5855, [5860, 5862, 5861]], // combat_unarmed
    [7762, [7768, 7771, 7770, 7769]] // combat_claw
]);

/**
 * @param combatSidebarRoot root interface id from `IF_SETTAB` (e.g. `combat_hacksword`)
 * @param styleIndex 0..3 (clamped to available styles for that weapon)
 */
export function getAttackStyleButtonComIdForRoot(combatSidebarRoot: number, styleIndex: number): number | null {
    if (combatSidebarRoot < 0) {
        return null;
    }
    const row = COMBAT_STYLE_BUTTONS_BY_OVERLAY_ROOT.get(combatSidebarRoot);
    if (!row || row.length === 0) {
        return null;
    }
    const i = Math.max(0, Math.min(styleIndex | 0, row.length - 1));
    return row[i] ?? null;
}

/**
 * Finds the style button for whichever tab slot currently hosts the combat interface.
 * Matches server `Player.isComponentVisible`: the combat root stays registered in a tab
 * even when another tab is selected, so `IF_BUTTON` does not require the combat tab to be active.
 */
export function findAttackStyleButtonComIdFromSidebarSlots(sideOverlayRoots: readonly number[], styleIndex: number): number | null {
    for (let s = 0; s < sideOverlayRoots.length; s++) {
        const root = sideOverlayRoots[s]!;
        if (root < 0) {
            continue;
        }
        const comId = getAttackStyleButtonComIdForRoot(root, styleIndex);
        if (comId !== null) {
            return comId;
        }
    }
    return null;
}
