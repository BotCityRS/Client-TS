import { describe, expect, test } from 'bun:test';
import { getAttackStyleButtonComIdForRoot } from '../api/combatStyleIfButtons.js';

describe('getAttackStyleButtonComIdForRoot', () => {
    test('returns null for invalid overlay', () => {
        expect(getAttackStyleButtonComIdForRoot(-1, 0)).toBe(null);
        expect(getAttackStyleButtonComIdForRoot(999999, 0)).toBe(null);
    });

    test('staff overlay (three styles) maps indices 0..2', () => {
        const root = 328;
        expect(getAttackStyleButtonComIdForRoot(root, 0)).toBe(336);
        expect(getAttackStyleButtonComIdForRoot(root, 1)).toBe(335);
        expect(getAttackStyleButtonComIdForRoot(root, 2)).toBe(334);
        expect(getAttackStyleButtonComIdForRoot(root, 99)).toBe(334);
    });

    test('axe overlay (four styles) maps indices 0..3', () => {
        const root = 1698;
        expect(getAttackStyleButtonComIdForRoot(root, 0)).toBe(1704);
        expect(getAttackStyleButtonComIdForRoot(root, 1)).toBe(1707);
        expect(getAttackStyleButtonComIdForRoot(root, 2)).toBe(1706);
        expect(getAttackStyleButtonComIdForRoot(root, 3)).toBe(1705);
        expect(getAttackStyleButtonComIdForRoot(root, 9)).toBe(1705);
    });

    test('unarmed overlay (three styles)', () => {
        const root = 5855;
        expect(getAttackStyleButtonComIdForRoot(root, 0)).toBe(5860);
        expect(getAttackStyleButtonComIdForRoot(root, 1)).toBe(5862);
        expect(getAttackStyleButtonComIdForRoot(root, 2)).toBe(5861);
    });
});
