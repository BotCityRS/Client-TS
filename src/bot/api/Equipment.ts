import EquipmentInterfaceItem from "./base/EquipmentInterfaceItem";
import { getEquipmentSlotId, getEquipmentSlotName } from "./EquipmentSlots";
import ItemContainer from "./base/ItemContainer";
import type BotAPI from "./BotAPI";
import type { EquipmentSlotName } from "./EquipmentSlots";

export default class Equipment extends ItemContainer<EquipmentInterfaceItem> {
    constructor(api: BotAPI) {
        super(api, 1688, EquipmentInterfaceItem);
    }

    getSlotId(slot: number | EquipmentSlotName): number {
        return getEquipmentSlotId(slot);
    }

    getSlotName(slot: number): EquipmentSlotName | null {
        return getEquipmentSlotName(slot);
    }

    getBySlot(slot: number | EquipmentSlotName): EquipmentInterfaceItem | null {
        return this.getItemBySlot(getEquipmentSlotId(slot));
    }

    unequip(slotOrItem: number | EquipmentSlotName | EquipmentInterfaceItem): boolean {
        const item = typeof slotOrItem === 'object' ? slotOrItem : this.getBySlot(slotOrItem);
        if (!item) {
            return false;
        }
        return item.unequip();
    }
}