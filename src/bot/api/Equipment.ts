import EquipmentInterfaceItem from "./base/EquipmentInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import type BotAPI from "./BotAPI";

export default class Equipment extends ItemContainer<EquipmentInterfaceItem> {
    constructor(api: BotAPI) {
        super(api, 1688, EquipmentInterfaceItem);
    }
}