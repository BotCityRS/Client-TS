import IfType from "#/config/IfType.js";
import ObjType from "#/config/ObjType.js";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

export default class ItemContainer<T extends InterfaceItem> {
    api: BotAPI;
    interfaceId: number;
    InterfaceItemType: new (...args: unknown[]) => T;

    constructor(api: BotAPI, interfaceId: number, InterfaceItemType: new (...args: unknown[]) => T) {
        this.api = api;
        this.interfaceId = interfaceId;
        this.InterfaceItemType = InterfaceItemType;
    }

    private createItem(...args: ConstructorParameters<typeof this.InterfaceItemType>): T {
        return new this.InterfaceItemType(...args);
    }

    getContainerSize() {
        const inv = this.api.interface.getInterface(this.interfaceId);
        return inv?.linkObjType?.length ?? 0;
    }

    hasItem(id: number) {
        return this.getItemById(id) != null;
    }

    hasItemAmount(id: number, count: number) {
        return (this.getItemById(id)?.count ?? -1) >= count;
    }

    getItemBySlot(slotId: number): T | null {
        const inv = this.api.interface.getInterface(this.interfaceId);
        const types = inv?.linkObjType;
        const counts = inv?.linkObjNumber;
        if (!types || !counts) {
            return null;
        }
        const slotItem = types[slotId];
        const slotCount = counts[slotId] ?? 0;
        if (slotItem > 0) {
            const realSlotItem = ObjType.list(slotItem - 1);
            return this.createItem(this.api, this.interfaceId, slotId, realSlotItem.id, slotCount);
        }
        return null;
    }

    getItemById(id: number): T | null {
        const size = this.getContainerSize();
        for (let i = 0; i < size; ++i) {
            const item = this.getItemBySlot(i);
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
            if (freeReq <= 0) {
                return false;
            }
        }
        return true;
    }
}
