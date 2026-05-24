import IfType from "#/config/IfType.js";
import ObjType from "#/config/ObjType.js";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

type InterfaceItemConstructor<T extends InterfaceItem> = new (
    api: BotAPI,
    interfaceId: number,
    slot: number,
    id: number,
    count: number,
    itemType?: ObjType
) => T;

export default class ItemContainer<T extends InterfaceItem> {
    api: BotAPI;
    interfaceId: number;
    InterfaceItemType: InterfaceItemConstructor<T>;

    constructor(api: BotAPI, interfaceId: number, InterfaceItemType: InterfaceItemConstructor<T>) {
        this.api = api;
        this.interfaceId = interfaceId;
        this.InterfaceItemType = InterfaceItemType;
    }

    private createItem(slot: number, id: number, count: number, itemType: ObjType): T {
        return new this.InterfaceItemType(this.api, this.interfaceId, slot, id, count, itemType);
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

    getItems(): T[] {
        const items: T[] = [];
        const size = this.getContainerSize();
        for (let slot = 0; slot < size; slot++) {
            const item = this.getItemBySlot(slot);
            if (item) {
                items.push(item);
            }
        }
        return items;
    }

    getEmptySlots(): number[] {
        const slots: number[] = [];
        const size = this.getContainerSize();
        for (let slot = 0; slot < size; slot++) {
            if (!this.getItemBySlot(slot)) {
                slots.push(slot);
            }
        }
        return slots;
    }

    getFreeSlotCount(): number {
        return this.getEmptySlots().length;
    }

    isEmpty(): boolean {
        return this.getItems().length === 0;
    }

    count(id: number): number {
        let total = 0;
        const size = this.getContainerSize();
        for (let slot = 0; slot < size; slot++) {
            const item = this.getItemBySlot(slot);
            if (item?.id === id) {
                total += item.count;
            }
        }
        return total;
    }

    countAll(ids: number[]): number {
        let total = 0;
        const wanted = new Set(ids);
        const size = this.getContainerSize();
        for (let slot = 0; slot < size; slot++) {
            const item = this.getItemBySlot(slot);
            if (item && wanted.has(item.id)) {
                total += item.count;
            }
        }
        return total;
    }

    find(predicate: (item: T) => boolean): T | null {
        const size = this.getContainerSize();
        for (let slot = 0; slot < size; slot++) {
            const item = this.getItemBySlot(slot);
            if (item && predicate(item)) {
                return item;
            }
        }
        return null;
    }

    findAll(predicate: (item: T) => boolean): T[] {
        const items: T[] = [];
        const size = this.getContainerSize();
        for (let slot = 0; slot < size; slot++) {
            const item = this.getItemBySlot(slot);
            if (item && predicate(item)) {
                items.push(item);
            }
        }
        return items;
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
            return this.createItem(slotId, realSlotItem.id, slotCount, realSlotItem);
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
