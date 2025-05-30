import type ObjStackEntity from "#/dash3d/entity/ObjStackEntity";
import ClientEntity from "./base/ClientNPCEntity";
import GroundItemEntity from "./base/GroundItemEntity";
import type BotAPI from "./BotAPI";
import Utility from "./Utility";

export default class GroundItem {
    api: BotAPI;
    
    constructor(api: BotAPI) {
        this.api = api;
    }

    getGroundItems(): GroundItemEntity[] {
        let items: GroundItemEntity[] = [];
        const currentLevel = this.api.client.currentLevel;
        const levelObjectStacks = this.api.client.objStacks;
        for (let x = 0; x < levelObjectStacks[currentLevel].length; ++x) {
            if (levelObjectStacks[currentLevel][x] != null) {
                for (let z = 0; z < levelObjectStacks[currentLevel][x].length; ++z) {
                    const itemStack = levelObjectStacks[currentLevel][x][z];
                    if (itemStack != null) {
                        let item = itemStack.sentinel.next as unknown as ObjStackEntity;
                        let loops = 10;
                        while(item.index != null && loops-- > 0) {
                            items.push(new GroundItemEntity(this.api, item.index, item.count, x, z));
                            item = item.next
                        }
                    }
                }
            }
        }
        return items;
    };

    getGroundItemsById(ids: number[]): GroundItemEntity[] {
        let items: GroundItemEntity[] = [];
        const currentLevel = this.api.client.currentLevel;
        const levelObjectStacks = this.api.client.objStacks;
        for (let x = 0; x < levelObjectStacks[currentLevel].length; ++x) {
            if (levelObjectStacks[currentLevel][x] != null) {
                for (let z = 0; z < levelObjectStacks[currentLevel][x].length; ++z) {
                    const itemStack = levelObjectStacks[currentLevel][x][z];
                    if (itemStack != null) {
                        let item = itemStack.sentinel.next as unknown as ObjStackEntity;
                        let loops = 32;
                        while(item.index != null && loops-- > 0) {
                            if (Utility.includes(ids, item.index)) {
                                items.push(new GroundItemEntity(this.api, item.index, item.count, x, z));
                                item = item.next
                            }
                        }
                    }
                }
            }
        }
        return items;
    };
    
    getNearestGroundItemById = (ids: number[], maxDist: number) => {
        if (!this.api.player) {
            return null;
        }
        const groundItems = this.getGroundItemsById(ids);
        if (groundItems.length == 0)
            return null;

        let nearestItem: GroundItemEntity|null = null;
        for (let i = 0; i < groundItems.length; ++i) {
            let dist = Utility.getDistance(this.api.player.getLocalX(), this.api.player.getLocalZ(), groundItems[i].x, groundItems[i].z);
            groundItems[i].playerDist = dist;
            if (dist > maxDist) {
                break;
            }
            if (!nearestItem || dist < nearestItem.playerDist) {
                nearestItem = groundItems[i];
            }
        }
        return nearestItem;
    };
}