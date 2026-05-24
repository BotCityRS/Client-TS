import Utility from '../api/Utility.js';
import type { Path, PathNode, WalkEdge, WalkGraphData, WalkNode, WalkNodeId } from './walkTypes.js';

export type ResolvedWalkEdge = WalkEdge & { cost: number };

export type WalkGraphIndex = {
    nodes: Map<WalkNodeId, WalkNode>;
    adjacency: Map<WalkNodeId, ResolvedWalkEdge[]>;
};

function pathCost(path: Path): number {
    let cost = 0;
    for (let i = 1; i < path.length; i++) {
        const a = path[i - 1]!;
        const b = path[i]!;
        cost += Utility.getDistance(a[0], a[1], b[0], b[1]);
    }
    return cost;
}

export function reversePath(path: Path): Path {
    return path.map(n => [n[0], n[1]] as PathNode).reverse();
}

export function stitchPath(segments: Path[]): Path {
    const out: Path = [];
    for (let s = 0; s < segments.length; s++) {
        const seg = segments[s]!;
        for (let i = 0; i < seg.length; i++) {
            const node = seg[i]!;
            const prev = out[out.length - 1];
            if (prev && prev[0] === node[0] && prev[1] === node[1]) {
                continue;
            }
            out.push([node[0], node[1]]);
        }
    }
    return out;
}

export function buildWalkGraphIndex(data: WalkGraphData): WalkGraphIndex {
    const nodes = new Map<WalkNodeId, WalkNode>();
    for (const node of data.nodes) {
        nodes.set(node.id, node);
    }

    const adjacency = new Map<WalkNodeId, ResolvedWalkEdge[]>();
    const addEdge = (edge: WalkEdge) => {
        const cost = pathCost(edge.path);
        const resolved: ResolvedWalkEdge = { ...edge, cost };
        const list = adjacency.get(edge.from) ?? [];
        list.push(resolved);
        adjacency.set(edge.from, list);
    };

    for (const edge of data.edges) {
        addEdge(edge);
        if (edge.bidirectional !== false && !edge.transition) {
            addEdge({
                from: edge.to,
                to: edge.from,
                path: reversePath(edge.path),
                bidirectional: false
            });
        }
    }

    return { nodes, adjacency };
}

export function worldDistanceToNode(worldX: number, worldZ: number, node: WalkNode): number {
    return Utility.getDistance(worldX, worldZ, node.world[0], node.world[1]);
}

export function nodeMatchesPlane(node: WalkNode, plane?: number): boolean {
    return plane === undefined || node.plane === undefined || node.plane === plane;
}

export function nearestNode(
    index: WalkGraphIndex,
    worldX: number,
    worldZ: number,
    maxDist = Number.POSITIVE_INFINITY,
    plane?: number
): WalkNodeId | null {
    let best: WalkNodeId | null = null;
    let bestDist = maxDist;
    for (const node of index.nodes.values()) {
        if (!nodeMatchesPlane(node, plane)) {
            continue;
        }
        const d = worldDistanceToNode(worldX, worldZ, node);
        if (d < bestDist) {
            bestDist = d;
            best = node.id;
        }
    }
    return best;
}

export type PlannedRoute = {
    from: WalkNodeId;
    to: WalkNodeId;
    edges: ResolvedWalkEdge[];
    path: Path;
};

export function planRoute(index: WalkGraphIndex, from: WalkNodeId, to: WalkNodeId): PlannedRoute | null {
    if (from === to) {
        const node = index.nodes.get(from);
        if (!node) {
            return null;
        }
        return { from, to, edges: [], path: [[node.world[0], node.world[1]]] };
    }

    const dist = new Map<WalkNodeId, number>();
    const prev = new Map<WalkNodeId, { edge: ResolvedWalkEdge; from: WalkNodeId }>();
    const unvisited = new Set<WalkNodeId>(index.nodes.keys());

    for (const id of unvisited) {
        dist.set(id, Number.POSITIVE_INFINITY);
    }
    dist.set(from, 0);

    while (unvisited.size > 0) {
        let current: WalkNodeId | null = null;
        let currentDist = Number.POSITIVE_INFINITY;
        for (const id of unvisited) {
            const d = dist.get(id) ?? Number.POSITIVE_INFINITY;
            if (d < currentDist) {
                currentDist = d;
                current = id;
            }
        }
        if (current === null || currentDist === Number.POSITIVE_INFINITY) {
            break;
        }
        unvisited.delete(current);
        if (current === to) {
            break;
        }

        const neighbors = index.adjacency.get(current) ?? [];
        for (const edge of neighbors) {
            if (!unvisited.has(edge.to)) {
                continue;
            }
            const alt = currentDist + edge.cost;
            if (alt < (dist.get(edge.to) ?? Number.POSITIVE_INFINITY)) {
                dist.set(edge.to, alt);
                prev.set(edge.to, { edge, from: current });
            }
        }
    }

    if (!prev.has(to) && from !== to) {
        return null;
    }

    const edges: ResolvedWalkEdge[] = [];
    let cur: WalkNodeId | undefined = to;
    while (cur !== undefined && cur !== from) {
        const step = prev.get(cur);
        if (!step) {
            return null;
        }
        edges.unshift(step.edge);
        cur = step.from;
    }

    return {
        from,
        to,
        edges,
        path: stitchPath(edges.map(e => e.path))
    };
}

export function listReachableNodeIds(index: WalkGraphIndex, from: WalkNodeId): Set<WalkNodeId> {
    const reachable = new Set<WalkNodeId>();
    const queue: WalkNodeId[] = [from];
    reachable.add(from);
    while (queue.length > 0) {
        const cur = queue.shift()!;
        for (const edge of index.adjacency.get(cur) ?? []) {
            if (!reachable.has(edge.to)) {
                reachable.add(edge.to);
                queue.push(edge.to);
            }
        }
    }
    return reachable;
}
