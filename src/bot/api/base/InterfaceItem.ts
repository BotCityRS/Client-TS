import type BotAPI from "../BotAPI";

export default class InterfaceItem {
    api: BotAPI;

    interfaceId: number;
    slot: number;
    id: number;
    count: number;

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number) {
        this.api = api;
        this.interfaceId = interfaceId;
        this.slot = slot;
        this.id = id;
        this.count = count;
    }

    //interactByName(action: string) {
    //    
    //}
}