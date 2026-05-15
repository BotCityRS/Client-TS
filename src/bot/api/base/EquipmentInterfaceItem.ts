import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import { ClientProt } from "#/io/ClientProt";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class EquipmentInterfaceItem extends InterfaceItem {
    bankOpenInterfaceId: number = 2006;

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number) {
        super(api, interfaceId, slot, id, count)
    }

    interact(optionIndex: number) {
        // TODO make optionIDs dynamic based on item
        const optionIds = [MiniMenuAction.INV_BUTTON1];
        this.api.doAction(optionIds[optionIndex]!, this.id, this.slot, this.interfaceId);
    }

    unequip() {
        this.interact(0)
    }
}