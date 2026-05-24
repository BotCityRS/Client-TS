import type Bot from '../Bot.js';
import BotScriptingSurface, { createBotSurface } from '../BotScriptingSurface.js';
import { assertApi } from './botApiAssert.js';
import Bank from './Bank';
import Equipment from './Equipment';
import GroundItem from './GroundItem';
import Interface from './Interface';
import Inventory from './Inventory';
import NPC from './NPC';
import Player from './Player';
import Timer from './Timer';
import Utility from './Utility';
import World from './World';
import WorldObject from './WorldObject';
import WebWalk from '../walk/WebWalk.js';

export default class BotAPI {
    bot: Bot;
    readonly surface: BotScriptingSurface;

    util: Utility;
    bank: Bank;
    inventory: Inventory;
    equipment: Equipment;
    player: Player;
    npc: NPC;
    worldObject: WorldObject;
    groundItem: GroundItem;
    interface: Interface;
    private systemTimer: Timer;
    world: World;
    webWalk: WebWalk;

    constructor(bot: Bot) {
        this.bot = bot;
        const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', source: string, message: string, detail?: unknown) => this.bot.log(level, source, message, detail);
        this.surface = createBotSurface(bot.client, log);

        this.util = new Utility();
        this.interface = new Interface(this);
        this.bank = new Bank(this);
        this.player = new Player(this);
        this.inventory = new Inventory(this);
        this.equipment = new Equipment(this);
        this.npc = new NPC(this);
        this.worldObject = new WorldObject(this);
        this.groundItem = new GroundItem(this);
        this.world = new World(this);
        this.webWalk = new WebWalk(this);
        this.systemTimer = Timer.SystemTimer();
    }

    private log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', source: string, message: string, detail?: unknown): void {
        this.bot.log(level, source, message, detail);
    }

    setMenuOptions(menuOption: number, p1: number, p2: number, p3: number) {
        this.surface.setMenuSlot(menuOption, p1, p2, p3);
    }

    async doAction(menuOption: number, p1: number, p2: number, p3: number) {
        const logFn = this.log.bind(this) as Parameters<typeof assertApi>[1];
        assertApi(
            Number.isFinite(menuOption) && Number.isFinite(p1) && Number.isFinite(p2) && Number.isFinite(p3),
            logFn,
            'BotAPI.doAction',
            'Non-finite menu opcode or params',
            { menuOption, p1, p2, p3 }
        );
        this.setMenuOptions(menuOption, p1, p2, p3);
        this.surface.runDoAction(0);
    }

    isLoggedIn() {
        return this.surface.ingame;
    }

    /**
     * Attempts login when not in-game (throttled). Optional `onSuccess` runs once per few seconds after login
     * (e.g. enable run). Called every bot tick from `Bot.start` and may also be called from scripts.
     */
    tryLogin(onSuccess?: () => void): void {
        const TIMER_LOGIN_WAIT = 1;
        const TIMER_SETUP_ACCOUNT_ON_LOGIN = 2;
        const TIMER_CREDENTIAL_WARN = 3;

        if (this.isLoggedIn()) {
            if (onSuccess && !this.systemTimer.hasTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN)) {
                onSuccess();
                this.systemTimer.setTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN, 3000);
            }
            return;
        }

        const username = this.surface.loginUsername.trim();
        const password = this.surface.loginPassword;
        if (!username || !password) {
            if (!this.systemTimer.hasTimer(TIMER_CREDENTIAL_WARN)) {
                this.log(
                    'WARN',
                    'BotAPI.tryLogin',
                    'no login credentials — select or add an account in the Bot Accounts tab'
                );
                this.systemTimer.setTimer(TIMER_CREDENTIAL_WARN, 8000);
            }
            return;
        }

        if (this.systemTimer.hasTimer(TIMER_LOGIN_WAIT)) {
            return;
        }

        this.log('INFO', 'BotAPI.tryLogin', 'attempting login', { username });
        void this.surface.login(username, password, true);
        this.systemTimer.setTimer(TIMER_LOGIN_WAIT, 5000);
    }
}
