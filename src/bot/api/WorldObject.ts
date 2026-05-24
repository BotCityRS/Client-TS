import { BuildArea } from '#/dash3d/CollisionMap.js';
import LocType from '#/config/LocType.js';
import type World from '#/dash3d/World.js';
import WorldObjectEntity from './base/WorldObjectEntity.js';
import type BotAPI from "./BotAPI";
import Utility from './Utility';

export type WorldObjectNameMatcher = string | RegExp;

export type WorldObjectSearchArea = {
    x1: number;
    z1: number;
    x2: number;
    z2: number;
};

export type WorldObjectSearchOptions = {
    maxDistance?: number;
    area?: WorldObjectSearchArea;
    reachable?: boolean;
    maxSteps?: number;
    plane?: number;
    op?: string;
    exactOp?: boolean;
};

function pushLocTypecode(api: BotAPI, typecode: number, seen: Set<number>, out: WorldObjectEntity[]): void {
    if (!typecode || seen.has(typecode)) {
        return;
    }
    if (((typecode >> 29) & 3) !== 2) {
        return;
    }
    seen.add(typecode);
    const locId = (typecode >> 14) & 0x7fff;
    const lx = typecode & 0x7f;
    const lz = (typecode >> 7) & 0x7f;
    out.push(new WorldObjectEntity(api, locId, lx, lz, typecode, LocType.list(locId)));
}

export default class WorldObject {
    api: BotAPI;

    constructor(api: BotAPI) {
        this.api = api;
    }

    getAll(): WorldObjectEntity[] {
        if (!this.api.isLoggedIn()) {
            return [];
        }
        const world = this.api.surface.world as World | null;
        if (!world) {
            return [];
        }
        const level = this.api.surface.currentLevel;
        const out: WorldObjectEntity[] = [];
        const seen = new Set<number>();
        const size = BuildArea.SIZE;
        for (let tx = 0; tx < size; tx++) {
            for (let tz = 0; tz < size; tz++) {
                pushLocTypecode(this.api, world.sceneType(level, tx, tz), seen, out);
                pushLocTypecode(this.api, world.wallType(level, tx, tz), seen, out);
                pushLocTypecode(this.api, world.decorType(level, tz, tx), seen, out);
                pushLocTypecode(this.api, world.gdType(level, tx, tz), seen, out);
            }
        }
        return out;
    }

    private nameMatches(name: string | null, matcher: WorldObjectNameMatcher): boolean {
        if (!name) {
            return false;
        }
        if (matcher instanceof RegExp) {
            return matcher.test(name);
        }
        return name.toLowerCase() === matcher.toLowerCase();
    }

    private opMatches(wo: WorldObjectEntity, op: string, exact: boolean): boolean {
        const want = op.toLowerCase();
        return wo.ops.some(label => {
            const lower = label?.toLowerCase();
            return exact ? lower === want : lower?.includes(want) === true;
        });
    }

    private matchesOptions(wo: WorldObjectEntity, opts?: WorldObjectSearchOptions): boolean {
        if (opts?.maxDistance !== undefined && wo.distance() > opts.maxDistance) {
            return false;
        }
        const worldPos = wo.getWorldPosition();
        if (opts?.plane !== undefined && worldPos.plane !== opts.plane) {
            return false;
        }
        if (opts?.area) {
            const { x1, z1, x2, z2 } = opts.area;
            if (worldPos.x < x1 || worldPos.x > x2 || worldPos.z < z1 || worldPos.z > z2) {
                return false;
            }
        }
        if (opts?.op && !this.opMatches(wo, opts.op, opts.exactOp ?? true)) {
            return false;
        }
        if (opts?.reachable && !wo.isReachable(opts.maxSteps ?? Number.POSITIVE_INFINITY)) {
            return false;
        }
        return true;
    }

    private nearest(objects: WorldObjectEntity[]): WorldObjectEntity | null {
        let closest: WorldObjectEntity | null = null;
        for (const wo of objects) {
            if (!closest || wo.distance() < closest.distance()) {
                closest = wo;
            }
        }
        return closest;
    }

    getById(ids: number[], opts?: WorldObjectSearchOptions): WorldObjectEntity[] {
        return this.getAll().filter(wo => ids.includes(wo.id) && this.matchesOptions(wo, opts));
    }

    getByName(name: WorldObjectNameMatcher, opts?: WorldObjectSearchOptions): WorldObjectEntity[] {
        return this.getAll().filter(wo => this.nameMatches(wo.name, name) && this.matchesOptions(wo, opts));
    }

    getNearestByName(name: WorldObjectNameMatcher, opts?: WorldObjectSearchOptions): WorldObjectEntity | null {
        return this.nearest(this.getByName(name, opts));
    }

    getByOp(op: string, opts?: WorldObjectSearchOptions & { exact?: boolean }): WorldObjectEntity[] {
        return this.getAll().filter(wo => this.opMatches(wo, op, opts?.exact ?? true) && this.matchesOptions(wo, opts));
    }

    getNearestByOp(op: string, opts?: WorldObjectSearchOptions & { exact?: boolean }): WorldObjectEntity | null {
        return this.nearest(this.getByOp(op, opts));
    }

    getNearest(predicate: (wo: WorldObjectEntity) => boolean, opts?: WorldObjectSearchOptions): WorldObjectEntity | null {
        return this.nearest(this.getAll().filter(wo => predicate(wo) && this.matchesOptions(wo, opts)));
    }

    getAt(worldX: number, worldZ: number, ids?: number[]): WorldObjectEntity[] {
        const wanted = ids ? new Set(ids) : null;
        return this.getAll().filter(wo => {
            const pos = wo.getWorldPosition();
            return pos.x === worldX && pos.z === worldZ && (!wanted || wanted.has(wo.id));
        });
    }

    getNear(worldX: number, worldZ: number, radius: number, ids?: number[]): WorldObjectEntity[] {
        const wanted = ids ? new Set(ids) : null;
        return this.getAll()
            .filter(wo => {
                if (wanted && !wanted.has(wo.id)) {
                    return false;
                }
                const pos = wo.getWorldPosition();
                return Utility.getDistance(pos.x, pos.z, worldX, worldZ) <= radius;
            })
            .sort((a, b) => {
                const pa = a.getWorldPosition();
                const pb = b.getWorldPosition();
                return Utility.getDistance(pa.x, pa.z, worldX, worldZ) - Utility.getDistance(pb.x, pb.z, worldX, worldZ);
            });
    }

    getNearestById(ids: number[], maxDistance: number = 200): WorldObjectEntity | null {
        return this.nearest(this.getById(ids).filter(wo => wo.distance() <= maxDistance));
    }

    /** Shortest walkable steps from the player to interact with this loc; -1 if unreachable. */
    getPathfindSteps(wo: WorldObjectEntity): number {
        if (!this.api.isLoggedIn()) {
            return -1;
        }
        const srcX = this.api.player.getLocalX();
        const srcZ = this.api.player.getLocalZ();
        if (srcX < 0 || srcZ < 0) {
            return -1;
        }
        return this.api.surface.pathfindStepsToLoc(srcX, srcZ, wo.x, wo.z, wo.typecode);
    }

    getNearestByIdPath(ids: number[], maxSteps: number = 100): WorldObjectEntity | null {
        const srcX = this.api.player.getLocalX();
        const srcZ = this.api.player.getLocalZ();
        if (srcX < 0 || srcZ < 0) {
            return null;
        }
        const worldObjects = this.getById(ids);
        let closest: WorldObjectEntity | null = null;
        let bestSteps = Number.POSITIVE_INFINITY;
        for (let i = 0; i < worldObjects.length; i++) {
            const wo = worldObjects[i]!;
            const steps = this.api.surface.pathfindStepsToLoc(srcX, srcZ, wo.x, wo.z, wo.typecode);
            if (steps < 0 || steps > maxSteps) {
                continue;
            }
            if (steps < bestSteps) {
                bestSteps = steps;
                closest = wo;
            }
        }
        return closest;
    }
}
