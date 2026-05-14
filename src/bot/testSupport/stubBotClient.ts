import type { Client } from '#/client/Client.js';
import type Bot from '../Bot.js';
import BotAPI from '../api/BotAPI.js';
import Timer from '../api/Timer.js';

export type MenuDispatch = {
    opcode: number;
    p1: number;
    p2: number;
    p3: number;
};

/** Minimal `Client` surface for `BotScriptingSurface` + `BotAPI.doAction` without canvas. */
export type StubClientState = {
    ingame: boolean;
    menuAction: Int32Array;
    menuParamA: Int32Array;
    menuParamB: Int32Array;
    menuParamC: Int32Array;
    menuOption: (string | null)[];
    menuNumEntries: number;
    npc: unknown[];
    localPlayer: {
        routeX: Int32Array;
        routeZ: Int32Array;
        combatLevel: number;
        faceEntity: number;
        combatCycle: number;
        primaryAnim: number;
        routeLength: number;
    } | null;
    statEffectiveLevel: number[];
    statBaseLevel: number[];
    statXP: number[];
    minusedlevel: number;
    mapBuildBaseX: number;
    mapBuildBaseZ: number;
    dialogInputOpen: boolean;
    redrawChatback: boolean;
    sideOverlayId: number[];
    sideTab: number;
    groundObj: unknown[][][] | null;
    world: null;
    loginUser: string;
    loginPass: string;
    out: { pos: number; pIsaac: (n: number) => void; p4: (n: number) => void };
    idleTimer: number;
    dispatches: MenuDispatch[];
    doAction(this: StubClientState & { doAction(optionId: number): void }, optionId: number): void;
};

function makeGroundObjGrid(): unknown[][][] {
    const g: unknown[][][] = [];
    for (let l = 0; l < 4; l++) {
        g[l] = [];
        for (let x = 0; x < 104; x++) {
            g[l][x] = [];
            for (let z = 0; z < 104; z++) {
                g[l][x][z] = null;
            }
        }
    }
    return g;
}

export function createStubClientState(overrides?: Partial<Omit<StubClientState, 'doAction' | 'dispatches'>>): StubClientState {
    const sideOverlayId = new Array(14).fill(-1);
    const state: StubClientState = {
        ingame: true,
        menuAction: new Int32Array(500),
        menuParamA: new Int32Array(500),
        menuParamB: new Int32Array(500),
        menuParamC: new Int32Array(500),
        menuOption: new Array(500).fill(null),
        menuNumEntries: 0,
        npc: [],
        localPlayer: {
            routeX: new Int32Array(20).fill(32),
            routeZ: new Int32Array(20).fill(32),
            combatLevel: 126,
            faceEntity: -1,
            combatCycle: 0,
            primaryAnim: -1,
            routeLength: 0
        },
        statEffectiveLevel: new Array(25).fill(1),
        statBaseLevel: new Array(25).fill(1),
        statXP: new Array(25).fill(0),
        minusedlevel: 0,
        mapBuildBaseX: 0,
        mapBuildBaseZ: 0,
        dialogInputOpen: false,
        redrawChatback: false,
        sideOverlayId,
        sideTab: 0,
        groundObj: makeGroundObjGrid(),
        world: null,
        loginUser: 'u',
        loginPass: 'p',
        out: {
            pos: 0,
            pIsaac: () => {},
            p4: () => {}
        },
        idleTimer: 0,
        dispatches: [],
        doAction(optionId: number): void {
            if (optionId < 0) {
                return;
            }
            this.dispatches.push({
                opcode: this.menuAction[optionId]!,
                p1: this.menuParamA[optionId]!,
                p2: this.menuParamB[optionId]!,
                p3: this.menuParamC[optionId]!
            });
        }
    };
    Object.assign(state, overrides);
    return state;
}

export function stubClientAsClient(state: StubClientState): Client {
    return state as unknown as Client;
}

export function createStubBotForApiTests(state: StubClientState): Bot {
    return {
        client: stubClientAsClient(state),
        log: () => {}
    } as unknown as Bot;
}

export function createBotApiForTests(state: StubClientState): BotAPI {
    Timer.resetSystemTimerForTests();
    const bot = createStubBotForApiTests(state);
    return new BotAPI(bot);
}

export function lastDispatch(state: StubClientState): MenuDispatch | undefined {
    return state.dispatches[state.dispatches.length - 1];
}
