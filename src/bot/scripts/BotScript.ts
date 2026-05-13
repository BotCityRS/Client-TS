import type Bot from "../Bot";

export default class BotScript {
    name: string;
    isSystemScript: boolean;

    constructor(name: string, isSystemScript: boolean) {
        this.name = name;
        this.isSystemScript = isSystemScript;
    }

    start(bot: Bot): void {}
    update(bot: Bot): void {}
    stop(bot: Bot): void {}
};