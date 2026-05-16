import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import Timer from '../api/Timer.js';
import { createBotApiForTests, createStubClientState, stubClientAsClient } from '../testSupport/stubBotClient.js';

beforeEach(() => {
    Timer.resetSystemTimerForTests();
});

afterEach(() => {
    Timer.resetSystemTimerForTests();
});

describe('BotAPI.tryLogin', () => {
    test('attempts login when logged out with credentials', () => {
        const state = createStubClientState({ ingame: false, loginUser: 'tester', loginPass: 'secret' });
        const loginCalls: { u: string; p: string; r: boolean }[] = [];
        const client = stubClientAsClient(state);
        (client as unknown as { login(u: string, p: string, r: boolean): Promise<void> }).login = (u, p, r) => {
            loginCalls.push({ u, p, r });
            return Promise.resolve();
        };

        const api = createBotApiForTests(state);
        api.tryLogin();
        expect(loginCalls).toEqual([{ u: 'tester', p: 'secret', r: true }]);

        api.tryLogin();
        expect(loginCalls.length).toBe(1);
    });

    test('does not login without credentials', () => {
        const state = createStubClientState({ ingame: false, loginUser: '', loginPass: '' });
        const loginCalls: string[] = [];
        const client = stubClientAsClient(state);
        (client as unknown as { login(u: string, p: string, r: boolean): Promise<void> }).login = u => {
            loginCalls.push(u);
            return Promise.resolve();
        };

        const api = createBotApiForTests(state);
        api.tryLogin();
        expect(loginCalls.length).toBe(0);
    });

    test('runs onSuccess when already ingame', () => {
        const state = createStubClientState({ ingame: true });
        const api = createBotApiForTests(state);
        let count = 0;
        api.tryLogin(() => {
            count++;
        });
        expect(count).toBe(1);
        api.tryLogin(() => {
            count++;
        });
        expect(count).toBe(1);
    });
});
