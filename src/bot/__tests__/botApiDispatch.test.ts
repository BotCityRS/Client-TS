import './test-dom-shim.js';
import { beforeAll, afterAll, describe, expect, test } from 'bun:test';
import IfType from '#/config/IfType.js';
import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import ObjType from '#/config/ObjType.js';
import { ClientProt } from '#/io/ClientProt.js';
import ClientObj from '#/dash3d/ClientObj.js';
import type ClientNpc from '#/dash3d/ClientNpc.js';
import LocType from '#/config/LocType.js';
import LinkList from '#/datastruct/LinkList.js';
import BankInterfaceItem from '../api/base/BankInterfaceItem.js';
import ClientNPCEntity from '../api/base/ClientNPCEntity.js';
import EquipmentInterfaceItem from '../api/base/EquipmentInterfaceItem.js';
import GroundItemEntity from '../api/base/GroundItemEntity.js';
import InvInterfaceItem from '../api/base/InvInterfaceItem.js';
import WorldObjectEntity from '../api/base/WorldObjectEntity.js';
import { EQUIPMENT_SLOT_IDS } from '../api/EquipmentSlots.js';
import { BOT_MENU_BANK_CLOSE } from '../botLegacyMenuOpcodes.js';
import { createBotApiForTests, createStubClientState, lastDispatch } from '../testSupport/stubBotClient.js';

let realSetInterval: typeof setInterval;

function groundObjList(...objs: ClientObj[]): LinkList<ClientObj> {
    const list = new LinkList<ClientObj>();
    for (const obj of objs) {
        list.push(obj);
    }
    return list;
}

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

    test('player and world helpers expose position, route, animation, and stats', () => {
        const routeX = new Int32Array(20).fill(0);
        const routeZ = new Int32Array(20).fill(0);
        routeX[0] = 10;
        routeZ[0] = 20;
        routeX[1] = 11;
        routeZ[1] = 21;
        const state = createStubClientState({
            minusedlevel: 1,
            mapBuildBaseX: 3200,
            mapBuildBaseZ: 3300,
            runenergy: 75,
            runweight: 12,
            localPlayer: {
                routeX,
                routeZ,
                combatLevel: 42,
                faceEntity: -1,
                combatCycle: 0,
                primaryAnim: 123,
                primaryAnimFrame: 4,
                primaryAnimDelay: 2,
                primaryAnimLoop: 1,
                routeLength: 1,
                chatMessage: null,
                chatTimer: 0,
                health: 0,
                totalHealth: 0,
                damageValues: new Int32Array(4),
                damageTypes: new Int32Array(4),
                damageCycles: new Int32Array(4)
            },
            statEffectiveLevel: Object.assign(new Array(25).fill(1), { 3: 7 }),
            statBaseLevel: Object.assign(new Array(25).fill(1), { 3: 10 })
        });
        const api = createBotApiForTests(state);

        expect(api.player.getLocalPosition()).toEqual({ x: 10, z: 20, plane: 1 });
        expect(api.player.getWorldPosition()).toEqual({ x: 3210, z: 3320, plane: 1 });
        expect(api.player.getCombatLevel()).toBe(42);
        expect(api.player.getCurrentHP()).toBe(7);
        expect(api.player.getMaxHP()).toBe(10);
        expect(api.player.getHPPercent()).toBe(70);
        expect(api.player.getRunEnergy()).toBe(75);
        expect(api.player.getWeight()).toBe(12);
        expect(api.player.getAnimation()).toEqual({ id: 123, frame: 4, delay: 2, loop: 1 });
        expect(api.player.getRoute()).toEqual([{ x: 10, z: 20, plane: 1 }, { x: 11, z: 21, plane: 1 }]);
        expect(api.player.getDestination()).toEqual({ x: 11, z: 21, plane: 1 });
        expect(api.player.isIdle()).toBe(false);
        expect(api.world.getPlane()).toBe(1);
        expect(api.world.getBase()).toEqual([3200, 3300]);
        expect(api.world.localToWorld(10, 20)).toEqual([3210, 3320]);
        expect(api.world.worldToLocal(3210, 3320)).toEqual([10, 20]);
        expect(api.world.getPlayerWorldPos()).toEqual([3210, 3320]);
        expect(api.world.distanceToWorld(3210, 3320)).toBe(0);
    });

    test('player state reads expose target, overhead text, hitmarks, health, multizone, and membership', () => {
        const state = createStubClientState({
            inMultizone: 1,
            membersAccount: 1
        });
        const player = state.localPlayer!;
        player.faceEntity = 42;
        player.chatMessage = 'Hello world';
        player.chatTimer = 123;
        player.health = 3;
        player.totalHealth = 10;
        player.damageValues = new Int32Array([5, 0, 12, 0]);
        player.damageTypes = new Int32Array([1, 0, 2, 0]);
        player.damageCycles = new Int32Array([70, 0, 85, 0]);
        const api = createBotApiForTests(state);

        expect(api.player.hasTarget()).toBe(true);
        expect(api.player.getTarget()).toEqual({ kind: 'npc', slot: 42, raw: 42 });
        player.faceEntity = 32768 + 7;
        expect(api.player.getTarget()).toEqual({ kind: 'player', slot: 7, raw: 32775 });
        player.faceEntity = -1;
        expect(api.player.getTarget()).toBeNull();
        expect(api.player.getOverheadText()).toBe('Hello world');
        expect(api.player.getChatMessage()).toBe('Hello world');
        expect(api.player.getOverheadTextTicks()).toBe(123);
        expect(api.player.getHealthBar()).toEqual({ current: 3, total: 10, percent: 30 });
        expect(api.player.getHitmarks()).toEqual([
            { slot: 0, value: 5, type: 1, cycle: 70 },
            { slot: 1, value: 0, type: 0, cycle: 0 },
            { slot: 2, value: 12, type: 2, cycle: 85 },
            { slot: 3, value: 0, type: 0, cycle: 0 }
        ]);
        expect(api.player.isInMultiway()).toBe(true);
        expect(api.player.isMembersAccount()).toBe(true);
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

    test('interface helpers expose active roots, component metadata, click dispatch, search, and count dialogs', () => {
        const realList = IfType.list;
        const root = {
            id: 2000,
            layerId: -1,
            type: 0,
            buttonType: 0,
            text: null,
            text2: null,
            buttonText: null,
            hide: false,
            width: 10,
            height: 10,
            linkObjType: null,
            linkObjNumber: null,
            iop: null,
            targetVerb: null,
            targetBase: null,
            targetMask: -1
        } as IfType;
        const child = {
            id: 2001,
            layerId: 2000,
            type: 4,
            buttonType: 1,
            text: 'Make all',
            text2: 'Make one',
            buttonText: 'Select',
            hide: false,
            width: 64,
            height: 32,
            linkObjType: new Int32Array([1512]),
            linkObjNumber: new Int32Array([1]),
            iop: ['Choose', null, null, null, null],
            targetVerb: 'Cast',
            targetBase: 'Spell',
            targetMask: 16
        } as IfType;
        const hidden = { ...child, id: 2002, hide: true, text: 'Hidden', text2: null, buttonText: null, iop: null } as IfType;
        IfType.list = [];
        IfType.list[2000] = root;
        IfType.list[2001] = child;
        IfType.list[2002] = hidden;

        try {
            const state = createStubClientState({
                mainModalId: 2000,
                mainOverlayId: 3000,
                sideModalId: 4000,
                sideTab: 2,
                chatComId: 5000,
                tutComId: 6000,
                dialogInputOpen: true
            });
            state.sideOverlayId[2] = 7000;
            const api = createBotApiForTests(state);
            const component = api.interface.getComponent(2001)!;

            expect(api.interface.activeRootIds()).toEqual([2000, 3000, 4000, 7000, 5000, 6000]);
            expect(api.interface.isOpen(2000)).toBe(true);
            expect(api.interface.isVisible(2001)).toBe(true);
            expect(api.interface.isVisible(2002)).toBe(false);
            expect(component.layerId).toBe(2000);
            expect(component.componentType).toBe(4);
            expect(component.buttonType).toBe(1);
            expect(component.text).toBe('Make all');
            expect(component.alternateText).toBe('Make one');
            expect(component.buttonText).toBe('Select');
            expect(component.hidden).toBe(false);
            expect(component.width).toBe(64);
            expect(component.height).toBe(32);
            expect(component.linkObjType?.[0]).toBe(1512);
            expect(component.linkObjNumber?.[0]).toBe(1);
            expect(component.ops[0]).toBe('Choose');
            expect(component.targetVerb).toBe('Cast');
            expect(component.targetBase).toBe('Spell');
            expect(component.targetMask).toBe(16);
            expect(api.interface.findComponentsByText('make').map(c => c.id)).toEqual([2001]);
            expect(api.interface.findComponentsByOp('choose', true).map(c => c.id)).toEqual([2001]);

            expect(component.click()).toBe(true);
            expect(lastDispatch(state)).toEqual({
                opcode: MiniMenuAction.IF_BUTTON,
                p1: 0,
                p2: 0,
                p3: 2001
            });
            expect(component.clickByOp('Choose')).toBe(true);
            expect(component.clickByOp('Missing')).toBe(false);
            expect(api.interface.clickComponent(9999)).toBe(false);

            expect(api.interface.submitCountDialog(42.8)).toBe(true);
            expect(state.outWrites).toEqual([
                { method: 'pIsaac', value: ClientProt.RESUME_P_COUNTDIALOG },
                { method: 'p4', value: 42 }
            ]);
            expect(state.dialogInputOpen).toBe(false);
            expect(state.redrawChatback).toBe(true);
            expect(api.interface.submitCountDialog(1)).toBe(false);
        } finally {
            IfType.list = realList;
        }
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

    test('WorldObjectEntity exposes metadata, positions, shape, angle, distance, and reachability', () => {
        const realLocList = LocType.list;
        const locListHolder = LocType as unknown as { list: (id: number) => LocType };
        locListHolder.list = (() => ({
            width: 1,
            length: 1,
            forceapproach: 0
        }) as LocType);
        const state = createStubClientState({
            minusedlevel: 2,
            mapBuildBaseX: 3200,
            mapBuildBaseZ: 3300,
            world: {
                typeCode2: () => (2 | (1 << 6))
            } as never
        });
        (state as unknown as {
            pathfindSteps: (
                srcX: number,
                srcZ: number,
                dx: number,
                dz: number,
                tryNearest: boolean,
                locWidth: number,
                locLength: number,
                locAngle: number,
                locShape: number,
                forceapproach: number
            ) => number;
        }).pathfindSteps = () => 5;
        const api = createBotApiForTests(state);
        const loc = {
            name: 'Bank booth',
            desc: 'A sturdy bank booth.',
            op: [null, 'Bank', null, null, null],
            width: 2,
            length: 1
        } as LocType;
        const wo = new WorldObjectEntity(api, 2213, 12, 14, 999, loc);

        try {
            expect(wo.name).toBe('Bank booth');
            expect(wo.description).toBe('A sturdy bank booth.');
            expect(wo.ops[1]).toBe('Bank');
            expect(wo.shape).toBe(2);
            expect(wo.angle).toBe(1);
            expect(wo.width).toBe(2);
            expect(wo.length).toBe(1);
            expect(wo.plane).toBe(2);
            expect(wo.getLocalPosition()).toEqual({ x: 12, z: 14, plane: 2 });
            expect(wo.getWorldPosition()).toEqual({ x: 3212, z: 3314, plane: 2 });
            expect(wo.distance()).toBeCloseTo(26.907);
            expect(wo.pathfindSteps()).toBe(5);
            expect(wo.isReachable(5)).toBe(true);
            expect(wo.isReachable(4)).toBe(false);
        } finally {
            locListHolder.list = realLocList;
        }
    });

    test('WorldObject search helpers support names, ops, tile lookups, nearest filters, and reachability', () => {
        const realLocList = LocType.list;
        const locListHolder = LocType as unknown as { list: (id: number) => LocType };
        locListHolder.list = (() => ({
            width: 1,
            length: 1,
            forceapproach: 0
        }) as LocType);
        const state = createStubClientState({
            minusedlevel: 1,
            mapBuildBaseX: 3200,
            mapBuildBaseZ: 3300,
            world: {
                typeCode2: () => 2
            } as never
        });
        (state as unknown as {
            pathfindSteps: (
                srcX: number,
                srcZ: number,
                dx: number,
                dz: number,
                tryNearest: boolean,
                locWidth: number,
                locLength: number,
                locAngle: number,
                locShape: number,
                forceapproach: number
            ) => number;
        }).pathfindSteps = (_srcX, _srcZ, dx) => dx === 15 ? -1 : 4;
        const api = createBotApiForTests(state);
        const bank = new WorldObjectEntity(api, 2213, 4, 5, 1001, {
            name: 'Bank booth',
            op: [null, 'Bank', null, null, null],
            width: 1,
            length: 1
        } as LocType);
        const door = new WorldObjectEntity(api, 1530, 8, 9, 1002, {
            name: 'Door',
            op: ['Open', null, null, null, null],
            width: 1,
            length: 1
        } as LocType);
        const farTree = new WorldObjectEntity(api, 1276, 15, 16, 1003, {
            name: 'Tree',
            op: ['Chop down', null, null, null, null],
            width: 1,
            length: 1
        } as LocType);
        api.worldObject.getAll = () => [bank, door, farTree];

        try {
            expect(api.worldObject.getByName('Door').map(wo => wo.id)).toEqual([1530]);
            expect(api.worldObject.getNearestByName(/bank/i)?.id).toBe(2213);
            expect(api.worldObject.getByOp('Bank').map(wo => wo.id)).toEqual([2213]);
            expect(api.worldObject.getNearestByOp('chop', { exact: false })?.id).toBe(1276);
            expect(api.worldObject.getAt(3208, 3309, [1530]).map(wo => wo.id)).toEqual([1530]);
            expect(api.worldObject.getNear(3206, 3307, 4).map(wo => wo.id)).toEqual([2213, 1530]);
            expect(api.worldObject.getNearest(wo => wo.name === 'Tree', { reachable: true })).toBeNull();
            expect(api.worldObject.getNearest(wo => wo.id === 1530, { area: { x1: 3200, z1: 3300, x2: 3210, z2: 3310 }, plane: 1 })?.id).toBe(1530);
        } finally {
            locListHolder.list = realLocList;
        }
    });

    test('WorldObjectEntity blocks stale typecode interactions', () => {
        let live = true;
        const state = createStubClientState({
            minusedlevel: 0,
            world: {
                typeCode2: () => live ? 2 : -1
            } as never
        });
        const api = createBotApiForTests(state);
        const wo = new WorldObjectEntity(api, 2213, 12, 14, 999, { op: [null, 'Bank', null, null, null] } as LocType);

        expect(wo.interactByOpEquals('Bank')).toBe(true);
        expect(state.dispatches).toHaveLength(1);

        live = false;
        expect(wo.interact(0)).toBe(false);
        expect(wo.examine()).toBe(false);
        expect(wo.useItem(new InvInterfaceItem(api, 3214, 0, 995, 1))).toBe(false);
        expect(wo.isStale()).toBe(true);
        expect(state.dispatches).toHaveLength(1);
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
        state.npc[2] = npcStub;
        const ent = new ClientNPCEntity(api, 2, npcStub);
        expect(ent.examine()).toBe(true);
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
        state.npc[5] = npcStub;
        const ent = new ClientNPCEntity(api, 5, npcStub);
        expect(ent.interact(0)).toBe(true);
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
        state.npc[5] = npcStub;
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

    test('ClientNPCEntity exposes metadata, positions, animation, target, health, and hitmarks', () => {
        const state = createStubClientState({
            minusedlevel: 2,
            mapBuildBaseX: 3200,
            mapBuildBaseZ: 3300
        });
        const api = createBotApiForTests(state);
        const npcStub = {
            routeX: new Int32Array([10, 11]),
            routeZ: new Int32Array([20, 21]),
            routeLength: 1,
            primaryAnim: 123,
            primaryAnimFrame: 4,
            primaryAnimDelay: 2,
            primaryAnimLoop: 1,
            faceEntity: 32768 + 3,
            health: 7,
            totalHealth: 10,
            damageValues: new Int32Array([3, 0, 8, 0]),
            damageTypes: new Int32Array([1, 0, 2, 0]),
            damageCycles: new Int32Array([70, 0, 85, 0]),
            type: {
                id: 494,
                name: 'Banker',
                desc: 'A helpful banker.',
                size: 1,
                op: [null, null, 'Bank', null, 'Talk-to'],
                vislevel: 5
            }
        } as unknown as ClientNpc;
        state.npc[5] = npcStub;

        const ent = new ClientNPCEntity(api, 5, npcStub);
        expect(ent.id).toBe(494);
        expect(ent.name).toBe('Banker');
        expect(ent.description).toBe('A helpful banker.');
        expect(ent.combatLevel).toBe(5);
        expect(ent.size).toBe(1);
        expect(ent.ops[2]).toBe('Bank');
        expect(ent.localX).toBe(10);
        expect(ent.localZ).toBe(20);
        expect(ent.getLocalPosition()).toEqual({ x: 10, z: 20, plane: 2 });
        expect(ent.getWorldPosition()).toEqual({ x: 3210, z: 3320, plane: 2 });
        expect(ent.getAnimation()).toEqual({ id: 123, frame: 4, delay: 2, loop: 1 });
        expect(ent.getTarget()).toEqual({ kind: 'player', slot: 3, raw: 32771 });
        expect(ent.getHealthBar()).toEqual({ current: 7, total: 10, percent: 70 });
        expect(ent.getHitmarks()).toEqual([
            { slot: 0, value: 3, type: 1, cycle: 70 },
            { slot: 1, value: 0, type: 0, cycle: 0 },
            { slot: 2, value: 8, type: 2, cycle: 85 },
            { slot: 3, value: 0, type: 0, cycle: 0 }
        ]);
    });

    test('NPC search helpers support names, ops, nearest filters, and corrected combat filtering', () => {
        const state = createStubClientState({
            minusedlevel: 1,
            mapBuildBaseX: 3200,
            mapBuildBaseZ: 3300,
            world: {} as never
        });
        (state as unknown as {
            pathfindSteps: (
                srcX: number,
                srcZ: number,
                dx: number,
                dz: number,
                tryNearest: boolean,
                locWidth: number,
                locLength: number,
                locAngle: number,
                locShape: number,
                forceapproach: number
            ) => number;
        }).pathfindSteps = (_srcX, _srcZ, dx) => dx === 13 ? -1 : 4;
        const banker = {
            routeX: new Int32Array([4]),
            routeZ: new Int32Array([5]),
            faceEntity: -1,
            type: { id: 494, name: 'Banker', op: [null, null, 'Bank', null, 'Talk-to'], vislevel: 1 }
        } as unknown as ClientNpc;
        const busyBanker = {
            routeX: new Int32Array([6]),
            routeZ: new Int32Array([7]),
            faceEntity: 32768,
            type: { id: 495, name: 'Banker', op: [null, null, 'Bank', null, 'Talk-to'], vislevel: 1 }
        } as unknown as ClientNpc;
        const man = {
            routeX: new Int32Array([13]),
            routeZ: new Int32Array([14]),
            faceEntity: -1,
            type: { id: 1, name: 'Man', op: ['Attack', null, null, null, 'Talk-to'], vislevel: 2 }
        } as unknown as ClientNpc;
        state.npc[1] = banker;
        state.npc[2] = busyBanker;
        state.npc[3] = man;

        const api = createBotApiForTests(state);

        expect(api.npc.getByName('Banker').map(npc => npc.uid)).toEqual([1]);
        expect(api.npc.getByName('Banker', { includeInCombat: true }).map(npc => npc.uid)).toEqual([1, 2]);
        expect(api.npc.getNearestByName(/bank/i, { includeInCombat: true })?.uid).toBe(2);
        expect(api.npc.getByOp('Bank').map(npc => npc.uid)).toEqual([1]);
        expect(api.npc.getNearestByOp('talk', { exact: false, includeInCombat: true })?.uid).toBe(3);
        expect(api.npc.getNearest(npc => npc.name === 'Man', { maxDistance: 100, area: { x1: 3210, z1: 3310, x2: 3220, z2: 3320 }, plane: 1 })?.uid).toBe(3);
        expect(api.npc.getNearest(npc => npc.name === 'Man', { reachable: true })).toBeNull();
        expect(api.npc.getAllByIds([494, 495], false).map(npc => npc.uid)).toEqual([1]);
        expect(api.npc.getAllByIds([494, 495], true).map(npc => npc.uid)).toEqual([1, 2]);
    });

    test('ClientNPCEntity blocks stale interactions and only includes Attack when requested by op', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const npcStub = {
            routeX: new Int32Array([1]),
            routeZ: new Int32Array([2]),
            faceEntity: -1,
            type: { id: 7, op: ['Attack', null, null, null, 'Talk-to'], vislevel: 1 }
        } as unknown as ClientNpc;
        state.npc[5] = npcStub;
        const ent = new ClientNPCEntity(api, 5, npcStub);

        expect(ent.interactByOpEquals('Attack')).toBe(false);
        expect(ent.interactByOpEquals('Attack', { includeAttack: true })).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_NPC1,
            p1: 5,
            p2: 1,
            p3: 2
        });

        state.npc[5] = null;
        expect(ent.interact(0)).toBe(false);
        expect(ent.attack()).toBe(false);
        expect(ent.examine()).toBe(false);
        expect(state.dispatches).toHaveLength(1);
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

    test('InvInterfaceItem.interact supports held ops 4 and 5', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 3214, 6, 1511, 1);
        expect(item.interact(3)).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_HELD4,
            p1: 1511,
            p2: 6,
            p3: 3214
        });
        expect(item.interact(4)).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_HELD5,
            p1: 1511,
            p2: 6,
            p3: 3214
        });
    });

    test('InvInterfaceItem.use selects held item', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 3214, 2, 946, 1);
        expect(item.use()).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.USEHELD_START,
            p1: 946,
            p2: 2,
            p3: 3214
        });
    });

    test('InvInterfaceItem.useOnItem dispatches item-on-item after selecting source', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const knife = new InvInterfaceItem(api, 3214, 2, 946, 1);
        const logs = new InvInterfaceItem(api, 3214, 5, 1511, 1);
        expect(knife.useOnItem(logs)).toBe(true);
        expect(state.dispatches).toEqual([
            {
                opcode: MiniMenuAction.USEHELD_START,
                p1: 946,
                p2: 2,
                p3: 3214
            },
            {
                opcode: MiniMenuAction.USEHELD_ONHELD,
                p1: 1511,
                p2: 5,
                p3: 3214
            }
        ]);
    });

    test('InvInterfaceItem.useOnObject dispatches item-on-loc', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 3214, 1, 1779, 1);
        const loc = {} as LocType;
        const wo = new WorldObjectEntity(api, 2644, 12, 14, 999, loc);
        expect(item.useOnObject(wo)).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.USEHELD_ONLOC,
            p1: 999,
            p2: 999 & 0x7f,
            p3: (999 >> 7) & 0x7f
        });
    });

    test('WorldObjectEntity.useItem delegates item-on-loc', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 3214, 1, 1779, 1);
        const loc = {} as LocType;
        const wo = new WorldObjectEntity(api, 2644, 12, 14, 999, loc);
        expect(wo.useItem(item)).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.USEHELD_ONLOC,
            p1: 999,
            p2: 999 & 0x7f,
            p3: (999 >> 7) & 0x7f
        });
    });

    test('ClientNPCEntity.useItem dispatches item-on-npc', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 3214, 1, 995, 1);
        const npcStub = {
            routeX: new Int32Array([8]),
            routeZ: new Int32Array([9]),
            type: { id: 1, op: [null, null, null, null, null], vislevel: 1 }
        } as unknown as ClientNpc;
        state.npc[2] = npcStub;
        const ent = new ClientNPCEntity(api, 2, npcStub);
        expect(ent.useItem(item)).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.USEHELD_ONNPC,
            p1: 2,
            p2: 8,
            p3: 9
        });
    });

    test('GroundItemEntity generic interact, examine, and useItem dispatch expected actions', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new InvInterfaceItem(api, 3214, 1, 995, 1);
        const ground = new GroundItemEntity(api, 592, 1, 40, 41);

        expect(ground.interact(4)).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_OBJ5,
            p1: 592,
            p2: 40,
            p3: 41
        });

        expect(ground.examine()).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.OP_OBJ6,
            p1: 592,
            p2: 40,
            p3: 41
        });

        expect(ground.useItem(item)).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.USEHELD_ONOBJ,
            p1: 592,
            p2: 40,
            p3: 41
        });
    });

    test('GroundItem API exposes getAll alias, metadata, positions, stack fields, and searches', () => {
        const realObjList = ObjType.list;
        const objListHolder = ObjType as unknown as { list: (id: number) => ObjType };
        objListHolder.list = ((id: number) => ({
            id,
            name: id === 995 ? 'Coins' : `item-${id}`,
            desc: `desc-${id}`,
            iop: [],
            op: [null, null, 'Take', null, id === 995 ? 'Examine' : null],
            stackable: id === 995,
            members: id === 201,
            manwear: -1,
            manwear2: -1,
            manwear3: -1,
            womanwear: -1,
            womanwear2: -1,
            womanwear3: -1
        }) as unknown as ObjType);
        const state = createStubClientState({
            minusedlevel: 1,
            mapBuildBaseX: 3200,
            mapBuildBaseZ: 3300,
            world: {} as never
        });
        (state as unknown as {
            pathfindSteps: (
                srcX: number,
                srcZ: number,
                dx: number,
                dz: number,
                tryNearest: boolean,
                locWidth: number,
                locLength: number,
                locAngle: number,
                locShape: number,
                forceapproach: number
            ) => number;
        }).pathfindSteps = (_srcX, _srcZ, dx) => dx === 35 ? -1 : 3;
        const groundGrid = state.groundObj as unknown as (LinkList<ClientObj> | null)[][][];
        groundGrid[1]![0]![0] = groundObjList(new ClientObj(995, 100));
        groundGrid[1]![33]![33] = groundObjList(new ClientObj(995, 10));
        groundGrid[1]![35]![35] = groundObjList(new ClientObj(201, 1));

        try {
            const api = createBotApiForTests(state);
            const coins = api.groundItem.getNearestByName('Coins')!;

            expect(api.groundItem.getAll()).toHaveLength(3);
            expect(api.groundItem.getGroundItems()).toHaveLength(3);
            expect(coins.name).toBe('Coins');
            expect(coins.description).toBe('desc-995');
            expect(coins.groundOps[2]).toBe('Take');
            expect(coins.stackable).toBe(true);
            expect(coins.members).toBe(false);
            expect(coins.count).toBe(10);
            expect(coins.getLocalPosition()).toEqual({ x: 33, z: 33, plane: 1 });
            expect(coins.getWorldPosition()).toEqual({ x: 3233, z: 3333, plane: 1 });
            expect(coins.distance()).toBeCloseTo(1.414);
            expect(coins.pathfindSteps()).toBe(3);
            expect(coins.isReachable(3)).toBe(true);

            expect(api.groundItem.getGroundItemsById([995]).map(item => item.count)).toEqual([100, 10]);
            expect(api.groundItem.getNearestGroundItemById([995], 5)?.count).toBe(10);
            expect(api.groundItem.getByName(/coin/i, { minCount: 50 }).map(item => item.count)).toEqual([100]);
            expect(api.groundItem.getByOp('take', { ids: [201] }).map(item => item.id)).toEqual([201]);
            expect(api.groundItem.getNearestByOp('exam', { exact: false })?.id).toBe(995);
            expect(api.groundItem.getNearest(item => item.id === 201, { reachable: true })).toBeNull();
            expect(api.groundItem.getNearest(item => item.id === 201, { area: { x1: 3230, z1: 3330, x2: 3240, z2: 3340 }, plane: 1 })?.id).toBe(201);
        } finally {
            objListHolder.list = realObjList;
        }
    });

    test('GroundItemEntity blocks stale API-created ground item interactions', () => {
        const state = createStubClientState();
        const obj = new ClientObj(995, 1);
        const groundGrid = state.groundObj as unknown as (LinkList<ClientObj> | null)[][][];
        groundGrid[0]![40]![41] = groundObjList(obj);
        const api = createBotApiForTests(state);
        const ground = api.groundItem.getGroundItemsById([995])[0]!;

        expect(ground.pickUp()).toBe(true);
        expect(state.dispatches).toHaveLength(1);

        groundGrid[0]![40]![41] = null;
        expect(ground.interact(2)).toBe(false);
        expect(ground.examine()).toBe(false);
        expect(ground.useItem(new InvInterfaceItem(api, 3214, 0, 995, 1))).toBe(false);
        expect(ground.isStale()).toBe(true);
        expect(state.dispatches).toHaveLength(1);
    });

    test('Inventory container helpers expose item lists, counts, metadata, and convenience actions', () => {
        const realObjList = ObjType.list;
        const realInterface = IfType.list[3214];
        const objListHolder = ObjType as unknown as { list: (id: number) => ObjType };
        objListHolder.list = ((id: number) => ({
            id,
            name: `item-${id}`,
            desc: `desc-${id}`,
            iop: ['Use', 'Wield', null, null, 'Drop'],
            op: [null, null, 'Take', null, null],
            stackable: id === 201,
            members: id === 201,
            manwear: id === 100 ? 1 : -1,
            manwear2: -1,
            manwear3: -1,
            womanwear: -1,
            womanwear2: -1,
            womanwear3: -1
        }) as ObjType);
        IfType.list[3214] = {
            linkObjType: new Int32Array([101, 0, 202, 101]),
            linkObjNumber: new Int32Array([2, 0, 5, 3])
        } as IfType;

        try {
            const state = createStubClientState();
            const api = createBotApiForTests(state);

            expect(api.inventory.getItems().map(item => item.slot)).toEqual([0, 2, 3]);
            expect(api.inventory.getEmptySlots()).toEqual([1]);
            expect(api.inventory.getFreeSlotCount()).toBe(1);
            expect(api.inventory.isEmpty()).toBe(false);
            expect(api.inventory.count(100)).toBe(5);
            expect(api.inventory.countAll([100, 201])).toBe(10);
            expect(api.inventory.find(item => item.id === 201)?.slot).toBe(2);
            expect(api.inventory.findAll(item => item.id === 100).map(item => item.count)).toEqual([2, 3]);
            expect(api.inventory.getAllById([100]).map(item => item.slot)).toEqual([0, 3]);
            expect(api.inventory.getFirstByIds([201])?.name).toBe('item-201');

            const equipable = api.inventory.getItemById(100)!;
            expect(equipable.description).toBe('desc-100');
            expect(equipable.inventoryOps[0]).toBe('Use');
            expect(equipable.groundOps[2]).toBe('Take');
            expect(equipable.equipable).toBe(true);
            expect(api.inventory.getItemById(201)?.stackable).toBe(true);
            expect(api.inventory.getItemById(201)?.members).toBe(true);

            expect(api.inventory.useById(100)).toBe(true);
            expect(lastDispatch(state)).toEqual({
                opcode: MiniMenuAction.USEHELD_START,
                p1: 100,
                p2: 0,
                p3: 3214
            });

            expect(api.inventory.dropAll([100])).toBe(2);
            expect(state.dispatches.slice(-2)).toEqual([
                {
                    opcode: MiniMenuAction.OP_HELD5,
                    p1: 100,
                    p2: 0,
                    p3: 3214
                },
                {
                    opcode: MiniMenuAction.OP_HELD5,
                    p1: 100,
                    p2: 3,
                    p3: 3214
                }
            ]);
        } finally {
            objListHolder.list = realObjList;
            IfType.list[3214] = realInterface;
        }
    });

    test('Equipment exposes slot metadata and name-based lookups', () => {
        const realObjList = ObjType.list;
        const realInterface = IfType.list[1688];
        const objListHolder = ObjType as unknown as { list: (id: number) => ObjType };
        objListHolder.list = ((id: number) => ({
            id,
            name: `item-${id}`,
            desc: null,
            iop: [],
            op: [],
            stackable: false,
            members: false,
            manwear: -1,
            manwear2: -1,
            manwear3: -1,
            womanwear: -1,
            womanwear2: -1,
            womanwear3: -1
        }) as unknown as ObjType);
        const linkObjType = new Int32Array(14);
        const linkObjNumber = new Int32Array(14);
        linkObjType[EQUIPMENT_SLOT_IDS.rhand] = 4152;
        linkObjNumber[EQUIPMENT_SLOT_IDS.rhand] = 1;
        IfType.list[1688] = {
            linkObjType,
            linkObjNumber,
            iop: ['Remove', null, null, null, null]
        } as IfType;

        try {
            const state = createStubClientState();
            const api = createBotApiForTests(state);
            const item = api.equipment.getBySlot('rhand')!;

            expect(api.equipment.getSlotId('rhand')).toBe(3);
            expect(api.equipment.getSlotName(3)).toBe('rhand');
            expect(item.id).toBe(4151);
            expect(item.slotId).toBe(3);
            expect(item.slotName).toBe('rhand');
        } finally {
            objListHolder.list = realObjList;
            IfType.list[1688] = realInterface;
        }
    });

    test('EquipmentInterfaceItem uses dynamic component ops for worn-item actions', () => {
        const realInterface = IfType.list[1688];
        IfType.list[1688] = {
            linkObjType: new Int32Array([0, 4152]),
            linkObjNumber: new Int32Array([0, 1]),
            iop: ['Remove', 'Check', null, null, null]
        } as IfType;

        try {
            const state = createStubClientState();
            const api = createBotApiForTests(state);
            const item = new EquipmentInterfaceItem(api, 1688, 1, 4151, 1);

            expect(item.unequip()).toBe(true);
            expect(lastDispatch(state)).toEqual({
                opcode: MiniMenuAction.INV_BUTTON1,
                p1: 4151,
                p2: 1,
                p3: 1688
            });

            expect(item.interactByOpEquals('check')).toBe(true);
            expect(lastDispatch(state)).toEqual({
                opcode: MiniMenuAction.INV_BUTTON2,
                p1: 4151,
                p2: 1,
                p3: 1688
            });
            expect(item.interactByOpIncludes('missing')).toBe(false);
        } finally {
            IfType.list[1688] = realInterface;
        }
    });

    test('stale item wrappers do not dispatch inventory, equipment, bank, or item-on-item actions', () => {
        const realInventoryInterface = IfType.list[3214];
        const realEquipmentInterface = IfType.list[1688];
        const realBankInterface = IfType.list[5382];
        IfType.list[3214] = {
            linkObjType: new Int32Array([947, 1512]),
            linkObjNumber: new Int32Array([1, 1])
        } as IfType;
        IfType.list[1688] = {
            linkObjType: new Int32Array([0, 4152]),
            linkObjNumber: new Int32Array([0, 1]),
            iop: ['Remove', null, null, null, null]
        } as IfType;
        IfType.list[5382] = {
            linkObjType: new Int32Array([322]),
            linkObjNumber: new Int32Array([10])
        } as IfType;

        try {
            const state = createStubClientState();
            const api = createBotApiForTests(state);
            const knife = new InvInterfaceItem(api, 3214, 0, 946, 1);
            const logs = new InvInterfaceItem(api, 3214, 1, 1511, 1);
            const equipment = new EquipmentInterfaceItem(api, 1688, 1, 4151, 1);
            const bankItem = new BankInterfaceItem(api, 5382, 0, 321, 10);

            IfType.list[3214]!.linkObjType![0] = 995;
            expect(knife.drop()).toBe(false);

            IfType.list[3214]!.linkObjType![0] = 947;
            IfType.list[3214]!.linkObjType![1] = 996;
            expect(knife.useOnItem(logs)).toBe(false);

            IfType.list[1688]!.linkObjType![1] = 4153;
            expect(equipment.unequip()).toBe(false);

            IfType.list[5382]!.linkObjType![0] = 323;
            expect(bankItem.withdraw1()).toBe(false);
            expect(state.dispatches).toEqual([]);
        } finally {
            IfType.list[3214] = realInventoryInterface;
            IfType.list[1688] = realEquipmentInterface;
            IfType.list[5382] = realBankInterface;
        }
    });

    test('EquipmentInterfaceItem.unequip uses INV_BUTTON1 when routed through interact', () => {
        const state = createStubClientState();
        const api = createBotApiForTests(state);
        const item = new EquipmentInterfaceItem(api, 1688, 1, 4151, 1);
        expect(item.unequip()).toBe(true);
        expect(lastDispatch(state)).toEqual({
            opcode: MiniMenuAction.INV_BUTTON1,
            p1: 4151,
            p2: 1,
            p3: 1688
        });
    });
});
