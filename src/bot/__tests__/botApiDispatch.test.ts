import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type ClientNpc from '#/dash3d/ClientNpc.js';
import type LocType from '#/config/LocType.js';
import BankInterfaceItem from '../api/base/BankInterfaceItem.js';
import ClientNPCEntity from '../api/base/ClientNPCEntity.js';
import EquipmentInterfaceItem from '../api/base/EquipmentInterfaceItem.js';
import GroundItemEntity from '../api/base/GroundItemEntity.js';
import InvInterfaceItem from '../api/base/InvInterfaceItem.js';
import WorldObjectEntity from '../api/base/WorldObjectEntity.js';
import { BOT_MENU_BANK_CLOSE } from '../botLegacyMenuOpcodes.js';
import { createBotApiForTests, createStubClientState, lastDispatch } from '../testSupport/stubBotClient.js';

let realSetInterval: typeof setInterval;

beforeAll(() => {
    realSetInterval = globalThis.setInterval;
    globalThis.setInterval = ((_fn: TimerHandler, _ms?: number, ..._args: unknown[]) => {
        return -1 as unknown as ReturnType<typeof setInterval>;
    }) as unknown as typeof setInterval;
});

afterAll(() => {
    globalThis.setInterval = realSetInterval;
});

describe('BotAPI → menu dispatch (stub client)', () => {
    test('player.enableRun uses IF_BUTTON run toggle com 153', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        void api.player.enableRun();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.IF_BUTTON,
            p1: 0,
            p2: 0,
            p3: 153
        });
    });

    test('player.changeAttackStyle(0) uses first matching combat overlay in sidebar slots', () => {
        const state = createStubClientState();
        state.sideOverlayId[0] = 328;
        const api = createBotApiForTests(state);
        api.player.changeAttackStyle(0);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.IF_BUTTON,
            p1: 0,
            p2: 0,
            p3: 336
        });
    });

    test('bank.close uses legacy bank close opcode', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        api.bank.close();
        expect(lastDispatch(state)).toEqual({
            opcode: BOT_MENU_BANK_CLOSE,
            p1: -1,
            p2: -1,
            p3: 5384
        });
    });

    test('InvInterfaceItem.deposit1 uses INV_BUTTON1 (bank deposit-1)', () => {
        const state = createStubClientState();
        state.sideTab = 0;
        state.sideOverlayId[0] = 2005;
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 2006, 3, 995, 5);
        item.deposit1();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.INV_BUTTON1,
            p1: 995,
            p2: 3,
            p3: 2006
        });
    });

    test('BankInterfaceItem.withdraw1 uses INV_BUTTON1 (bank withdraw-1)', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new BankInterfaceItem(api, 5382, 2, 321, 10);
        item.withdraw1();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.INV_BUTTON1,
            p1: 321,
            p2: 2,
            p3: 5382
        });
    });

    test('GroundItemEntity.pickUp uses OP_OBJ3', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const g = new GroundItemEntity(api, 592, 1, 40, 41);
        g.pickUp();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_OBJ3,
            p1: 592,
            p2: 40,
            p3: 41
        });
    });

    test('WorldObjectEntity.interact(0) and examine()', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const loc = {} as LocType;
        const wo = new WorldObjectEntity(api, 1, 12, 14, 999, loc);
        wo.interact(0);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_LOC1,
            p1: 999,
            p2: 999 & 0x7f,
            p3: (999 >> 7) & 0x7f
        });
        wo.examine();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_LOC6,
            p1: 999,
            p2: 999 & 0x7f,
            p3: (999 >> 7) & 0x7f
        });
    });

    test('WorldObjectEntity interacts by loc op label', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const loc = { op: [null, 'Bank', null, null, null] } as LocType;
        const wo = new WorldObjectEntity(api, 2213, 12, 14, 999, loc);
        expect(wo.interactByOpEquals('bank')).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_LOC2,
            p1: 999,
            p2: 999 & 0x7f,
            p3: (999 >> 7) & 0x7f
        });
    });

    test('bank.open can use loc bank op fallbacks', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const loc = { op: [null, 'Bank', null, null, null] } as LocType;
        const wo = new WorldObjectEntity(api, 2213, 12, 14, 999, loc);
        api.worldObject.getNearestByIdPath = () => wo;
        expect(api.bank.open()).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_LOC2,
            p1: 999,
            p2: 999 & 0x7f,
            p3: (999 >> 7) & 0x7f
        });
    });

    test('ClientNPCEntity.examine uses OP_NPC6', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const npcStub = {
            routeX: new Int32Array([8]),
            routeZ: new Int32Array([9]),
            type: { id: 1, op: [null, null, null, null, null], vislevel: 1 }
        } as unknown as ClientNpc;
        const ent = new ClientNPCEntity(api, 2, npcStub);
        ent.examine();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_NPC6,
            p1: 2,
            p2: 8,
            p3: 9
        });
    });

    test('ClientNPCEntity.interact(0) first non-attack op in menu order', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const npcStub = {
            routeX: new Int32Array([1]),
            routeZ: new Int32Array([2]),
            type: { id: 7, op: [null, null, null, null, 'Talk-to'], vislevel: 1 }
        } as unknown as ClientNpc;
        const ent = new ClientNPCEntity(api, 5, npcStub);
        ent.interact(0);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_NPC5,
            p1: 5,
            p2: 1,
            p3: 2
        });
    });

    test('bank.open can use banker NPC bank op fallbacks', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        api.worldObject.getNearestByIdPath = () => null;
        api.worldObject.getNearestById = () => null;
        const npcStub = {
            routeX: new Int32Array([1]),
            routeZ: new Int32Array([2]),
            type: { id: 494, op: [null, null, 'Bank', null, null], vislevel: 1 },
            faceEntity: -1,
            combatCycle: 0
        } as unknown as ClientNpc;
        const ent = new ClientNPCEntity(api, 5, npcStub);
        api.npc.getNPCByIdsNearest = () => ent;
        expect(api.bank.open()).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_NPC3,
            p1: 5,
            p2: 1,
            p3: 2
        });
    });

    test('InvInterfaceItem.drop uses OP_HELD5', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 3214, 0, 123, 1);
        item.drop();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_HELD5,
            p1: 123,
            p2: 0,
            p3: 3214
        });
    });

    test('EquipmentInterfaceItem.unequip uses INV_BUTTON1 when routed through interact', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new EquipmentInterfaceItem(api, 1688, 1, 4151, 1);
        item.unequip();
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.INV_BUTTON1,
            p1: 4151,
            p2: 1,
            p3: 1688
        });
    });
});
