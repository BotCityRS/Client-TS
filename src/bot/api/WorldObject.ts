import LocType from "#/config/LocType";
import type Location from "#/dash3d/type/Loc";
import ClientEntity from "./base/ClientNPCEntity";
import WorldObjectEntity from "./base/WorldObjectEntity";
import type BotAPI from "./BotAPI";

export default class WorldObject {
    api: BotAPI;

    constructor(api: BotAPI) {
        this.api = api;
    }

    getAll() {
        let worldObjectEntities: WorldObjectEntity[] = [];
        if (!this.api.isLoggedIn()){
            return [];
        }
        const currentLevel = this.api.client.currentLevel;
        const lvlTiles = this.api.client.scene?.levelTiles[currentLevel]
        for (let x = 0; x < 104; ++x) {
            for (let z = 0; z < 104; ++z) {
                const tileLocs = lvlTiles?.[x][z]?.locs ?? [];
                tileLocs.forEach(loc => {
                    if (loc) {
                        const locX: number = loc.typecode & 0x7f;
                        const locZ: number = (loc.typecode >> 7) & 0x7f;
                        const entityType: number = (loc.typecode >> 29) & 0x3;
                        const typeId: number = (loc.typecode >> 14) & 0x7fff;
                        worldObjectEntities.push(new WorldObjectEntity(this.api, typeId, locX, locZ, loc.typecode, LocType.get(typeId)))
                    }
                });
            }
        }
        return worldObjectEntities;
    }

    getById(ids: number[]) {
        let worldObjects = this.getAll();
        let sorted:WorldObjectEntity[] = [];
        worldObjects.forEach(wo => {
            if (ids.includes(wo.id)) {
                sorted.push(wo)
            }
        })
        return sorted;
    }

    getNearestById(ids: number[], maxDistance: number = 200): WorldObjectEntity|null {
        let worldObjects = this.getById(ids);
        let closest: WorldObjectEntity|null = null;
        worldObjects.forEach(wo => {
            if (wo.playerDist <= maxDistance && (!closest || wo.playerDist < closest.playerDist)) {
                closest = wo;
            }
        })
        return closest;
    }
}