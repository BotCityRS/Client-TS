import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type ObjType from '#/config/ObjType.js';
import { getEquipmentSlotName, type EquipmentSlotName } from "../EquipmentSlots";
import type BotAPI from "../BotAPI";
import InterfaceItem from "./InterfaceItem";

const EQUIPMENT_BUTTON_OPCODES: readonly number[] = [
    MiniMenuAction.INV_BUTTON1,
    MiniMenuAction.INV_BUTTON2,
    MiniMenuAction.INV_BUTTON3,
    MiniMenuAction.INV_BUTTON4,
    MiniMenuAction.INV_BUTTON5
];

export default class EquipmentInterfaceItem extends InterfaceItem {
    bankOpenInterfaceId: number = 2006;

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number, itemType: ObjType | null = null) {
        super(api, interfaceId, slot, id, count, itemType);
    }

    get slotId(): number {
        return this.slot;
    }

    get slotName(): EquipmentSlotName | null {
        return getEquipmentSlotName(this.slot);
    }

    private equipmentOpLabel(slot: number): string | null {
        const ops = this.api.interface.getInterface(this.interfaceId)?.iop;
        return ops?.[slot] ?? (slot === 0 ? 'Remove' : null);
    }

    private findEquipmentOpSlotByEquals(verb: string): number | null {
        const want = verb.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = this.equipmentOpLabel(i);
            if (op?.toLowerCase() === want) {
                return i;
            }
        }
        return null;
    }

    private findEquipmentOpSlotByIncludes(needle: string): number | null {
        const lower = needle.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = this.equipmentOpLabel(i);
            if (op?.toLowerCase().includes(lower)) {
                return i;
            }
        }
        return null;
    }

    interact(optionIndex: number): boolean {
        const opcode = EQUIPMENT_BUTTON_OPCODES[optionIndex];
        if (opcode === undefined) {
            this.api.bot.log('WARN', 'EquipmentInterfaceItem.interact', 'optionIndex out of range', {
                id: this.id,
                slot: this.slot,
                interfaceId: this.interfaceId,
                optionIndex
            });
            return false;
        }
        if (!this.isLiveSlot('EquipmentInterfaceItem.interact')) {
            return false;
        }
        this.api.doAction(opcode, this.id, this.slot, this.interfaceId);
        return true;
    }

    interactByOpEquals(verb: string): boolean {
        const slot = this.findEquipmentOpSlotByEquals(verb);
        if (slot === null) {
            this.api.bot.log('WARN', 'EquipmentInterfaceItem.interactByOpEquals', 'no matching equipment op', {
                id: this.id,
                slot: this.slot,
                verb
            });
            return false;
        }
        return this.interact(slot);
    }

    interactByOpIncludes(needle: string): boolean {
        const slot = this.findEquipmentOpSlotByIncludes(needle);
        if (slot === null) {
            this.api.bot.log('WARN', 'EquipmentInterfaceItem.interactByOpIncludes', 'no matching equipment op', {
                id: this.id,
                slot: this.slot,
                needle
            });
            return false;
        }
        return this.interact(slot);
    }

    unequip(): boolean {
        return this.interactByOpEquals('Remove');
    }
}