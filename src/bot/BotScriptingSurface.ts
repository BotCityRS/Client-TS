import type { Client } from '#/client/Client.js';
import LocType from '#/config/LocType.js';
import type ClientNpc from '#/dash3d/ClientNpc.js';
import type ClientObj from '#/dash3d/ClientObj.js';
import type ClientPlayer from '#/dash3d/ClientPlayer.js';
import { LocAngle } from '#/dash3d/LocAngle.js';
import { LocShape } from '#/dash3d/LocShape.js';
import type World from '#/dash3d/World.js';
import LinkList from '#/datastruct/LinkList.js';
import type Packet from '#/io/Packet.js';
import type { BotLogFn } from '#/bot/BotLog.js';

/**
 * Typed escape hatch for private `Client` fields used by scripting.
 * When upstream renames internals, update this file only.
 */
type ClientAccess = {
    ingame: boolean;
    npc: (ClientNpc | null)[];
    localPlayer: ClientPlayer | null;
    menuAction: Int32Array;
    menuParamA: Int32Array;
    menuParamB: Int32Array;
    menuParamC: Int32Array;
    menuOption: (string | null)[];
    menuNumEntries: number;
    out: Packet;
    loginUser: string;
    loginPass: string;
    statEffectiveLevel: number[];
    statBaseLevel: number[];
    statXP: number[];
    minusedlevel: number;
    mapBuildBaseX: number;
    mapBuildBaseZ: number;
    dialogInputOpen: boolean;
    redrawChatback: boolean;
    /** Sidebar root from `IF_OPENMAIN_SIDE` / `IF_OPENSIDE`; `-1` when using normal tab overlays only. */
    sideModalId: number;
    sideOverlayId: number[];
    sideTab: number;
    groundObj: (LinkList<ClientObj> | null)[][][];
    world: World | null;
};

function acc(c: Client): ClientAccess {
    return c as unknown as ClientAccess;
}

export default class BotScriptingSurface {
    constructor(
        private readonly client: Client,
        private readonly botLog?: BotLogFn
    ) {}

    get ingame(): boolean {
        return acc(this.client).ingame;
    }

    get npcs(): (ClientNpc | null)[] {
        return acc(this.client).npc;
    }

    get localPlayer(): ClientPlayer | null {
        return acc(this.client).localPlayer;
    }

    get sceneBaseTileX(): number {
        return acc(this.client).mapBuildBaseX;
    }

    get sceneBaseTileZ(): number {
        return acc(this.client).mapBuildBaseZ;
    }

    /** Sidebar root component for the active tab (`-1` if none). */
    get sidebarOverlayRootId(): number {
        const a = acc(this.client);
        return a.sideOverlayId[a.sideTab] ?? -1;
    }

    /** All sidebar tab roots from `IF_SETTAB` (includes combat UI in its slot even when another tab is selected). */
    get sidebarTabOverlayRootIds(): readonly number[] {
        return acc(this.client).sideOverlayId.slice();
    }

    get currentLevel(): number {
        return acc(this.client).minusedlevel;
    }

    get skillLevel(): number[] {
        return acc(this.client).statEffectiveLevel;
    }

    get skillBaseLevel(): number[] {
        return acc(this.client).statBaseLevel;
    }

    get skillExperience(): number[] {
        return acc(this.client).statXP;
    }

    get loginUsername(): string {
        return acc(this.client).loginUser;
    }

    get loginPassword(): string {
        return acc(this.client).loginPass;
    }

    setLoginCredentials(username: string, password: string): void {
        const a = acc(this.client);
        a.loginUser = username.substring(0, 12);
        a.loginPass = password.substring(0, 20);
    }

    get dialogInputOpen(): boolean {
        return acc(this.client).dialogInputOpen;
    }

    set dialogInputOpen(v: boolean) {
        acc(this.client).dialogInputOpen = v;
    }

    get redrawChatback(): boolean {
        return acc(this.client).redrawChatback;
    }

    set redrawChatback(v: boolean) {
        acc(this.client).redrawChatback = v;
    }

    get out(): Packet {
        return acc(this.client).out;
    }

    /** Resets the client's 90s idle watchdog (same as DOM input); avoids IDLE_TIMER while bot runs. */
    markClientInputActivity(): void {
        this.client.idleTimer = performance.now();
    }

    isBankSidebarOpen(bankRootId: number): boolean {
        const a = acc(this.client);
        // Bank uses `if_openmain_side(bank_main, bank_side)` → client sets `sideModalId` to bank_side root.
        // Tab overlays (`sideOverlayId`) stay on backpack/skills etc., so checking only those misses an open bank.
        return a.sideModalId === bankRootId || a.sideOverlayId[a.sideTab] === bankRootId;
    }

    setMenuSlot(opcode: number, p1: number, p2: number, p3: number): void {
        const a = acc(this.client);
        a.menuOption[0] = '';
        a.menuAction[0] = opcode;
        a.menuParamA[0] = p1;
        a.menuParamB[0] = p2;
        a.menuParamC[0] = p3;
        a.menuNumEntries = 1;
    }

    runDoAction(optionId: number): void {
        (this.client as unknown as { doAction(i: number): void }).doAction(optionId);
    }

    tryMoveToTile(srcX: number, srcZ: number, destX: number, destZ: number): boolean {
        return (this.client as unknown as { tryMove(a: number, b: number, c: number, d: number, tryNearest: boolean, lw: number, ll: number, la: number, ls: number, fa: number, ty: number): boolean }).tryMove(
            srcX,
            srcZ,
            destX,
            destZ,
            true,
            0,
            0,
            0,
            0,
            0,
            0
        );
    }

    /** Walkable tile steps to chop/interact with a scene loc; -1 if unreachable. */
    pathfindStepsToLoc(srcX: number, srcZ: number, x: number, z: number, typecode: number): number {
        const a = acc(this.client);
        if (!a.ingame || !a.world) {
            return -1;
        }
        const info: number = a.world.typeCode2(a.minusedlevel, x, z, typecode);
        if (info === -1) {
            return -1;
        }
        const shape: number = info & 0x1f;
        const angle: number = (info >> 6) & 0x3;
        const locId: number = (typecode >> 14) & 0x7fff;
        const loc: LocType = LocType.list(locId);
        const client = this.client as unknown as {
            pathfindSteps(
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
            ): number;
        };

        if (shape === LocShape.CENTREPIECE_STRAIGHT || shape === LocShape.CENTREPIECE_DIAGONAL || shape === LocShape.GROUND_DECOR) {
            let width: number;
            let height: number;
            if (angle === LocAngle.WEST || angle === LocAngle.EAST) {
                width = loc.width;
                height = loc.length;
            } else {
                width = loc.length;
                height = loc.width;
            }
            let forceapproach: number = loc.forceapproach;
            if (angle !== 0) {
                forceapproach = ((forceapproach << angle) & 0xf) + (forceapproach >> (4 - angle));
            }
            return client.pathfindSteps(srcX, srcZ, x, z, false, width, height, 0, 0, forceapproach);
        }

        return client.pathfindSteps(srcX, srcZ, x, z, false, 0, 0, angle, shape + 1, 0);
    }

    async login(username: string, password: string, reconnect: boolean): Promise<void> {
        this.botLog?.('INFO', 'BotScriptingSurface.login', 'login attempt', { username, reconnect });
        await (this.client as unknown as { login(u: string, p: string, r: boolean): Promise<void> }).login(username, password, reconnect);
    }

    getGroundObjList(x: number, z: number): LinkList<ClientObj> | null {
        const a = acc(this.client);
        const g = a.groundObj[a.minusedlevel];
        return g[x]?.[z] ?? null;
    }

    get world(): World | null {
        return acc(this.client).world;
    }
}

export function createBotSurface(client: Client, botLog?: BotLogFn): BotScriptingSurface {
    return new BotScriptingSurface(client, botLog);
}
