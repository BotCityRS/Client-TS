import type BotAPI from "../BotAPI";
import type ObjType from "#/config/ObjType.js";

export default class InterfaceItem {
    api: BotAPI;

    interfaceId: number;
    slot: number;
    id: number;
    count: number;
    private readonly itemType: ObjType | null;

    constructor(api: BotAPI, interfaceId: number, slot: number, id: number, count: number, itemType: ObjType | null = null) {
        this.api = api;
        this.interfaceId = interfaceId;
        this.slot = slot;
        this.id = id;
        this.count = count;
        this.itemType = itemType;
    }

    get type(): ObjType | null {
        return this.itemType;
    }

    get name(): string | null {
        return this.type?.name ?? null;
    }

    get description(): string | null {
        return this.type?.desc ?? null;
    }

    get inventoryOps(): readonly (string | null)[] {
        return this.type?.iop ?? [];
    }

    get groundOps(): readonly (string | null)[] {
        return this.type?.op ?? [];
    }

    get stackable(): boolean {
        return this.type?.stackable ?? false;
    }

    get members(): boolean {
        return this.type?.members ?? false;
    }

    get equipable(): boolean {
        const t = this.type;
        return !!t && (t.manwear >= 0 || t.manwear2 >= 0 || t.manwear3 >= 0 || t.womanwear >= 0 || t.womanwear2 >= 0 || t.womanwear3 >= 0);
    }

    private getLiveSlotItemId(interfaceId: number = this.interfaceId): number | null | undefined {
        const component = this.api.interface.getInterface(interfaceId);
        const types = component?.linkObjType;
        if (!types || this.slot < 0 || this.slot >= types.length) {
            return undefined;
        }
        const rawId = types[this.slot];
        return rawId > 0 ? rawId - 1 : null;
    }

    isStale(): boolean {
        const liveId = this.getLiveSlotItemId();
        return liveId !== undefined && liveId !== this.id;
    }

    protected isLiveSlot(action: string, interfaceId: number = this.interfaceId): boolean {
        const liveId = this.getLiveSlotItemId(interfaceId);
        if (liveId === undefined || liveId === this.id) {
            return true;
        }
        this.api.bot.log('WARN', action, 'stale item wrapper; slot no longer contains expected item', {
            interfaceId,
            slot: this.slot,
            expectedId: this.id,
            liveId
        });
        return false;
    }

    protected inventoryOpLabel(slot: number): string | null {
        return this.inventoryOps[slot] ?? (slot === 4 ? 'Drop' : null);
    }

    protected findInventoryOpSlotByEquals(verb: string): number | null {
        const want = verb.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = this.inventoryOpLabel(i);
            if (op?.toLowerCase() === want) {
                return i;
            }
        }
        return null;
    }

    protected findInventoryOpSlotByIncludes(needle: string): number | null {
        const lower = needle.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = this.inventoryOpLabel(i);
            if (op?.toLowerCase().includes(lower)) {
                return i;
            }
        }
        return null;
    }
}