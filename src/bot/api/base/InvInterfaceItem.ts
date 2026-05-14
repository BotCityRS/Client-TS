import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import { ClientProt } from "#/io/ClientProt.js";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class InvInterfaceItem extends InterfaceItem {
    bankOpenInterfaceId: number = 2006;

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number) {
        super(api, interfaceId, slot, id, count);
    }

    interact(optionIndex: number) {
        const optionIds = [MiniMenuAction.OP_HELD1, MiniMenuAction.OP_HELD2, MiniMenuAction.OP_HELD3];
        this.api.doAction(optionIds[optionIndex], this.id, this.slot, this.interfaceId);
    }

    drop() {
        this.api.doAction(MiniMenuAction.OP_HELD5, this.id, this.slot, this.interfaceId);
    }

    equip() {
        this.interact(1);
    }

    deposit1() {
        if (!this.api.bank.isOpen()) {
            return;
        }
        this.api.doAction(602, this.id, this.slot, this.bankOpenInterfaceId);
    }

    async deposit(count: number) {
        this.api.doAction(415, this.id, this.slot, this.bankOpenInterfaceId);
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

    depositAll() {
        this.api.doAction(892, this.id, this.slot, this.bankOpenInterfaceId);
    }
}
