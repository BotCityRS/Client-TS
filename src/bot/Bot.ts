import { Client } from "#/client/Client";

const BOT_TIMER_WALK = -20;

export default class Bot {

    private client: Client;

    intervalHandle: null;
    lastCombatUpdate: number;
    isInCombatScore: number;
    timers: any;

    constructor(client: Client) {
        console.info("hi")
        window?.onload(() => {
            window.bot = this;
        })
        this.client = client;

    
        this.lastCombatUpdate = new Date().getTime();
        this.isInCombatScore = -1000;
        this.timers = [];
    }

    getDistance(x1: number, z1: number, x2: number, z2: number) {
        return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(z1 - z2), 2));
    }

    setMenuOptions(menuOption:number, p1: number, p2: number, p3: number) {
        this.client.menuAction[0] = menuOption;
        this.client.menuAction[0] = p1;
        this.client.menuAction[0] = p2;
        this.client.menuAction[0] = p3;
    }

    async doAction(menuOption:number, p1: number, p2: number, p3: number) {
        this.setMenuOptions(menuOption, p1, p2, p3);
        this.client.useMenuOption(0); 
    }

    startScript() {
        console.info(this.client.npcs)
    }
}