import { describe, expect, test } from 'bun:test';
import { decodeEngineCoord } from '../walk/coordDecode.js';
import {
    buildWalkGraphIndex,
    listReachableNodeIds,
    nearestNode,
    planRoute,
    reversePath,
    stitchPath
} from '../walk/walkPlanner.js';
import { LEGACY_WORLD_PATHS, WALK_GRAPH } from '../walk/walkGraph.js';
import type { WalkGraphData, WalkNodeId } from '../walk/walkTypes.js';

describe('coordDecode', () => {
    test('decodes varrock east bank corner', () => {
        const c = decodeEngineCoord('0_50_53_63_32');
        expect(c.plane).toBe(0);
        expect(c.x).toBe(3263);
        expect(c.z).toBe(3424);
    });
});

describe('walkPlanner', () => {
    test('reversePath reverses coordinates', () => {
        expect(reversePath([[1, 2], [3, 4]])).toEqual([[3, 4], [1, 2]]);
    });

    test('stitchPath dedupes consecutive tiles', () => {
        expect(stitchPath([[[1, 1], [2, 2]], [[2, 2], [3, 3]]])).toEqual([[1, 1], [2, 2], [3, 3]]);
    });

    test('all bank and hub nodes reachable from bank_lumbridge', () => {
        const index = buildWalkGraphIndex(WALK_GRAPH);
        const reachable = listReachableNodeIds(index, 'bank_lumbridge');
        const required: WalkNodeId[] = [
            'bank_draynor',
            'bank_varrock_east',
            'bank_falador_east',
            'bank_edgeville',
            'bank_al_kharid',
            'bank_catherby',
            'hub_port_sarim',
            'hub_rimmington',
            'hub_barbarian_village'
        ];
        for (const id of required) {
            expect(reachable.has(id)).toBe(true);
        }
    });

    test('bidirectional edges have reverse routes', () => {
        const index = buildWalkGraphIndex(WALK_GRAPH);
        const forward = planRoute(index, 'hub_draynor', 'hub_lumbridge');
        const back = planRoute(index, 'hub_lumbridge', 'hub_draynor');
        expect(forward).not.toBeNull();
        expect(back).not.toBeNull();
        expect(forward!.path.length).toBeGreaterThan(0);
        expect(back!.path.length).toBeGreaterThan(0);
    });

    test('nearestNode picks closest hub', () => {
        const index = buildWalkGraphIndex(WALK_GRAPH);
        expect(nearestNode(index, 3087, 3238, 50)).toBe('bank_draynor');
    });

    test('nearestNode filters plane-specific nodes while preserving 2D nodes', () => {
        const index = buildWalkGraphIndex(WALK_GRAPH);
        expect(nearestNode(index, 2446, 3426, 10, 0)).not.toBe('bank_gnome_stronghold');
        expect(nearestNode(index, 2446, 3426, 10, 1)).toBe('bank_gnome_stronghold');
        expect(nearestNode(index, 2727, 3493, 10, 1)).toBe('bank_seers');
    });

    test('transition edges are explicit and not auto-reversed', () => {
        const index = buildWalkGraphIndex(WALK_GRAPH);
        const toBank = planRoute(index, 'wc_gnome_magic_central', 'bank_gnome_stronghold');
        const fromBank = planRoute(index, 'bank_gnome_stronghold', 'wc_gnome_magic_central');
        expect(toBank).not.toBeNull();
        expect(fromBank).not.toBeNull();
        expect(toBank!.edges.some(edge => edge.transition?.op === 'Climb-up')).toBe(true);
        expect(fromBank!.edges.some(edge => edge.transition?.op === 'Climb-down')).toBe(true);
    });

    test('new magic tree nodes route to their banks', () => {
        const index = buildWalkGraphIndex(WALK_GRAPH);
        expect(planRoute(index, 'wc_seers_magic_north', 'bank_seers')).not.toBeNull();
        expect(planRoute(index, 'wc_gnome_magic_west', 'bank_gnome_stronghold')).not.toBeNull();
        expect(planRoute(index, 'wc_gnome_magic_east', 'bank_gnome_stronghold')).not.toBeNull();
    });

    test('legacy world paths are preserved in graph', () => {
        expect(LEGACY_WORLD_PATHS.DRAYNOR_TO_LUMBRIDGE.length).toBeGreaterThan(5);
    });
});
