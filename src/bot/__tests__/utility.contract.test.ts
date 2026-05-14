import { describe, expect, test } from 'bun:test';
import Utility from '../api/Utility.js';

describe('Utility', () => {
    test('getDistance', () => {
        expect(Utility.getDistance(0, 0, 3, 4)).toBe(5);
        expect(Utility.getDistance(1, 1, 1, 1)).toBe(0);
    });

    test('includes', () => {
        expect(Utility.includes([1, 2, 3], 2)).toBe(true);
        expect(Utility.includes([1, 2, 3], 4)).toBe(false);
    });

    test('includes throws on NaN lookup', () => {
        expect(() => Utility.includes([1], Number.NaN)).toThrow();
    });
});
