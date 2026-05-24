import type BotAPI from '../api/BotAPI.js';
import Utility from '../api/Utility.js';
import type { Path, PathNode, WalkTransition } from './walkTypes.js';
import { WALK_GRAPH } from './walkGraph.js';
import {
    buildWalkGraphIndex,
    nearestNode,
    nodeMatchesPlane,
    planRoute,
    type PlannedRoute,
    type WalkGraphIndex,
    worldDistanceToNode
} from './walkPlanner.js';
import type { WalkNodeId } from './walkTypes.js';

const ARRIVAL_TILES = 5;
const NEAREST_NODE_MAX_TILES = 25;
const LAST_MILE_ATTEMPTS = 8;
const LAST_MILE_MS = 550;
const TRANSITION_POLL_MS = 250;
const DEFAULT_TRANSITION_TIMEOUT_MS = 5000;

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
        return nearestNode(this.index, worldX, worldZ, maxDist, this.api.surface.currentLevel);
    }

    planRoute(from: WalkNodeId, to: WalkNodeId): Path | null {
        return planRoute(this.index, from, to)?.path ?? null;
    }

    private planFullRoute(from: WalkNodeId, to: WalkNodeId): PlannedRoute | null {
        return planRoute(this.index, from, to);
    }

    planRouteFromPlayer(to: WalkNodeId): Path | null {
        return this.planFullRouteFromPlayer(to)?.path ?? null;
    }

    private planFullRouteFromPlayer(to: WalkNodeId): PlannedRoute | null {
        const pos = this.getPlayerWorldPos();
        if (!pos) {
            return null;
        }
        const from = nearestNode(this.index, pos[0], pos[1], Number.POSITIVE_INFINITY, this.api.surface.currentLevel);
        if (!from) {
            return null;
        }
        return this.planFullRoute(from, to);
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

    private isAtNode(nodeId: WalkNodeId): boolean {
        const node = this.index.nodes.get(nodeId);
        if (!node) {
            return false;
        }
        return nodeMatchesPlane(node, this.api.surface.currentLevel) && this.worldDistanceTo(node.world[0], node.world[1]) <= ARRIVAL_TILES;
    }

    private isAtTransitionTarget(transition: WalkTransition): boolean {
        if (transition.targetPlane !== undefined && this.api.surface.currentLevel !== transition.targetPlane) {
            return false;
        }
        return this.worldDistanceTo(transition.target[0], transition.target[1]) <= ARRIVAL_TILES;
    }

    private async waitForTransitionTarget(transition: WalkTransition): Promise<boolean> {
        const timeoutMs = transition.timeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS;
        const startedAt = Date.now();
        while (Date.now() - startedAt <= timeoutMs) {
            if (this.isAtTransitionTarget(transition)) {
                return true;
            }
            await new Promise<void>(resolve => setTimeout(resolve, TRANSITION_POLL_MS));
        }
        return this.isAtTransitionTarget(transition);
    }

    private async runTransition(transition: WalkTransition, nodeId: WalkNodeId): Promise<boolean> {
        if (this.isAtTransitionTarget(transition)) {
            return true;
        }

        const loc = this.api.worldObject.getNearestByIdPath(transition.locIds, 30)
            ?? this.api.worldObject.getNearestById(transition.locIds, 30);
        if (!loc) {
            this.api.bot.log('WARN', 'WebWalk.runTransition', 'transition loc not found', {
                nodeId,
                locIds: transition.locIds,
                op: transition.op
            });
            return false;
        }

        this.api.bot.log('INFO', 'WebWalk.runTransition', 'interact transition loc', {
            nodeId,
            locId: loc.id,
            op: transition.op,
            target: transition.target,
            targetPlane: transition.targetPlane
        });
        if (!loc.interactByOpEquals(transition.op) && !loc.interactByOpIncludes(transition.op)) {
            return false;
        }
        return await this.waitForTransitionTarget(transition);
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
        if (this.isAtNode(nodeId)) {
            return true;
        }

        const route = this.planFullRouteFromPlayer(nodeId);
        if (!route || route.path.length === 0) {
            this.api.bot.log('WARN', 'WebWalk.walkToNode', 'no route', { nodeId });
            return false;
        }

        if (opts?.run !== false) {
            this.api.player.enableRun();
        }

        this.walking = true;
        this.api.bot.log('INFO', 'WebWalk.walkToNode', 'start', {
            nodeId,
            nodes: route.path.length,
            edges: route.edges.length,
            plane: this.api.surface.currentLevel
        });
        try {
            for (const edge of route.edges) {
                if (edge.path.length > 0) {
                    const ok = await this.api.world.walkPath(edge.path);
                    if (!ok) {
                        this.api.bot.log('WARN', 'WebWalk.walkToNode', 'walkPath failed', {
                            nodeId,
                            from: edge.from,
                            to: edge.to
                        });
                        return false;
                    }
                }
                if (edge.transition && !await this.runTransition(edge.transition, nodeId)) {
                    this.api.bot.log('WARN', 'WebWalk.walkToNode', 'transition failed', {
                        nodeId,
                        from: edge.from,
                        to: edge.to
                    });
                    return false;
                }
            }
            if (node.plane !== undefined && this.api.surface.currentLevel !== node.plane) {
                this.api.bot.log('WARN', 'WebWalk.walkToNode', 'arrived on wrong plane', {
                    nodeId,
                    expectedPlane: node.plane,
                    actualPlane: this.api.surface.currentLevel
                });
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

        const targetNodeId = nearestNode(this.index, x, z, maxLast, this.api.surface.currentLevel)
            ?? nearestNode(this.index, x, z, Number.POSITIVE_INFINITY, this.api.surface.currentLevel);

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
        if (!nodeMatchesPlane(node, this.api.surface.currentLevel)) {
            return Number.POSITIVE_INFINITY;
        }
        return worldDistanceToNode(pos[0], pos[1], node);
    }
}
