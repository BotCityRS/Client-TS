
export default class Utility {
    static food = {
        SHRIMP: {
            rawId: 317,
            cookedId: 315,
            hp: 3,
        },
        ANCHOVIES: { rawId: 321, cookedId: 319, burnId: 323, hp: 1 },
        SARDINE: { rawId: 327, cookedId: 325, burnId: 369, hp: 2 },
        SALMON: { rawId: 331, cookedId: 329, burnId: 343, hp: 9 },
        TROUT: { rawId: 335, cookedId: 333, burnId: 343, hp: 7 },
        GIANT_CARP: { rawId: 338, cookedId: 337, burnId: 343, hp: 6 },
        COD: { rawId: 341, cookedId: 339, burnId: 343, hp: 7 },
        HERRING: { rawId: 345, cookedId: 347, burnId: 357, hp: 5 },
        PIKE: { rawId: 349, cookedId: 351, burnId: 343, hp: 8 },
        MACKEREL: { rawId: 353, cookedId: 355, burnId: 343, hp: 6 },
        TUNA: { rawId: 359, cookedId: 361, burnId: 367, hp: 10 },
        BASS: { rawId: 363, cookedId: 365, burnId: 367, hp: 13 },
        SWORDFISH: { rawId: 371, cookedId: 373, burnId: 375, hp: 14 },
        LOBSTER: { rawId: 377, cookedId: 379, burnId: 381, hp: 12 },
        SHARK: { rawId: 383, cookedId: 385, burnId: 387, hp: 20 },
        MANTA_RAY: { rawId: 389, cookedId: 391, burnId: 393, hp: 22 },
        SEA_TURTLE: { rawId: 395, cookedId: 397, burnId: 399, hp: 21 }
    };
    constructor() {

    }

    static getDistance(x1: number, z1: number, x2: number, z2: number) {
        return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(z1 - z2), 2));
    }

    static includes(arr: number[], v: number) {
        const v2 = Number(v);
        if (isNaN(v2)) {
            throw 'Parse error ' + v + " -> " + v2;
        }
        for (let i = 0; i < arr.length; ++i) {
            const arri2 = Number(arr[i]);
            if (isNaN(arri2)) {
                throw 'Parse error ' + arr[i] + " -> " + arri2;
            }
            if (arri2 == v2) {
                return true;
            }
        }
        return false;
    }
}