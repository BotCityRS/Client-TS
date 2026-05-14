import type ClientObj from "#/dash3d/ClientObj.js";
import GroundItemEntity from "./base/GroundItemEntity";
import type BotAPI from "./BotAPI";
import Utility from "./Utility";

export default class GroundItem {
    api: BotAPI;

    constructor(api: BotAPI) {
        this.api = api;
    }

    getGroundItems(): GroundItemEntity[] {
        const items: GroundItemEntity[] = [];
        for (let x = 0; x < 104; ++x) {
            for (let z = 0; z < 104; ++z) {
                const list = this.api.surface.getGroundObjList(x, z);
                if (!list) {
                    continue;
                }
                let obj: ClientObj | null = list.head();
                let loops = 10;
                while (obj && loops-- > 0) {
                    items.push(new GroundItemEntity(this.api, obj.id, obj.count, x, z));
                    obj = list.next();
                }
            }
        }
        return items;
    }

    getGroundItemsById(ids: number[]): GroundItemEntity[] {
        const items: GroundItemEntity[] = [];
        for (let x = 0; x < 104; ++x) {
            for (let z = 0; z < 104; ++z) {
                const list = this.api.surface.getGroundObjList(x, z);
                if (!list) {
                    continue;
                }
                let obj: ClientObj | null = list.head();
                let loops = 32;
                while (obj && loops-- > 0) {
                    if (Utility.includes(ids, obj.id)) {
                        items.push(new GroundItemEntity(this.api, obj.id, obj.count, x, z));
                    }
                    obj = list.next();
                }
            }
        }
        return items;
    }

    getNearestGroundItemById = (ids: number[], maxDist: number) => {
        const groundItems = this.getGroundItemsById(ids);
        if (groundItems.length == 0) {
            return null;
        }

        let nearestItem: GroundItemEntity | null = null;
        for (let i = 0; i < groundItems.length; ++i) {
            const dist = Utility.getDistance(this.api.player.getLocalX(), this.api.player.getLocalZ(), groundItems[i].x, groundItems[i].z);
            groundItems[i].playerDist = dist;
            if (dist > maxDist) {
                break;
            }
            if (!nearestItem || dist < nearestItem.playerDist) {
                nearestItem = groundItems[i];
            }
        }
        if (nearestItem) {
            this.api.bot.log('DEBUG', 'GroundItem.getNearestGroundItemById', 'picked', {
                ids,
                maxDist,
                id: nearestItem.id,
                x: nearestItem.x,
                z: nearestItem.z,
                playerDist: nearestItem.playerDist
            });
        }
        return nearestItem;
    };
}
