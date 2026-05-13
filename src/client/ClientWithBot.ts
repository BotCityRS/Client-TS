import Bot from '#/bot/Bot.js';
import { Client as RS2Client } from '#/client/Client.js';

/** Fork entry: upstream client plus `window.bot` for scripts. */
export class Client extends RS2Client {
    constructor(nodeid: number, lowmem: boolean, members: boolean) {
        super(nodeid, lowmem, members);
        const bot = new Bot(this);
        (globalThis as unknown as { bot: Bot }).bot = bot;
    }
}
