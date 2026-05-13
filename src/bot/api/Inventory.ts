import InvInterfaceItem from "./base/InvInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import type BotAPI from "./BotAPI";

export default class Inventory extends ItemContainer<InvInterfaceItem> {
    constructor(api: BotAPI) {
        super(api, 3214, InvInterfaceItem);
    }
}