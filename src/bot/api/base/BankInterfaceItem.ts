import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type ObjType from '#/config/ObjType.js';
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class BankInterfaceItem extends InterfaceItem {
    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number, itemType: ObjType | null = null) {
        super(api, interfaceId, slot, id, count, itemType);
    }

    withdraw1(): boolean {
        if (!this.isLiveSlot('BankInterfaceItem.withdraw1')) {
            return false;
        }
        // `interface_bank/interfaces/bank_main.if` bank inv: option1=Withdraw 1 → INV_BUTTON1.
        this.api.doAction(MiniMenuAction.INV_BUTTON1, this.id, this.slot, this.interfaceId);
        return true;
    }

    async withdraw(count: number): Promise<boolean> {
        if (!this.isLiveSlot('BankInterfaceItem.withdraw')) {
            return false;
        }
        this.api.doAction(MiniMenuAction.INV_BUTTON5, this.id, this.slot, this.interfaceId);
        return new Promise<boolean>((res) => {
            const timeout = Date.now() + 4000;
            const interval = setInterval(() => {
                if (this.api.interface.submitCountDialog(count)) {
                    clearInterval(interval);
                    res(true);
                } else if (Date.now() >= timeout) {
                    clearInterval(interval);
                    res(false);
                }
            }, 50);
        });
    }

    withdrawAll(): boolean {
        if (!this.isLiveSlot('BankInterfaceItem.withdrawAll')) {
            return false;
        }
        this.api.doAction(MiniMenuAction.INV_BUTTON4, this.id, this.slot, this.interfaceId);
        return true;
    }
}
