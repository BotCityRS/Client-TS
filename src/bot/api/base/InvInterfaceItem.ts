import { ClientProt } from "#/io/ClientProt";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class InvInterfaceItem extends InterfaceItem {
    bankOpenInterfaceId: number = 2006;

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number) {
        super(api, interfaceId, slot, id, count)
    }

    interact(optionIndex: number) {
        // TODO make optionIDs dynamic based on item
        const optionIds = [405, 38, 422];
        this.api.doAction(optionIds[optionIndex], this.id, this.slot, this.interfaceId);
    }

    drop() {
        this.api.doAction(347, this.id, this.slot, this.interfaceId);
    }

    equip() {
        this.interact(1)
    }

    deposit1() {
        if (!this.api.bank.isOpen()) {
            return;
        }
        this.api.doAction(602, this.id, this.slot, this.bankOpenInterfaceId);
    }
    
    async deposit(count: number) {
        this.api.doAction(415, this.id, this.slot, this.bankOpenInterfaceId);
        return new Promise((res: (success:boolean)=>void, rej: ()=>void) => {
            const timeout = new Date().getTime() + 4000;
            const interval = setInterval(()=>{
                if (this.api.client.chatbackInputOpen) {
                    this.api.client.out.p1isaac(ClientProt.RESUME_P_COUNTDIALOG);
                    this.api.client.out.p4(count);
                    this.api.client.chatbackInputOpen = false;
                    this.api.client.redrawChatback = true;
                    clearInterval(interval)
                    res(true)
                } else if (new Date().getTime() >= timeout) {
                    clearInterval(interval)
                    res(false);
                }
            }, 50);
        })
    }

    depositAll() {
        this.api.doAction(892, this.id, this.slot, this.bankOpenInterfaceId);
    }
}