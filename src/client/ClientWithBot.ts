import Bot from '#/bot/Bot.js';
import { Client as RS2Client } from '#/client/Client.js';

/** Fork entry: upstream client plus `window.bot` for scripts. */
export class Client extends RS2Client {
    private readonly bot: Bot;

    constructor(nodeid: number, lowmem: boolean, members: boolean) {
        super(nodeid, lowmem, members);
        this.bot = new Bot(this);
        (globalThis as unknown as { bot: Bot }).bot = this.bot;
    }

    protected override onLoginCredentialsCleared(): void {
        void this.bot.reinjectSelectedAccount();
    }
}
