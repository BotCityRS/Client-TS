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

    constructor(bot: Bot) {
        this.bot = bot;
        const log = (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', source: string, message: string, detail?: unknown) => this.bot.log(level, source, message, detail);
        this.surface = createBotSurface(bot.client, log);

        this.util = new Utility();
        this.interface = new Interface();
        this.bank = new Bank(this);
        this.player = new Player(this);
        this.inventory = new Inventory(this);
        this.equipment = new Equipment(this);
        this.npc = new NPC(this);
        this.worldObject = new WorldObject(this);
        this.groundItem = new GroundItem(this);
        this.world = new World(this);
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

    tryLogin(onSuccess: () => void) {
        const TIMER_LOGGING_IN = 0;
        const TIMER_LOGIN_WAIT = 1;
        const TIMER_SETUP_ACCOUNT_ON_LOGIN = 2;
        if (!this.isLoggedIn() && !this.systemTimer.hasTimer(TIMER_LOGGING_IN)) {
            this.systemTimer.setTimer(TIMER_LOGGING_IN, 6000);
            this.systemTimer.setTimer(TIMER_LOGIN_WAIT, 3000);
            this.log('INFO', 'BotAPI.tryLogin', 'started login timers');
            return;
        }
        if (this.systemTimer.hasTimer(TIMER_LOGGING_IN)) {
            if (!this.isLoggedIn() && !this.systemTimer.hasTimer(TIMER_LOGIN_WAIT)) {
                this.log('INFO', 'BotAPI.tryLogin', 'calling surface.login');
                void this.surface.login(this.surface.loginUsername, this.surface.loginPassword, true);
                this.systemTimer.setTimer(TIMER_LOGIN_WAIT, 3001);
            }
            if (this.isLoggedIn() && !this.systemTimer.hasTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN)) {
                this.log('INFO', 'BotAPI.tryLogin', 'ingame; running onSuccess');
                onSuccess();
                this.systemTimer.setTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN, 3000);
            }
            return;
        }
    }
}
