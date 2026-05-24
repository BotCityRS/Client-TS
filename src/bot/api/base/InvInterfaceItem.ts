import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type ObjType from '#/config/ObjType.js';
import type BotAPI from "../BotAPI";
import type ClientNPCEntity from "./ClientNPCEntity";
import type GroundItemEntity from "./GroundItemEntity";
import InterfaceItem from "./InterfaceItem";
import type WorldObjectEntity from "./WorldObjectEntity";

const HELD_OPCODES: readonly number[] = [
    MiniMenuAction.OP_HELD1,
    MiniMenuAction.OP_HELD2,
    MiniMenuAction.OP_HELD3,
    MiniMenuAction.OP_HELD4,
    MiniMenuAction.OP_HELD5
];

export default class InvInterfaceItem extends InterfaceItem {
    bankOpenInterfaceId: number = 2006;

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number, itemType: ObjType | null = null) {
        super(api, interfaceId, slot, id, count, itemType);
    }

    interact(optionIndex: number): boolean {
        const opcode = HELD_OPCODES[optionIndex];
        if (opcode === undefined) {
            this.api.bot.log('WARN', 'InvInterfaceItem.interact', 'optionIndex out of range', {
                id: this.id,
                slot: this.slot,
                interfaceId: this.interfaceId,
                optionIndex
            });
            return false;
        }
        if (!this.isLiveSlot('InvInterfaceItem.interact')) {
            return false;
        }
        this.api.doAction(opcode, this.id, this.slot, this.interfaceId);
        return true;
    }

    interactByOpEquals(verb: string): boolean {
        const slot = this.findInventoryOpSlotByEquals(verb);
        if (slot === null) {
            this.api.bot.log('WARN', 'InvInterfaceItem.interactByOpEquals', 'no matching inventory op', {
                id: this.id,
                slot: this.slot,
                verb,
                ops: [...this.inventoryOps]
            });
            return false;
        }
        return this.interact(slot);
    }

    interactByOpIncludes(needle: string): boolean {
        const slot = this.findInventoryOpSlotByIncludes(needle);
        if (slot === null) {
            this.api.bot.log('WARN', 'InvInterfaceItem.interactByOpIncludes', 'no matching inventory op', {
                id: this.id,
                slot: this.slot,
                needle,
                ops: [...this.inventoryOps]
            });
            return false;
        }
        return this.interact(slot);
    }

    use(): boolean {
        if (!this.isLiveSlot('InvInterfaceItem.use')) {
            return false;
        }
        this.api.doAction(MiniMenuAction.USEHELD_START, this.id, this.slot, this.interfaceId);
        return true;
    }

    useOnItem(target: InterfaceItem): boolean {
        const targetStale = target.isStale();
        if (!this.isLiveSlot('InvInterfaceItem.useOnItem') || targetStale) {
            if (targetStale) {
                this.api.bot.log('WARN', 'InvInterfaceItem.useOnItem', 'target item wrapper is stale', {
                    targetInterfaceId: target.interfaceId,
                    targetSlot: target.slot,
                    targetId: target.id
                });
            }
            return false;
        }
        this.use();
        this.api.doAction(MiniMenuAction.USEHELD_ONHELD, target.id, target.slot, target.interfaceId);
        return true;
    }

    useOnObject(target: WorldObjectEntity): boolean {
        if (!this.use()) {
            return false;
        }
        const lx = target.typecode & 0x7f;
        const lz = (target.typecode >> 7) & 0x7f;
        this.api.doAction(MiniMenuAction.USEHELD_ONLOC, target.typecode, lx, lz);
        return true;
    }

    useOnNpc(target: ClientNPCEntity): boolean {
        if (!this.use()) {
            return false;
        }
        this.api.doAction(MiniMenuAction.USEHELD_ONNPC, target.uid, target.npc.routeX[0], target.npc.routeZ[0]);
        return true;
    }

    useOnGroundItem(target: GroundItemEntity): boolean {
        if (!this.use()) {
            return false;
        }
        this.api.doAction(MiniMenuAction.USEHELD_ONOBJ, target.id, target.x, target.z);
        return true;
    }

    drop(): boolean {
        return this.interact(4);
    }

    equip(): boolean {
        return this.interact(1);
    }

    deposit1(): boolean {
        if (!this.api.bank.isOpen()) {
            return false;
        }
        if (!this.isLiveSlot('InvInterfaceItem.deposit1', this.bankOpenInterfaceId)) {
            return false;
        }
        // Same as right-click Deposit 1 on the bank-side inventory (`Client` INV_BUTTON1 + INV_BUTTON1 prot).
        this.api.doAction(MiniMenuAction.INV_BUTTON1, this.id, this.slot, this.bankOpenInterfaceId);
        return true;
    }

    async deposit(count: number): Promise<boolean> {
        if (!this.isLiveSlot('InvInterfaceItem.deposit', this.bankOpenInterfaceId)) {
            return false;
        }
        this.api.doAction(MiniMenuAction.INV_BUTTON5, this.id, this.slot, this.bankOpenInterfaceId);
        return new Promise<boolean>((res) => {
            const timeout = Date.now() + 4000;
            const interval = setInterval(() => {
                if (this.api.interface.submitCountDialog(count)) {
                    clearInterval(interval);
                    res(true);
                } else if (Date.now() >= timeout) {
                    clearInterval(interval);
                    res(false);
                }
            }, 50);
        });
    }

    depositAll(): boolean {
        if (!this.isLiveSlot('InvInterfaceItem.depositAll', this.bankOpenInterfaceId)) {
            return false;
        }
        // `interface_bank/interfaces/bank_side.if`: option4=Deposit All → INV_BUTTON4 (see `Client` inv menu build).
        this.api.doAction(MiniMenuAction.INV_BUTTON4, this.id, this.slot, this.bankOpenInterfaceId);
        return true;
    }
}
