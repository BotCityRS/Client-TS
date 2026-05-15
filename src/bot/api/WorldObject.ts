import { BuildArea } from '#/dash3d/CollisionMap.js';
import LocType from '#/config/LocType.js';
import type World from '#/dash3d/World.js';
import WorldObjectEntity from './base/WorldObjectEntity.js';
import type BotAPI from "./BotAPI";

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

    getAll() {
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

    getById(ids: number[]) {
        return this.getAll().filter(wo => ids.includes(wo.id));
    }

    getNearestById(ids: number[], maxDistance: number = 200) {
        const worldObjects = this.getById(ids);
        let closest: (typeof worldObjects)[0] | null = null;
        worldObjects.forEach(wo => {
            if (wo.playerDist <= maxDistance && (!closest || wo.playerDist < closest.playerDist)) {
                closest = wo;
            }
        });
        return closest;
    }
}
