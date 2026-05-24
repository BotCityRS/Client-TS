import InvInterfaceItem from "./base/InvInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import type BotAPI from "./BotAPI";

export default class Inventory extends ItemContainer<InvInterfaceItem> {
    constructor(api: BotAPI) {
        super(api, 3214, InvInterfaceItem);
    }

    getAllById(ids: number[]): InvInterfaceItem[] {
        const wanted = new Set(ids);
        return this.findAll(item => wanted.has(item.id));
    }

    getFirstByIds(ids: number[]): InvInterfaceItem | null {
        const wanted = new Set(ids);
        return this.find(item => wanted.has(item.id));
    }

    dropAll(ids: number[]): number {
        let dropped = 0;
        for (const item of this.getAllById(ids)) {
            if (item.drop()) {
                dropped++;
            }
        }
        return dropped;
    }

    dropAllExcept(ids: number[]): number {
        const keep = new Set(ids);
        let dropped = 0;
        for (const item of this.getItems()) {
            if (!keep.has(item.id) && item.drop()) {
                dropped++;
            }
        }
        return dropped;
    }

    use(itemId: number): boolean {
        return this.useById(itemId);
    }

    useById(itemId: number): boolean {
        const item = this.getItemById(itemId);
        return item?.use() ?? false;
    }
}