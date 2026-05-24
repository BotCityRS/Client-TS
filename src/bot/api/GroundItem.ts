import type ClientObj from "#/dash3d/ClientObj.js";
import GroundItemEntity from "./base/GroundItemEntity";
import type BotAPI from "./BotAPI";
import Utility from "./Utility";

export type GroundItemNameMatcher = string | RegExp;

export type GroundItemSearchArea = {
    x1: number;
    z1: number;
    x2: number;
    z2: number;
};

export type GroundItemSearchOptions = {
    maxDistance?: number;
    area?: GroundItemSearchArea;
    reachable?: boolean;
    maxSteps?: number;
    plane?: number;
    minCount?: number;
    maxCount?: number;
    ids?: number[];
};

export default class GroundItem {
    api: BotAPI;

    constructor(api: BotAPI) {
        this.api = api;
    }

    getAll(): GroundItemEntity[] {
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
                    items.push(this.createItem(obj, x, z));
                    obj = list.next();
                }
            }
        }
        return items;
    }

    getGroundItems(): GroundItemEntity[] {
        return this.getAll();
    }

    private createItem(obj: ClientObj, x: number, z: number): GroundItemEntity {
        const item = new GroundItemEntity(this.api, obj.id, obj.count, x, z, obj);
        item.playerDist = Utility.getDistance(this.api.player.getLocalX(), this.api.player.getLocalZ(), x, z);
        return item;
    }

    private nameMatches(name: string | null, matcher: GroundItemNameMatcher): boolean {
        if (!name) {
            return false;
        }
        if (matcher instanceof RegExp) {
            return matcher.test(name);
        }
        return name.toLowerCase() === matcher.toLowerCase();
    }

    private opMatches(item: GroundItemEntity, op: string, exact: boolean): boolean {
        const want = op.toLowerCase();
        return item.groundOps.some(label => {
            const lower = label?.toLowerCase();
            return exact ? lower === want : lower?.includes(want) === true;
        });
    }

    private matchesOptions(item: GroundItemEntity, opts?: GroundItemSearchOptions): boolean {
        if (opts?.ids && !opts.ids.includes(item.id)) {
            return false;
        }
        if (opts?.maxDistance !== undefined && item.distance() > opts.maxDistance) {
            return false;
        }
        const worldPos = item.getWorldPosition();
        if (opts?.plane !== undefined && worldPos.plane !== opts.plane) {
            return false;
        }
        if (opts?.area) {
            const { x1, z1, x2, z2 } = opts.area;
            if (worldPos.x < x1 || worldPos.x > x2 || worldPos.z < z1 || worldPos.z > z2) {
                return false;
            }
        }
        if (opts?.minCount !== undefined && item.count < opts.minCount) {
            return false;
        }
        if (opts?.maxCount !== undefined && item.count > opts.maxCount) {
            return false;
        }
        if (opts?.reachable && !item.isReachable(opts.maxSteps ?? Number.POSITIVE_INFINITY)) {
            return false;
        }
        return true;
    }

    private nearest(items: GroundItemEntity[]): GroundItemEntity | null {
        let nearestItem: GroundItemEntity | null = null;
        for (const item of items) {
            if (!nearestItem || item.distance() < nearestItem.distance()) {
                nearestItem = item;
            }
        }
        return nearestItem;
    }

    getGroundItemsById(ids: number[], opts?: GroundItemSearchOptions): GroundItemEntity[] {
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
                        const item = this.createItem(obj, x, z);
                        if (this.matchesOptions(item, opts)) {
                            items.push(item);
                        }
                    }
                    obj = list.next();
                }
            }
        }
        return items;
    }

    getByName(name: GroundItemNameMatcher, opts?: GroundItemSearchOptions): GroundItemEntity[] {
        return this.getAll().filter(item => this.nameMatches(item.name, name) && this.matchesOptions(item, opts));
    }

    getNearestByName(name: GroundItemNameMatcher, opts?: GroundItemSearchOptions): GroundItemEntity | null {
        return this.nearest(this.getByName(name, opts));
    }

    getByOp(op: string, opts?: GroundItemSearchOptions & { exact?: boolean }): GroundItemEntity[] {
        return this.getAll().filter(item => this.opMatches(item, op, opts?.exact ?? true) && this.matchesOptions(item, opts));
    }

    getNearestByOp(op: string, opts?: GroundItemSearchOptions & { exact?: boolean }): GroundItemEntity | null {
        return this.nearest(this.getByOp(op, opts));
    }

    getNearest(predicate: (item: GroundItemEntity) => boolean, opts?: GroundItemSearchOptions): GroundItemEntity | null {
        return this.nearest(this.getAll().filter(item => predicate(item) && this.matchesOptions(item, opts)));
    }

    getNearestGroundItemById = (ids: number[], maxDist: number): GroundItemEntity | null => {
        return this.nearest(this.getGroundItemsById(ids, { maxDistance: maxDist }));
    };
}
