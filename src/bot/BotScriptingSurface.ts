import type { Client } from '#/client/Client.js';
import type ClientNpc from '#/dash3d/ClientNpc.js';
import type ClientObj from '#/dash3d/ClientObj.js';
import type ClientPlayer from '#/dash3d/ClientPlayer.js';
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
        return a.sideOverlayId[a.sideTab] === bankRootId;
    }

    setMenuSlot(opcode: number, p1: number, p2: number, p3: number): void {
        this.botLog?.('DEBUG', 'BotScriptingSurface.setMenuSlot', 'menu slot 0', { opcode, p1, p2, p3 });
        const a = acc(this.client);
        a.menuOption[0] = '';
        a.menuAction[0] = opcode;
        a.menuParamA[0] = p1;
        a.menuParamB[0] = p2;
        a.menuParamC[0] = p3;
        a.menuNumEntries = 1;
    }

    runDoAction(optionId: number): void {
        this.botLog?.('DEBUG', 'BotScriptingSurface.runDoAction', 'dispatch', { optionId });
        (this.client as unknown as { doAction(i: number): void }).doAction(optionId);
    }

    tryMoveToTile(srcX: number, srcZ: number, destX: number, destZ: number): boolean {
        this.botLog?.('DEBUG', 'BotScriptingSurface.tryMoveToTile', 'tryMove', { srcX, srcZ, destX, destZ });
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
