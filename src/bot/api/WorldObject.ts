import type BotAPI from "./BotAPI";

/** World object enumeration is not yet ported to the 254 scene graph; returns empty until implemented. */
export default class WorldObject {
    api: BotAPI;

    constructor(api: BotAPI) {
        this.api = api;
    }

    getAll() {
        if (!this.api.isLoggedIn()) {
            return [];
        }
        return [];
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
