import type BotAPI from '../api/BotAPI.js';
import Utility from '../api/Utility.js';
import type { Path, PathNode } from './walkTypes.js';
import { WALK_GRAPH } from './walkGraph.js';
import {
    buildWalkGraphIndex,
    nearestNode,
    planRoute,
    type WalkGraphIndex,
    worldDistanceToNode
} from './walkPlanner.js';
import type { WalkNodeId } from './walkTypes.js';

const ARRIVAL_TILES = 5;
const NEAREST_NODE_MAX_TILES = 25;
const LAST_MILE_ATTEMPTS = 8;
const LAST_MILE_MS = 550;

export default class WebWalk {
    private readonly index: WalkGraphIndex;
    private walking = false;

    constructor(private readonly api: BotAPI) {
        this.index = buildWalkGraphIndex(WALK_GRAPH);
    }

    getPlayerWorldPos(): PathNode | null {
        const lp = this.api.surface.localPlayer;
        if (!lp) {
            return null;
        }
        const lx = lp.routeX[0];
        const lz = lp.routeZ[0];
        if (lx < 0 || lz < 0) {
            return null;
        }
        return [
            lx + this.api.surface.sceneBaseTileX,
            lz + this.api.surface.sceneBaseTileZ
        ];
    }

    nearestNode(worldX: number, worldZ: number, maxDist = NEAREST_NODE_MAX_TILES): WalkNodeId | null {
        return nearestNode(this.index, worldX, worldZ, maxDist);
    }

    planRoute(from: WalkNodeId, to: WalkNodeId): Path | null {
        return planRoute(this.index, from, to)?.path ?? null;
    }

    planRouteFromPlayer(to: WalkNodeId): Path | null {
        const pos = this.getPlayerWorldPos();
        if (!pos) {
            return null;
        }
        const from = nearestNode(this.index, pos[0], pos[1], Number.POSITIVE_INFINITY);
        if (!from) {
            return null;
        }
        return this.planRoute(from, to);
    }

    private worldDistanceTo(worldX: number, worldZ: number): number {
        const pos = this.getPlayerWorldPos();
        if (!pos) {
            return Number.POSITIVE_INFINITY;
        }
        return Utility.getDistance(pos[0], pos[1], worldX, worldZ);
    }

    private async lastMileTo(worldX: number, worldZ: number): Promise<boolean> {
        for (let i = 0; i < LAST_MILE_ATTEMPTS; i++) {
            if (this.worldDistanceTo(worldX, worldZ) <= ARRIVAL_TILES) {
                return true;
            }
            this.api.world.moveTo(worldX, worldZ);
            await new Promise<void>(resolve => setTimeout(resolve, LAST_MILE_MS));
        }
        return this.worldDistanceTo(worldX, worldZ) <= ARRIVAL_TILES;
    }

    isWalking(): boolean {
        return this.walking || this.api.world.hasPath();
    }

    stop(): void {
        this.walking = false;
        this.api.world.stopPath();
    }

    async walkToNode(nodeId: WalkNodeId, opts?: { run?: boolean }): Promise<boolean> {
        const node = this.index.nodes.get(nodeId);
        if (!node) {
            this.api.bot.log('WARN', 'WebWalk.walkToNode', 'unknown node', { nodeId });
            return false;
        }

        const [tx, tz] = node.world;
        if (this.worldDistanceTo(tx, tz) <= ARRIVAL_TILES) {
            return true;
        }

        const path = this.planRouteFromPlayer(nodeId);
        if (!path || path.length === 0) {
            this.api.bot.log('WARN', 'WebWalk.walkToNode', 'no route', { nodeId });
            return false;
        }

        if (opts?.run !== false) {
            this.api.player.enableRun();
        }

        this.walking = true;
        this.api.bot.log('INFO', 'WebWalk.walkToNode', 'start', { nodeId, nodes: path.length });
        try {
            const ok = await this.api.world.walkPath(path);
            if (!ok) {
                this.api.bot.log('WARN', 'WebWalk.walkToNode', 'walkPath failed', { nodeId });
                return false;
            }
            return await this.lastMileTo(tx, tz);
        } finally {
            this.walking = false;
        }
    }

    async walkToBank(nodeId: WalkNodeId): Promise<boolean> {
        return this.walkToNode(nodeId);
    }

    async walkToWorld(x: number, z: number, opts?: { maxLastMileTiles?: number }): Promise<boolean> {
        const maxLast = opts?.maxLastMileTiles ?? NEAREST_NODE_MAX_TILES;
        if (this.worldDistanceTo(x, z) <= ARRIVAL_TILES) {
            return true;
        }

        const targetNodeId = nearestNode(this.index, x, z, maxLast)
            ?? nearestNode(this.index, x, z, Number.POSITIVE_INFINITY);

        if (targetNodeId) {
            const node = this.index.nodes.get(targetNodeId)!;
            const atNode = Utility.getDistance(node.world[0], node.world[1], x, z) <= ARRIVAL_TILES;
            const graphOk = await this.walkToNode(targetNodeId, { run: true });
            if (!graphOk) {
                return false;
            }
            if (atNode || this.worldDistanceTo(x, z) <= ARRIVAL_TILES) {
                return true;
            }
            return await this.lastMileTo(x, z);
        }

        return await this.lastMileTo(x, z);
    }

    /** Walk a pre-planned path in world coordinates (e.g. hub route reverse). */
    async walkPath(path: Path, opts?: { run?: boolean }): Promise<boolean> {
        if (path.length === 0) {
            return true;
        }
        if (opts?.run !== false) {
            this.api.player.enableRun();
        }
        this.walking = true;
        try {
            const ok = await this.api.world.walkPath(path);
            if (!ok) {
                return false;
            }
            const end = path[path.length - 1]!;
            return await this.lastMileTo(end[0], end[1]);
        } finally {
            this.walking = false;
        }
    }

    /** Distance from player to a walk node in world tiles. */
    distanceToNode(nodeId: WalkNodeId): number {
        const node = this.index.nodes.get(nodeId);
        const pos = this.getPlayerWorldPos();
        if (!node || !pos) {
            return Number.POSITIVE_INFINITY;
        }
        return worldDistanceToNode(pos[0], pos[1], node);
    }
}
