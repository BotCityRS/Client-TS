import type Bot from '../Bot';

export type BotScriptMetadata = {
    author: string;
    version: string;
    isDebugScript?: boolean;
};

export default class BotScript {
    name: string;
    author: string;
    version: string;
    isSystemScript: boolean;
    /** Dev/test scripts and the script editor; hidden unless bot debug mode is on. */
    isDebugScript: boolean;

    constructor(name: string, isSystemScript: boolean, metadata: BotScriptMetadata) {
        this.name = name;
        this.author = metadata.author;
        this.version = metadata.version;
        this.isSystemScript = isSystemScript;
        this.isDebugScript = metadata.isDebugScript ?? false;
    }

    start(_bot: Bot): void {}
    update(_bot: Bot): void {}
    stop(_bot: Bot): void {}
};