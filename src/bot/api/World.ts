import type BotAPI from "./BotAPI";
import Timer from "./Timer";
import Utility from "./Utility";

export type PathNode = [x: number, z: number];
export type Path = PathNode[];

export default class World {
    api: BotAPI;
    static paths: { [pathName: string]: Path } = {
        DRAYNOR_TO_LUMBRIDGE: [[3092, 3248], [3103, 3236], [3109, 3226], [3126, 3222], [3136, 3225], [3148, 3229], [3160, 3232], [3173, 3236], [3186, 3240], [3191, 3238], [3206, 3242], [3218, 3238], [3229, 3228], [3233, 3219]],
        DRAYNOR_TO_FALADOR: [[3080,3260],[3071,3276],[3058,3278],[3041,3281],[3025,3278],[3015,3278],[3011,3290],[3010,3292],[3006,3307],[3007,3324],[3007,3339],[3006,3353],[3006,3363]],
        FALADOR_TO_BARB_VILLAGE: [[2993,3370],[2979,3379],[2965,3386],[2966,3396],[2976,3409],[2985,3419],[2993,3430],[3009,3432],[3024,3431],[3035,3431],[3046,3429],[3059,3427],[3069,3418],[3083,3419]],
        BARB_VILLAGE_TO_VARROCK: [[3099,3420],[3114,3421],[3127,3418],[3140,3416],[3151,3417],[3162,3421],[3175,3429],[3183,3428],[3197,3429],[3210,3428]],
        BARB_VILLAGE_TO_EDGEVILLE: [[3107,3433],[3095,3444],[3094,3457],[3087,3464],[3081,3476],[3087,3488],[3096,3491],[3093,3490]],
        FALADOR_TO_VARROCK: [[2993,3370],[2979,3379],[2965,3386],[2966,3396],[2976,3409],[2985,3419],[2993,3430],[3009,3432],[3024,3431],[3035,3431],[3046,3429],[3059,3427],[3069,3418],[3083,3419],[3099,3420],[3114,3421],[3127,3418],[3140,3416],[3151,3417],[3162,3421],[3175,3429],[3183,3428],[3197,3429],[3210,3428]],
        VARROCK_TO_LUMBRIDGE: [[3211,3411],[3211,3397],[3211,3383],[3207,3379],[3201,3373],[3202,3364],[3208,3358],[3217,3355],[3226,3349],[3227,3343],[3240,3335],[3252,3335],[3250,3317],[3240,3306],[3239,3290],[3245,3274],[3238,3261],[3229,3248],[3225,3240],[3233,3225],[3233,3219]],
        DRAYNOR_TO_BARB_VILLAGE: [[3082,3262],[3075,3272],[3075,3284],[3073,3296],[3072,3310],[3073,3327],[3074,3339],[3075,3353],[3075,3367],[3074,3381],[3080,3395],[3085,3411],[3085,3418]],
        FALADOR_TO_CATHERBY: [[2978,3378],[2965,3388],[2961,3402],[2958,3415],[2954,3420],[2949,3433],[2941,3450],[2935,3451],[2919,3456],[2903,3454],[2889,3446],[2890,3439],[2871,3439],[2866,3455],[2859,3465],[2856,3476],[2861,3492],[2856,3507],[2850,3497],[2851,3482],[2845,3470],[2846,3452],[2844,3435],[2827,3438],[2809,3439]],
    };

    pathCompleteCallback: ((result: boolean) => void) | null = null;

    constructor(api: BotAPI) {
        this.api = api;
    }

    distanceTo(x: number, z: number) {
        const offsetX = this.api.surface.sceneBaseTileX;
        const offsetZ = this.api.surface.sceneBaseTileZ;
        const px = this.api.player.getLocalX();
        const pz = this.api.player.getLocalZ();
        return Utility.getDistance(px, pz, x - offsetX, z - offsetZ);
    }

    moveTo(x: number, z: number) {
        const offsetX = this.api.surface.sceneBaseTileX;
        const offsetZ = this.api.surface.sceneBaseTileZ;
        this.api.surface.tryMoveToTile(this.api.player.getLocalX(), this.api.player.getLocalZ(), x - offsetX, z - offsetZ);
    }

    stopPath() {
        this.pathCompleteCallback?.(false);
    }

    hasPath() {
        return this.pathCompleteCallback != null;
    }

    walkPath(path: Path, traverse: boolean = true) {
        const nodeDist = 5;
        const movement = traverse ? 1 : -1;

        this.api.bot.log('INFO', 'World.walkPath', 'start', { traverse, nodes: path.length });

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
            const timer = new Timer();
            let walkRef: number | undefined = undefined;
            const pathCompleteCallback = (result: boolean) => {
                clearInterval(walkRef);
                res(result);
                this.pathCompleteCallback = null;
            };
            this.pathCompleteCallback?.(false);
            this.pathCompleteCallback = pathCompleteCallback;

            timer.defineTimer('IS_WALKING', 0);

            walkRef = setInterval(() => {
                if (n < 0) {
                    return this.pathCompleteCallback?.(true);
                }
                const curNode = path[n];
                let tries = 10;
                const dist = this.api.world.distanceTo(curNode[0], curNode[1]);
                this.api.bot.log('DEBUG', 'World.walkPath', 'tick', { dist, nodeIndex: n, curNode, isMoving: this.api.player.isMoving() });
                if ((dist > nodeDist && this.api.player.isMoving()) || timer.hasTimer(0) || tries < 0) {
                    if (dist > 100 || tries < 0) {
                        this.pathCompleteCallback?.(false);
                    }
                    return;
                }
                --tries;
                if (dist <= nodeDist) {
                    n += movement;
                    tries = 0;
                }
                this.api.world.moveTo(curNode[0], curNode[1]);
            }, 500) as unknown as number;
        });
    }
}
