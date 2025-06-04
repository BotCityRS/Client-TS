import { Client } from "#/client/Client";
import Component from "#/config/Component";
import ObjType from "#/config/ObjType";
import NpcEntity from "#/dash3d/entity/NpcEntity";
import type ObjStackEntity from "#/dash3d/entity/ObjStackEntity";
import BotAPI from "./api/BotAPI";
import AutoFisher from "./scripts/AutoFisher";
import AutoKiller from "./scripts/AutoKiller";
import AutoWalker from "./scripts/AutoWalker";
import BotScript from "./scripts/BotScript";
import LumbyThievSuicide from "./scripts/LumbyThievSuicide";

const BOT_TIMER_WALK = -20;

export default class Bot {
    client: Client;
        
    intervalHandle: number;

    api: BotAPI;
    scripts: any[];

    currentScript: BotScript | null = null;

    constructor(client: Client, window: Window) {
        window.bot = this;
        this.client = client;

        this.scripts = [AutoKiller, AutoFisher, LumbyThievSuicide, AutoWalker];
        this.api = new BotAPI(this);

        this.intervalHandle = -1;
    }

    start(script: BotScript) {
        this.stop();
        this.currentScript = script;
        const tickFunc = () => {
            //client.resetIdleTimeout();
            script.update(this)
        }
        this.intervalHandle = setInterval(tickFunc, 100);
        console.info('Script started.');
    }

    stop() {
        this.currentScript?.stop(this)
        clearInterval(this.intervalHandle);
        console.info('Script stopped.');
    }
}
