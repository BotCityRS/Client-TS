import Component from "#/config/Component";
import ObjType from "#/config/ObjType";
import InterfaceItem from "./base/InterfaceItem";
import InvInterfaceItem from "./base/InvInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import type BotAPI from "./BotAPI";

export default class Inventory extends ItemContainer<InvInterfaceItem> {
    constructor(api: BotAPI) {
        super(api, 3214, InvInterfaceItem);
    }
}