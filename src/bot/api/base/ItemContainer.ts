import Component from "#/config/Component";
import ObjType from "#/config/ObjType";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class ItemContainer<T extends InterfaceItem> {
    api: BotAPI;
    interfaceId: number;
    InterfaceItemType: new (...args: any[]) => T;

    constructor(api: BotAPI, interfaceId: number, InterfaceItemType: new (...args: any[]) => T) {
        this.api = api;
        this.interfaceId = interfaceId;
        this.InterfaceItemType = InterfaceItemType;
    }

    private createItem(...args: ConstructorParameters<typeof this.InterfaceItemType>): T {
        return new this.InterfaceItemType(...args);
    }

    getContainerSize() {
        return this.api.interface.getInterface(this.interfaceId).invSlotObjId?.length ?? 0;
    }

    hasItem(id: number) {
        return this.getItemById(id) != null;
    }

    hasItemAmount(id: number, count: number) {
        return (this.getItemById(id)?.count ?? -1) >= count;
    }

    getItemBySlot(slotId: number): T | null {
        const inv = this.api.interface.getInterface(this.interfaceId);
        const slotItem = inv.invSlotObjId?.[slotId];
        const slotCount = inv.invSlotObjCount?.[slotId] ?? 0;
        if (slotItem && slotItem > 0) {
            const realSlotItem = ObjType.get(slotItem - 1);
            const invItem = this.createItem(this.api, this.interfaceId, slotId, realSlotItem.id, slotCount)
            return invItem;
        }
        return null;
    }

    getItemById(id: number): T | null {
        const size = this.getContainerSize();
        for (let i = 0; i < size; ++i) {
            let item = this.getItemBySlot(i);
            if (item && item.id == id) {
                return item;
            }
        }
        return null;
    }

    isFull(spaceLeft: number = 0) {
        const size = this.getContainerSize();
        let freeReq = spaceLeft + 1;
        for (let s = 0; s < size; ++s) {
            if (!this.getItemBySlot(s)) {
                freeReq--;
            }
            if (freeReq <= 0)
                return false;
        }
        return true;
    }
}