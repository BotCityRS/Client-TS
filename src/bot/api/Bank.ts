import BankInterfaceItem from "./base/BankInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import BotAPI from "./BotAPI";

export default class Bank extends ItemContainer<BankInterfaceItem> {
    bankOpenState: boolean;

    constructor(api: BotAPI) {
        super(api, 5382, BankInterfaceItem);
        this.bankOpenState = this.isOpen();
        setInterval(() => {
            if (this.isOpen() != this.bankOpenState) {
                this.bankOpenState = !this.bankOpenState;
                if (this.bankOpenState) {
                    this.onOpen()
                } else {
                    this.onClose()
                }
            }
        }, 100)
    }

    onOpen() {
        this.api.inventory.interfaceId = 2006;
    }

    onClose() {
        this.api.inventory.interfaceId = 3214;
    }

    isOpen() {
        return this.api.client.sidebarInterfaceId == 2005;
    }

    open() {
        this.api.worldObject.getNearestById([2213])?.interact(1)
    }

    close() {
        this.api.doAction(947, -1, -1, 5384)
    }

    async withdraw(id: number, amount: number = 1) {
        await this.getItemById(id)?.withdraw(amount)
    }

    depositAll() {
        this.onOpen();
        for (let s = 0; s < this.api.inventory.getContainerSize(); ++s)
            this.api.inventory.getItemBySlot(s)?.depositAll()
    }

    depositAllExcept(ids: number[]) {
        this.onOpen();
        for (let s = 0; s < this.api.inventory.getContainerSize(); ++s) {
            const item = this.api.inventory.getItemBySlot(s)
            if (item && !ids.includes(item.id)) {
                item?.depositAll()
            }
        }
    }
}