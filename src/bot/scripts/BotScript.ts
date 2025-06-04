import type Bot from "../Bot";

export default class BotScript {
    name: string;
    
    constructor(name:string) {
        this.name = name;
    }

    update(bot: Bot): void {}
    stop(bot: Bot): void {}
};