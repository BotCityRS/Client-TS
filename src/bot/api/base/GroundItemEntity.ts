import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import ObjType from '#/config/ObjType.js';
import type ClientObj from '#/dash3d/ClientObj.js';
import type BotAPI from "../BotAPI";
import type InvInterfaceItem from './InvInterfaceItem';

export type GroundItemTilePosition = {
    x: number;
    z: number;
    plane: number;
};

const GROUND_ITEM_OPCODES: readonly number[] = [
    MiniMenuAction.OP_OBJ1,
    MiniMenuAction.OP_OBJ2,
    MiniMenuAction.OP_OBJ3,
    MiniMenuAction.OP_OBJ4,
    MiniMenuAction.OP_OBJ5
];

export default class GroundItemEntity {
    api: BotAPI;
    x: number;
    z: number;
    id: number;
    count: number;
    playerDist: number;
    private readonly objRef: ClientObj | null;

    constructor(api: BotAPI, id: number, count: number, x: number, z: number, objRef: ClientObj | null = null) {
        this.api = api;
        this.id = id;
        this.count = count;
        this.x = x;
        this.z = z;
        this.playerDist = Number.MAX_SAFE_INTEGER;
        this.objRef = objRef;
    }

    get type(): ObjType | null {
        try {
            return ObjType.list(this.id);
        } catch {
            return null;
        }
    }

    get groundOps(): readonly (string | null)[] {
        return this.type?.op ?? [];
    }

    get name(): string | null {
        return this.type?.name ?? null;
    }

    get description(): string | null {
        return this.type?.desc ?? null;
    }

    get stackable(): boolean {
        return this.type?.stackable ?? false;
    }

    get members(): boolean {
        return this.type?.members ?? false;
    }

    get plane(): number {
        return this.api.surface.currentLevel;
    }

    getLocalPosition(): GroundItemTilePosition {
        return {
            x: this.x,
            z: this.z,
            plane: this.plane
        };
    }

    getWorldPosition(): GroundItemTilePosition {
        return {
            x: this.x + this.api.surface.sceneBaseTileX,
            z: this.z + this.api.surface.sceneBaseTileZ,
            plane: this.plane
        };
    }

    distance(): number {
        return this.playerDist;
    }

    pathfindSteps(): number {
        const srcX = this.api.player.getLocalX();
        const srcZ = this.api.player.getLocalZ();
        if (srcX < 0 || srcZ < 0) {
            return -1;
        }
        return this.api.surface.pathfindStepsToTile(srcX, srcZ, this.x, this.z);
    }

    isReachable(maxSteps: number = Number.POSITIVE_INFINITY): boolean {
        const steps = this.pathfindSteps();
        return steps >= 0 && steps <= maxSteps;
    }

    isStale(): boolean {
        if (!this.objRef) {
            return false;
        }
        const list = this.api.surface.getGroundObjList(this.x, this.z);
        if (!list) {
            return true;
        }
        let obj: ClientObj | null = list.head();
        let loops = 64;
        while (obj && loops-- > 0) {
            if (obj === this.objRef) {
                return false;
            }
            obj = list.next();
        }
        return true;
    }

    private isLiveGroundItem(action: string): boolean {
        if (!this.isStale()) {
            return true;
        }
        this.api.bot.log('WARN', action, 'stale ground item wrapper; item no longer exists at tile', {
            id: this.id,
            count: this.count,
            x: this.x,
            z: this.z,
            plane: this.plane
        });
        return false;
    }

    private groundOpLabel(slot: number): string | null {
        return this.groundOps[slot] ?? (slot === 2 ? 'Take' : null);
    }

    private findGroundOpSlotByEquals(verb: string): number | null {
        const want = verb.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = this.groundOpLabel(i);
            if (op?.toLowerCase() === want) {
                return i;
            }
        }
        return null;
    }

    private findGroundOpSlotByIncludes(needle: string): number | null {
        const lower = needle.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = this.groundOpLabel(i);
            if (op?.toLowerCase().includes(lower)) {
                return i;
            }
        }
        return null;
    }

    interact(optionIndex: number): boolean {
        const opcode = GROUND_ITEM_OPCODES[optionIndex];
        if (opcode === undefined) {
            this.api.bot.log('WARN', 'GroundItemEntity.interact', 'optionIndex out of range', {
                id: this.id,
                x: this.x,
                z: this.z,
                optionIndex
            });
            return false;
        }
        if (!this.isLiveGroundItem('GroundItemEntity.interact')) {
            return false;
        }
        this.api.doAction(opcode, this.id, this.x, this.z);
        return true;
    }

    interactByOpEquals(verb: string): boolean {
        const slot = this.findGroundOpSlotByEquals(verb);
        if (slot === null) {
            this.api.bot.log('WARN', 'GroundItemEntity.interactByOpEquals', 'no matching ground item op', {
                id: this.id,
                x: this.x,
                z: this.z,
                verb,
                ops: [...this.groundOps]
            });
            return false;
        }
        return this.interact(slot);
    }

    interactByOpIncludes(needle: string): boolean {
        const slot = this.findGroundOpSlotByIncludes(needle);
        if (slot === null) {
            this.api.bot.log('WARN', 'GroundItemEntity.interactByOpIncludes', 'no matching ground item op', {
                id: this.id,
                x: this.x,
                z: this.z,
                needle,
                ops: [...this.groundOps]
            });
            return false;
        }
        return this.interact(slot);
    }

    pickUp(): boolean {
        this.api.bot.log('INFO', 'GroundItemEntity.pickUp', 'pickUp', { id: this.id, x: this.x, z: this.z });
        // Must match Client ground-object menu: default "Take" and op[2] use OP_OBJ3 → OPOBJ3 / type.op[2] on server.
        return this.interact(2);
    }

    examine(): boolean {
        if (!this.isLiveGroundItem('GroundItemEntity.examine')) {
            return false;
        }
        this.api.doAction(MiniMenuAction.OP_OBJ6, this.id, this.x, this.z);
        return true;
    }

    useItem(item: InvInterfaceItem): boolean {
        if (!this.isLiveGroundItem('GroundItemEntity.useItem')) {
            return false;
        }
        return item.useOnGroundItem(this);
    }
}