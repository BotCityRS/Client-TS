import type BotAPI from './BotAPI';
import Utility from './Utility';
import { LEGACY_WORLD_PATHS } from '../walk/walkGraph.js';

export type PathNode = [x: number, z: number];
export type Path = PathNode[];

/** @deprecated Use walk graph / WebWalk API. Kept for compatibility. */
export const WorldPaths = LEGACY_WORLD_PATHS;

export default class World {
    api: BotAPI;
    /** @deprecated Use `api.webWalk` and `LEGACY_WORLD_PATHS` from walkGraph. */
    static paths: { [pathName: string]: Path } = LEGACY_WORLD_PATHS;

    pathCompleteCallback: ((result: boolean) => void) | null = null;

    private walkIntervalId: ReturnType<typeof setInterval> | null = null;

    constructor(api: BotAPI) {
        this.api = api;
    }

    private clearWalkInterval(): void {
        if (this.walkIntervalId !== null) {
            clearInterval(this.walkIntervalId);
            this.walkIntervalId = null;
        }
    }

    private hasValidPlayerTile(): boolean {
        if (!this.api.isLoggedIn()) {
            return false;
        }
        const px = this.api.player.getLocalX();
        const pz = this.api.player.getLocalZ();
        return px >= 0 && pz >= 0;
    }

    getPlane(): number {
        return this.api.surface.currentLevel;
    }

    getBase(): PathNode {
        return [this.api.surface.sceneBaseTileX, this.api.surface.sceneBaseTileZ];
    }

    localToWorld(x: number, z: number): PathNode {
        return [x + this.api.surface.sceneBaseTileX, z + this.api.surface.sceneBaseTileZ];
    }

    worldToLocal(x: number, z: number): PathNode {
        return [x - this.api.surface.sceneBaseTileX, z - this.api.surface.sceneBaseTileZ];
    }

    getPlayerWorldPos(): PathNode | null {
        const pos = this.api.player.getWorldPosition();
        if (pos.x < 0 || pos.z < 0) {
            return null;
        }
        return [pos.x, pos.z];
    }

    distanceTo(x: number, z: number) {
        if (!this.hasValidPlayerTile()) {
            return Number.POSITIVE_INFINITY;
        }
        const offsetX = this.api.surface.sceneBaseTileX;
        const offsetZ = this.api.surface.sceneBaseTileZ;
        const px = this.api.player.getLocalX();
        const pz = this.api.player.getLocalZ();
        return Utility.getDistance(px, pz, x - offsetX, z - offsetZ);
    }

    distanceToWorld(x: number, z: number) {
        return this.distanceTo(x, z);
    }

    moveTo(x: number, z: number) {
        if (!this.hasValidPlayerTile()) {
            return;
        }
        const offsetX = this.api.surface.sceneBaseTileX;
        const offsetZ = this.api.surface.sceneBaseTileZ;
        this.api.surface.tryMoveToTile(this.api.player.getLocalX(), this.api.player.getLocalZ(), x - offsetX, z - offsetZ);
    }

    stopPath(): void {
        this.clearWalkInterval();
        const cb = this.pathCompleteCallback;
        this.pathCompleteCallback = null;
        cb?.(false);
    }

    hasPath() {
        return this.pathCompleteCallback != null || this.walkIntervalId !== null;
    }

    /**
     * Walks waypoints on an interval. While logged out or before the player tile is valid, the path
     * is paused (same Promise stays pending) and resumes automatically after reconnect.
     */
    walkPath(path: Path, traverse: boolean = true): Promise<boolean> {
        if (!this.api.isLoggedIn() || !this.hasValidPlayerTile() || path.length === 0) {
            return Promise.resolve(false);
        }

        const nodeDist = 5;
        const movement = traverse ? 1 : -1;

        this.api.bot.log('INFO', 'World.walkPath', 'start', { traverse, nodes: path.length });

        this.stopPath();

        const findNearestNode: (path: Path) => number = (path: Path) => {
            let nearestI = -1;
            let nearDist = Number.MAX_SAFE_INTEGER;
            path.forEach((n: PathNode, i: number) => {
                const dist = this.api.world.distanceTo(n[0], n[1]);
                if (dist < nearDist && dist < 100) {
                    nearDist = dist;
                    nearestI = i;
                }
            });
            return nearestI;
        };

        let n = findNearestNode(path);

        return new Promise((res: (result: boolean) => void) => {
            let settled = false;
            const finish = (result: boolean): void => {
                if (settled) {
                    return;
                }
                settled = true;
                this.clearWalkInterval();
                this.pathCompleteCallback = null;
                res(result);
            };

            this.pathCompleteCallback = finish;

            this.walkIntervalId = setInterval(() => {
                if (this.pathCompleteCallback !== finish) {
                    return;
                }
                // Pause until in-game again (logout / reconnect); do not abort the path.
                if (!this.api.isLoggedIn() || !this.hasValidPlayerTile()) {
                    return;
                }
                if (n < 0 || n >= path.length) {
                    finish(true);
                    return;
                }
                const curNode = path[n]!;
                const dist = this.api.world.distanceTo(curNode[0], curNode[1]);
                if (dist > nodeDist && this.api.player.isMoving()) {
                    return;
                }
                if (dist > 100) {
                    finish(false);
                    return;
                }
                if (dist <= nodeDist) {
                    n += movement;
                }
                this.api.world.moveTo(curNode[0], curNode[1]);
            }, 550);
        });
    }
}
