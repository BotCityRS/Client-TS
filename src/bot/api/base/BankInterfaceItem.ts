import { ClientProt } from "#/io/ClientProt";
import { ServerProt } from "#/io/ServerProt";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class BankInterfaceItem extends InterfaceItem {

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number) {
        super(api, interfaceId, slot, id, count)
    }

    withdraw1() {
        this.api.doAction(602, this.id, this.slot, this.interfaceId);
    }

    async withdraw(count: number) {
        this.api.doAction(415, this.id, this.slot, this.interfaceId);
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

    withdrawAll() {
        this.api.doAction(892, this.id, this.slot, this.interfaceId);
    }
}