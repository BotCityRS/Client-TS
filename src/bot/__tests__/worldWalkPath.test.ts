import './test-dom-shim.js';
import { afterEach, describe, expect, test } from 'bun:test';
import Timer from '../api/Timer.js';
import { createBotApiForTests, createStubClientState } from '../testSupport/stubBotClient.js';

afterEach(() => {
    Timer.resetSystemTimerForTests();
});

describe('World.walkPath', () => {
    test('resolves false when not ingame', async () => {
        const api = createBotApiForTests(createStubClientState({ ingame: false }));
        const result = await api.world.walkPath([
            [3200, 3200],
            [3205, 3205]
        ]);
        expect(result).toBe(false);
        expect(api.world.hasPath()).toBe(false);
    });

    test('resolves false when player tile is not ready', async () => {
        const state = createStubClientState({ ingame: true });
        state.localPlayer = { routeX: new Int32Array([-1]), routeZ: new Int32Array([-1]), routeLength: 0 } as never;
        const api = createBotApiForTests(state);
        const result = await api.world.walkPath([[3200, 3200]]);
        expect(result).toBe(false);
    });

    test('distanceTo is infinite when player tile is not ready', () => {
        const state = createStubClientState({ ingame: true });
        state.localPlayer = { routeX: new Int32Array([-1]), routeZ: new Int32Array([-1]), routeLength: 0 } as never;
        const api = createBotApiForTests(state);
        expect(api.world.distanceTo(3200, 3200)).toBe(Number.POSITIVE_INFINITY);
    });
});
