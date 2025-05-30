import { Client } from "#/client/Client";
import Component from "#/config/Component";
import ObjType from "#/config/ObjType";
import NpcEntity from "#/dash3d/entity/NpcEntity";
import type ObjStackEntity from "#/dash3d/entity/ObjStackEntity";
import type World from "#/dash3d/World";
import type Bot from "../Bot";
import BotScript from "../scripts/BotScript";
import Bank from "./Bank";
import GroundItem from "./GroundItem";
import Interface from "./Interface";
import Inventory from "./Inventory";
import NPC from "./NPC";
import Player from "./Player";
import Timer from "./Timer";
import Utility from "./Utility";
import WorldObject from "./WorldObject";

const BOT_TIMER_WALK = -20;

export default class BotAPI {
    bot: Bot;
    client: Client;

    util: Utility;
    bank: Bank;
    inventory: Inventory;
    player: Player;
    npc: NPC;
    worldObject: WorldObject;
    groundItem: GroundItem;
    interface: Interface;
    private systemTimer: Timer;
    //world: World;

    constructor(bot: Bot) {
        this.bot = bot;
        this.client = bot.client;

        this.util = new Utility();
        this.interface = new Interface();
        this.bank = new Bank(this);
        this.player = new Player(this);
        this.inventory = new Inventory(this);
        this.npc = new NPC(this);
        this.worldObject = new WorldObject(this);
        this.groundItem = new GroundItem(this);
        this.systemTimer = Timer.SystemTimer();
    }

    setMenuOptions(menuOption:number, p1: number, p2: number, p3: number) {
        this.client.menuAction[0] = menuOption;
        this.client.menuParamA[0] = p1;
        this.client.menuParamB[0] = p2;
        this.client.menuParamC[0] = p3;
    }

    async doAction(menuOption:number, p1: number, p2: number, p3: number) {
        this.setMenuOptions(menuOption, p1, p2, p3);
        this.client.useMenuOption(0); 
    }

    isLoggedIn() {
        return this.client.ingame;
    }

    tryLogin(onSuccess: ()=>void) {
        const TIMER_LOGGING_IN = 0;
        const TIMER_LOGIN_WAIT = 1;
        const TIMER_SETUP_ACCOUNT_ON_LOGIN = 2;
        if (!this.isLoggedIn() && !this.systemTimer.hasTimer(TIMER_LOGGING_IN)) {
            this.systemTimer.setTimer(TIMER_LOGGING_IN, 6000);
            this.systemTimer.setTimer(TIMER_LOGIN_WAIT, 3000);
            return;
        }
        if (this.systemTimer.hasTimer(TIMER_LOGGING_IN)) {
            if (!this.isLoggedIn() && !this.systemTimer.hasTimer(TIMER_LOGIN_WAIT)) {
                this.client.tryLogin(this.client.usernameInput, this.client.passwordInput, true)
                this.systemTimer.setTimer(TIMER_LOGIN_WAIT, 3001);
            }
            if (this.isLoggedIn() && !this.systemTimer.hasTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN)) {
                onSuccess();
                this.systemTimer.setTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN, 3000);
            }
            return;
        }
    }
}
