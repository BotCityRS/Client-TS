import { BOT_MENU_BANK_CLOSE } from '../botLegacyMenuOpcodes.js';
import BankInterfaceItem from "./base/BankInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import BotAPI from "./BotAPI";

const BANK_ROOT_IF = 2005;

export default class Bank extends ItemContainer<BankInterfaceItem> {
    bankOpenState: boolean;

    /** Next inventory slot to try for `depositOneIfNotKept` (avoids hammering slot 0 while UI lags). */
    private depositScanCursor: number = 0;

    constructor(api: BotAPI) {
        super(api, 5382, BankInterfaceItem);
        this.bankOpenState = this.isOpen();
        setInterval(() => {
            if (this.isOpen() != this.bankOpenState) {
                this.bankOpenState = !this.bankOpenState;
                if (this.bankOpenState) {
                    this.onOpen();
                } else {
                    this.onClose();
                }
            }
        }, 100);
    }

    onOpen() {
        this.api.inventory.interfaceId = 2006;
    }

    onClose() {
        this.api.inventory.interfaceId = 3214;
    }

    isOpen() {
        return this.api.surface.isBankSidebarOpen(BANK_ROOT_IF);
    }

    open() {
        const bankBooth = this.api.worldObject.getNearestById([2213]);
        if (!bankBooth) {
            this.api.bot.log('WARN', 'Bank.open', 'no bank booth world object id 2213 nearby');
            return false;
        }
        this.api.bot.log('INFO', 'Bank.open', 'interact booth');
        bankBooth.interact(1);
        return true;
    }

    close() {
        this.api.bot.log('INFO', 'Bank.close', 'doAction close');
        this.api.doAction(BOT_MENU_BANK_CLOSE, -1, -1, 5384);
    }

    async withdraw(id: number, amount: number = 1) {
        await this.getItemById(id)?.withdraw(amount);
    }

    depositAll() {
        this.onOpen();
        for (let s = 0; s < this.api.inventory.getContainerSize(); ++s) {
            this.api.inventory.getItemBySlot(s)?.depositAll();
        }
    }

    depositAllExcept(ids: number[]) {
        this.onOpen();
        for (let s = 0; s < this.api.inventory.getContainerSize(); ++s) {
            const item = this.api.inventory.getItemBySlot(s);
            if (item && !ids.includes(item.id)) {
                item?.depositAll();
            }
        }
    }

    /**
     * Deposits one inventory stack that is not in `keepIds` (ignores negative ids).
     * Call once per bot tick so the client is not flooded with deposit packets.
     * Scans from a rotating cursor so the same slot (e.g. shrimp still visible before the
     * server updates the widget) is not retried every tick while other stacks can be cleared.
     */
    depositOneIfNotKept(keepIds: number[]): boolean {
        const keep = keepIds.filter(id => id >= 0);
        this.onOpen();
        const size = this.api.inventory.getContainerSize();
        if (size <= 0) {
            this.depositScanCursor = 0;
            return false;
        }
        const start = this.depositScanCursor % size;
        for (let k = 0; k < size; k++) {
            const s = (start + k) % size;
            const item = this.api.inventory.getItemBySlot(s);
            if (item && !keep.includes(item.id)) {
                item.depositAll();
                this.depositScanCursor = (s + 1) % size;
                return true;
            }
        }
        this.depositScanCursor = 0;
        return false;
    }
}
