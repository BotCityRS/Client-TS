import Component from "#/config/Component";
import ObjType from "#/config/ObjType";
import InterfaceItem from "./base/InterfaceItem";
import EquipmentInterfaceItem from "./base/EquipmentInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import type BotAPI from "./BotAPI";

export default class Equipment extends ItemContainer<EquipmentInterfaceItem> {
    constructor(api: BotAPI) {
        super(api, 1688, EquipmentInterfaceItem);
    }
}