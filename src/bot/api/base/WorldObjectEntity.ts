import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type LocType from '#/config/LocType';
import type BotAPI from '../BotAPI';
import Utility from "../Utility";
import type InvInterfaceItem from './InvInterfaceItem';

export type WorldObjectTilePosition = {
    x: number;
    z: number;
    plane: number;
};

const LOC_INTERACT_OPCODES: readonly number[] = [
    MiniMenuAction.OP_LOC1,
    MiniMenuAction.OP_LOC2,
    MiniMenuAction.OP_LOC3,
    MiniMenuAction.OP_LOC4,
    MiniMenuAction.OP_LOC5
];

export default class WorldObjectEntity {
    api: BotAPI;
    x: number;
    z: number;
    id: number;
    typecode: number;
    locType: LocType;
    playerDist: number;

    constructor(api: BotAPI, id: number, x: number, z: number, typecode: number, locType: LocType) {
        this.api = api;
        this.id = id;
        this.x = x;
        this.z = z;
        this.typecode = typecode;
        this.locType = locType;
        this.playerDist = Utility.getDistance(api.player.getLocalX(), api.player.getLocalZ(), x, z);
    }

    get name(): string | null {
        return this.locType.name ?? null;
    }

    get description(): string | null {
        return this.locType.desc ?? null;
    }

    get ops(): readonly (string | null)[] {
        return this.locType.op ?? [];
    }

    get shape(): number {
        const info = this.getLiveInfo();
        return info == null ? -1 : info & 0x1f;
    }

    get angle(): number {
        const info = this.getLiveInfo();
        return info == null ? -1 : (info >> 6) & 0x3;
    }

    get width(): number {
        return this.locType.width;
    }

    get length(): number {
        return this.locType.length;
    }

    get plane(): number {
        return this.api.surface.currentLevel;
    }

    getLocalPosition(): WorldObjectTilePosition {
        return {
            x: this.x,
            z: this.z,
            plane: this.plane
        };
    }

    getWorldPosition(): WorldObjectTilePosition {
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
        return this.api.worldObject.getPathfindSteps(this);
    }

    isReachable(maxSteps: number = Number.POSITIVE_INFINITY): boolean {
        const steps = this.pathfindSteps();
        return steps >= 0 && steps <= maxSteps;
    }

    private getLiveInfo(): number | null | undefined {
        const world = this.api.surface.world;
        if (!world) {
            return undefined;
        }
        const info = world.typeCode2(this.plane, this.x, this.z, this.typecode);
        return info >= 0 ? info : null;
    }

    isStale(): boolean {
        return this.getLiveInfo() === null;
    }

    private isLiveObject(action: string): boolean {
        const info = this.getLiveInfo();
        if (info !== null) {
            return true;
        }
        this.api.bot.log('WARN', action, 'stale world object wrapper; typecode no longer exists at tile', {
            id: this.id,
            typecode: this.typecode,
            x: this.x,
            z: this.z,
            plane: this.plane
        });
        return false;
    }

    interact(optionIndex: number): boolean {
        if (!this.isLiveObject('WorldObjectEntity.interact')) {
            return false;
        }
        // `Client.doAction` OP_LOC* passes `interactWithLoc(b, c, a, …)` — same as the real menu:
        // param A = packed typecode; B/C = low bits of typecode (scene fine tile indices), not model x/z.
        const lx = this.typecode & 0x7f;
        const lz = (this.typecode >> 7) & 0x7f;
        const opcode = LOC_INTERACT_OPCODES[optionIndex] ?? MiniMenuAction.OP_LOC1;
        this.api.doAction(opcode, this.typecode, lx, lz);
        return true;
    }

    interactByOpEquals(verb: string): boolean {
        const ops = this.locType.op;
        if (!ops) {
            this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpEquals', 'loc has no ops', {
                id: this.id,
                verb
            });
            return false;
        }
        const want = verb.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = ops[i];
            if (op === null || op === undefined) {
                continue;
            }
            if (op.toLowerCase() === want) {
                this.api.bot.log('INFO', 'WorldObjectEntity.interactByOpEquals', 'matched', {
                    id: this.id,
                    verb,
                    opSlot: i
                });
                return this.interact(i);
            }
        }
        this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpEquals', 'no matching op', {
            id: this.id,
            verb,
            ops: [...ops]
        });
        return false;
    }

    interactByOpIncludes(needle: string): boolean {
        const ops = this.locType.op;
        if (!ops) {
            this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpIncludes', 'loc has no ops', {
                id: this.id,
                needle
            });
            return false;
        }
        const lower = needle.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = ops[i];
            if (op === null || op === undefined) {
                continue;
            }
            if (op.toLowerCase().includes(lower)) {
                this.api.bot.log('INFO', 'WorldObjectEntity.interactByOpIncludes', 'matched', {
                    id: this.id,
                    needle,
                    verb: op,
                    opSlot: i
                });
                return this.interact(i);
            }
        }
        this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpIncludes', 'no matching op', {
            id: this.id,
            needle,
            ops: [...ops]
        });
        return false;
    }

    examine(): boolean {
        if (!this.isLiveObject('WorldObjectEntity.examine')) {
            return false;
        }
        const lx = this.typecode & 0x7f;
        const lz = (this.typecode >> 7) & 0x7f;
        this.api.doAction(MiniMenuAction.OP_LOC6, this.typecode, lx, lz);
        return true;
    }

    useItem(item: InvInterfaceItem): boolean {
        if (!this.isLiveObject('WorldObjectEntity.useItem')) {
            return false;
        }
        return item.useOnObject(this);
    }
}