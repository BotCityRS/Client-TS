import type { PathNode } from './walkTypes.js';

export type DecodedCoord = {
    plane: number;
    x: number;
    z: number;
};

/** Decode engine coord `level_mx_mz_lx_lz` to world map tile. */
export function decodeEngineCoord(s: string): DecodedCoord {
    const parts = s.split('_').map(p => Number.parseInt(p, 10));
    if (parts.length !== 5 || parts.some(n => !Number.isFinite(n))) {
        throw new Error(`Invalid engine coord: ${s}`);
    }
    const [plane, mx, mz, lx, lz] = parts;
    return {
        plane: plane!,
        x: mx! * 64 + lx!,
        z: mz! * 64 + lz!
    };
}

/** Centroid of two engine coord corners (ground plane corners). */
export function centroidEnginePair(minCoord: string, maxCoord: string): PathNode {
    const a = decodeEngineCoord(minCoord);
    const b = decodeEngineCoord(maxCoord);
    return [Math.round((a.x + b.x) / 2), Math.round((a.z + b.z) / 2)];
}
