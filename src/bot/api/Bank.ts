import { BOT_MENU_BANK_CLOSE } from '../botLegacyMenuOpcodes.js';
import BankInterfaceItem from "./base/BankInterfaceItem";
import ItemContainer from "./base/ItemContainer";
import type WorldObjectEntity from "./base/WorldObjectEntity";
import type BotAPI from "./BotAPI";

const BANK_ROOT_IF = 2005;
const BANK_BOOTH_LOC_IDS = [2213, 3045];
const BANK_CHEST_LOC_IDS = [3193];
const BANKER_NPC_IDS = [494, 495, 496, 497, 498, 499, 902, 1036, 166, 953];

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
        this.depositScanCursor = 0;
    }

    isOpen() {
        return this.api.surface.isBankSidebarOpen(BANK_ROOT_IF);
    }

    private interactBankLoc(loc: WorldObjectEntity): boolean {
        const ops = loc.locType.op;
        const acceptedOps = ['bank', 'use-quickly', 'use', 'open'];
        if (ops) {
            for (const accepted of acceptedOps) {
                for (let i = 4; i >= 0; i--) {
                    const op = ops[i];
                    if (op?.toLowerCase() === accepted) {
                        this.api.bot.log('INFO', 'Bank.open', 'interact bank loc', {
                            id: loc.id,
                            opSlot: i,
                            op
                        });
                        loc.interact(i);
                        return true;
                    }
                }
            }
        }
        this.api.bot.log('INFO', 'Bank.open', 'interact bank loc fallback op1', { id: loc.id });
        loc.interact(0);
        return true;
    }

    open() {
        const bankLocIds = [...BANK_BOOTH_LOC_IDS, ...BANK_CHEST_LOC_IDS];
        const bankLoc = this.api.worldObject.getNearestByIdPath(bankLocIds, 30)
            ?? this.api.worldObject.getNearestById(bankLocIds, 200);
        if (bankLoc) {
            return this.interactBankLoc(bankLoc);
        }

        const banker = this.api.npc.getNPCByIdsNearest(BANKER_NPC_IDS);
        if (banker) {
            if (banker.interactByOpEquals('Bank') || banker.interactByOpIncludes('bank')) {
                this.api.bot.log('INFO', 'Bank.open', 'interact banker by bank op', { id: banker.id });
                return true;
            }
            if (banker.interactByOpEquals('Talk-to')) {
                this.api.bot.log('INFO', 'Bank.open', 'interact banker talk-to fallback', { id: banker.id });
                return true;
            }
        }

        this.api.bot.log('WARN', 'Bank.open', 'no bank loc or banker nearby');
        return false;
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
        const keep = ids.filter(id => id >= 0);
        this.onOpen();
        for (let s = 0; s < this.api.inventory.getContainerSize(); ++s) {
            const item = this.api.inventory.getItemBySlot(s);
            if (item && !keep.includes(item.id)) {
                item.depositAll();
            }
        }
    }

    /** True if any inventory stack is not listed in `keepIds` (ignores negative ids). */
    hasDepositableItems(keepIds: number[]): boolean {
        const keep = keepIds.filter(id => id >= 0);
        const size = this.api.inventory.getContainerSize();
        for (let s = 0; s < size; s++) {
            const item = this.api.inventory.getItemBySlot(s);
            if (item && !keep.includes(item.id)) {
                return true;
            }
        }
        return false;
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
