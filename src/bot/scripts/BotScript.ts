import type Bot from "../Bot";

export default class BotScript {
    name: string;
    isSystemScript: boolean;
    /** Dev/test scripts and the script editor; hidden unless bot debug mode is on. */
    isDebugScript: boolean;

    constructor(name: string, isSystemScript: boolean, isDebugScript = false) {
        this.name = name;
        this.isSystemScript = isSystemScript;
        this.isDebugScript = isDebugScript;
    }

    start(bot: Bot): void {}
    update(bot: Bot): void {}
    stop(bot: Bot): void {}
};