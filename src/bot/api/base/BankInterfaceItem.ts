import { BOT_MENU_BANK_DEPOSIT_1, BOT_MENU_BANK_DEPOSIT_ALL, BOT_MENU_BANK_DEPOSIT_X } from '../../botLegacyMenuOpcodes.js';
import { ClientProt } from "#/io/ClientProt.js";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class BankInterfaceItem extends InterfaceItem {
    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number) {
        super(api, interfaceId, slot, id, count);
    }

    withdraw1() {
        this.api.doAction(BOT_MENU_BANK_DEPOSIT_1, this.id, this.slot, this.interfaceId);
    }

    async withdraw(count: number) {
        this.api.doAction(BOT_MENU_BANK_DEPOSIT_X, this.id, this.slot, this.interfaceId);
        return new Promise<boolean>((res) => {
            const timeout = Date.now() + 4000;
            const interval = setInterval(() => {
                if (this.api.surface.dialogInputOpen) {
                    this.api.surface.out.pIsaac(ClientProt.RESUME_P_COUNTDIALOG);
                    this.api.surface.out.p4(count);
                    this.api.surface.dialogInputOpen = false;
                    this.api.surface.redrawChatback = true;
                    clearInterval(interval);
                    res(true);
                } else if (Date.now() >= timeout) {
                    clearInterval(interval);
                    res(false);
                }
            }, 50);
        });
    }

    withdrawAll() {
        this.api.doAction(BOT_MENU_BANK_DEPOSIT_ALL, this.id, this.slot, this.interfaceId);
    }
}
