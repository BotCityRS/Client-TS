import { centroidEnginePair } from './coordDecode.js';
import type { Path, WalkEdge, WalkGraphData, WalkNode } from './walkTypes.js';

const GRAND_TREE_CLIMB_UP_LOC_IDS = [2447];
const GRAND_TREE_CLIMB_DOWN_LOC_IDS = [2448];

/** Migrated from former World.paths for backward compatibility. */
export const LEGACY_WORLD_PATHS: Record<string, Path> = {
    DRAYNOR_TO_LUMBRIDGE: [[3092, 3248], [3103, 3236], [3109, 3226], [3126, 3222], [3136, 3225], [3148, 3229], [3160, 3232], [3173, 3236], [3186, 3240], [3191, 3238], [3206, 3242], [3218, 3238], [3229, 3228], [3233, 3219]],
    DRAYNOR_TO_FALADOR: [[3080, 3260], [3071, 3276], [3058, 3278], [3041, 3281], [3025, 3278], [3015, 3278], [3011, 3290], [3010, 3292], [3006, 3307], [3007, 3324], [3007, 3339], [3006, 3353], [3006, 3363]],
    FALADOR_TO_BARB_VILLAGE: [[2993, 3370], [2979, 3379], [2965, 3386], [2966, 3396], [2976, 3409], [2985, 3419], [2993, 3430], [3009, 3432], [3024, 3431], [3035, 3431], [3046, 3429], [3059, 3427], [3069, 3418], [3083, 3419]],
    BARB_VILLAGE_TO_VARROCK: [[3099, 3420], [3114, 3421], [3127, 3418], [3140, 3416], [3151, 3417], [3162, 3421], [3175, 3429], [3183, 3428], [3197, 3429], [3210, 3428]],
    BARB_VILLAGE_TO_EDGEVILLE: [[3107, 3433], [3095, 3444], [3094, 3457], [3087, 3464], [3081, 3476], [3087, 3488], [3096, 3491], [3093, 3490]],
    FALADOR_TO_VARROCK: [[2993, 3370], [2979, 3379], [2965, 3386], [2966, 3396], [2976, 3409], [2985, 3419], [2993, 3430], [3009, 3432], [3024, 3431], [3035, 3431], [3046, 3429], [3059, 3427], [3069, 3418], [3083, 3419], [3099, 3420], [3114, 3421], [3127, 3418], [3140, 3416], [3151, 3417], [3162, 3421], [3175, 3429], [3183, 3428], [3197, 3429], [3210, 3428]],
    VARROCK_TO_LUMBRIDGE: [[3211, 3411], [3211, 3397], [3211, 3383], [3207, 3379], [3201, 3373], [3202, 3364], [3208, 3358], [3217, 3355], [3226, 3349], [3227, 3343], [3240, 3335], [3252, 3335], [3250, 3317], [3240, 3306], [3239, 3290], [3245, 3274], [3238, 3261], [3229, 3248], [3225, 3240], [3233, 3225], [3233, 3219]],
    DRAYNOR_TO_BARB_VILLAGE: [[3082, 3262], [3075, 3272], [3075, 3284], [3073, 3296], [3072, 3310], [3073, 3327], [3074, 3339], [3075, 3353], [3075, 3367], [3074, 3381], [3080, 3395], [3085, 3411], [3085, 3418]],
    FALADOR_TO_CATHERBY: [[2978, 3378], [2965, 3388], [2961, 3402], [2958, 3415], [2954, 3420], [2949, 3433], [2941, 3450], [2935, 3451], [2919, 3456], [2903, 3454], [2889, 3446], [2890, 3439], [2871, 3439], [2866, 3455], [2859, 3465], [2856, 3476], [2861, 3492], [2856, 3507], [2850, 3497], [2851, 3482], [2845, 3470], [2846, 3452], [2844, 3435], [2827, 3438], [2809, 3439]]
};

/** Approximate F2P+ links — refine in-game with PathRecorder when possible. */
const PATH_LUMBRIDGE_AL_KHARID: Path = [
    [3239, 3233], [3255, 3228], [3270, 3215], [3285, 3195], [3295, 3178], [3299, 3169]
];

const PATH_LUMBRIDGE_PORT_SARIM: Path = [
    [3239, 3233], [3225, 3220], [3205, 3208], [3150, 3210], [3100, 3225], [3070, 3240], [3047, 3221]
];

const PATH_PORT_SARIM_RIMMINGTON: Path = [
    [3047, 3221], [3010, 3220], [2980, 3220], [2960, 3222]
];

const PATH_RIMMINGTON_FALADOR: Path = [
    [2960, 3222], [2965, 3260], [2975, 3300], [2985, 3335], [2989, 3355]
];

const WALK_NODES: WalkNode[] = [
    { id: 'bank_lumbridge', label: 'Lumbridge bank', world: [3208, 3220], kind: 'bank' },
    { id: 'bank_draynor', label: 'Draynor bank', world: [3087, 3238], kind: 'bank' },
    { id: 'bank_varrock_east', label: 'Varrock east bank', world: centroidEnginePair('0_50_53_53_33', '0_50_53_53_35'), kind: 'bank' },
    { id: 'bank_varrock_west', label: 'Varrock west bank', world: centroidEnginePair('0_49_53_44_41', '1_49_53_54_55'), kind: 'bank' },
    { id: 'bank_falador_east', label: 'Falador east bank', world: centroidEnginePair('0_47_52_3_29', '0_47_52_6_30'), kind: 'bank' },
    { id: 'bank_falador_west', label: 'Falador west bank', world: centroidEnginePair('0_46_52_1_38', '0_46_52_3_45'), kind: 'bank' },
    { id: 'bank_edgeville', label: 'Edgeville bank', world: centroidEnginePair('0_48_54_19_32', '0_48_54_26_43'), kind: 'bank' },
    { id: 'bank_al_kharid', label: 'Al Kharid bank', world: centroidEnginePair('0_51_49_1_25', '0_51_49_8_37'), kind: 'bank' },
    { id: 'bank_catherby', label: 'Catherby bank', world: centroidEnginePair('0_43_53_54_46', '0_43_53_60_53'), kind: 'bank' },
    { id: 'bank_seers', label: 'Seers bank', world: centroidEnginePair('0_42_54_33_34', '1_42_54_42_41'), kind: 'bank' },
    { id: 'bank_gnome_stronghold', label: 'Gnome Stronghold bank', world: centroidEnginePair('1_38_53_12_32', '1_38_53_15_35'), kind: 'bank', plane: 1 },
    { id: 'hub_lumbridge', label: 'Lumbridge', world: [3239, 3233], kind: 'hub' },
    { id: 'hub_draynor', label: 'Draynor Village', world: [3120, 3267], kind: 'hub' },
    { id: 'hub_falador', label: 'Falador', world: [2989, 3355], kind: 'hub' },
    { id: 'hub_varrock', label: 'Varrock', world: [3211, 3450], kind: 'hub' },
    { id: 'hub_barbarian_village', label: 'Barbarian Village', world: [3063, 3416], kind: 'hub' },
    { id: 'hub_port_sarim', label: 'Port Sarim', world: [3047, 3221], kind: 'hub' },
    { id: 'hub_rimmington', label: 'Rimmington', world: [2960, 3222], kind: 'hub' },
    { id: 'wc_draynor_tree', label: 'Draynor tree', world: [3088, 3235], kind: 'activity' },
    { id: 'wc_draynor_oak', label: 'Draynor oak', world: [3083, 3250], kind: 'activity' },
    { id: 'wc_draynor_willow', label: 'Draynor willow', world: [3084, 3230], kind: 'activity' },
    { id: 'wc_varrock_east_tree', label: 'Varrock east tree', world: [3289, 3428], kind: 'activity' },
    { id: 'wc_varrock_east_oak', label: 'Varrock east oak', world: [3275, 3426], kind: 'activity' },
    { id: 'wc_varrock_north_yew', label: 'Varrock north yew', world: [3205, 3502], kind: 'activity' },
    { id: 'wc_falador_south_yew', label: 'Falador south yew', world: [2997, 3312], kind: 'activity' },
    { id: 'wc_catherby_oak', label: 'Catherby oak', world: [2788, 3440], kind: 'activity' },
    { id: 'wc_catherby_willow', label: 'Catherby willow', world: [2783, 3428], kind: 'activity' },
    { id: 'wc_catherby_yew', label: 'Catherby yew', world: [2760, 3434], kind: 'activity' },
    { id: 'wc_seers_maple', label: 'Seers maple', world: [2720, 3475], kind: 'activity' },
    { id: 'wc_seers_willow', label: 'Seers willow', world: [2710, 3504], kind: 'activity' },
    { id: 'wc_seers_yew', label: 'Seers yew', world: [2707, 3465], kind: 'activity' },
    { id: 'wc_edgeville_yew', label: 'Edgeville yew', world: [3221, 3504], kind: 'activity' },
    { id: 'wc_seers_magic', label: 'Seers magic', world: [2705, 3396], kind: 'activity' },
    { id: 'wc_seers_magic_north', label: 'Seers magic north', world: [2692, 3425], kind: 'activity' },
    { id: 'wc_gnome_magic_west', label: 'Gnome Stronghold magic west', world: [2371, 3426], kind: 'activity', plane: 0 },
    { id: 'wc_gnome_magic_central', label: 'Gnome Stronghold magic central', world: [2432, 3410], kind: 'activity', plane: 0 },
    { id: 'wc_gnome_magic_east', label: 'Gnome Stronghold magic east', world: [2490, 3414], kind: 'activity', plane: 0 },
    { id: 'fish_draynor_net', label: 'Draynor net fishing', world: [3087, 3230], kind: 'activity' },
    { id: 'fish_draynor_bait', label: 'Draynor bait fishing', world: [3087, 3230], kind: 'activity' },
    { id: 'fish_barbarian_fly', label: 'Barbarian fly fishing', world: [3105, 3432], kind: 'activity' },
    { id: 'fish_barbarian_bait', label: 'Barbarian bait fishing', world: [3105, 3432], kind: 'activity' },
    { id: 'fish_catherby_cage', label: 'Catherby cage fishing', world: [2850, 3427], kind: 'activity' },
    { id: 'fish_catherby_harpoon_sword', label: 'Catherby harpoon (swordfish)', world: [2850, 3427], kind: 'activity' },
    { id: 'fish_catherby_harpoon_shark', label: 'Catherby harpoon (shark)', world: [2850, 3427], kind: 'activity' },
    { id: 'fish_catherby_big_net', label: 'Catherby big net fishing', world: [2850, 3427], kind: 'activity' }
];

const WALK_EDGES: WalkEdge[] = [
    { from: 'hub_draynor', to: 'hub_lumbridge', path: LEGACY_WORLD_PATHS.DRAYNOR_TO_LUMBRIDGE },
    { from: 'hub_draynor', to: 'hub_falador', path: LEGACY_WORLD_PATHS.DRAYNOR_TO_FALADOR },
    { from: 'hub_falador', to: 'hub_barbarian_village', path: LEGACY_WORLD_PATHS.FALADOR_TO_BARB_VILLAGE },
    { from: 'hub_barbarian_village', to: 'hub_varrock', path: LEGACY_WORLD_PATHS.BARB_VILLAGE_TO_VARROCK },
    { from: 'hub_barbarian_village', to: 'bank_edgeville', path: LEGACY_WORLD_PATHS.BARB_VILLAGE_TO_EDGEVILLE },
    { from: 'hub_falador', to: 'hub_varrock', path: LEGACY_WORLD_PATHS.FALADOR_TO_VARROCK },
    { from: 'hub_varrock', to: 'hub_lumbridge', path: LEGACY_WORLD_PATHS.VARROCK_TO_LUMBRIDGE },
    { from: 'hub_draynor', to: 'hub_barbarian_village', path: LEGACY_WORLD_PATHS.DRAYNOR_TO_BARB_VILLAGE },
    { from: 'hub_falador', to: 'bank_catherby', path: LEGACY_WORLD_PATHS.FALADOR_TO_CATHERBY },
    { from: 'hub_lumbridge', to: 'bank_al_kharid', path: PATH_LUMBRIDGE_AL_KHARID },
    { from: 'hub_lumbridge', to: 'hub_port_sarim', path: PATH_LUMBRIDGE_PORT_SARIM },
    { from: 'hub_port_sarim', to: 'hub_rimmington', path: PATH_PORT_SARIM_RIMMINGTON },
    { from: 'hub_rimmington', to: 'hub_falador', path: PATH_RIMMINGTON_FALADOR },
    { from: 'bank_draynor', to: 'hub_draynor', path: [[3087, 3238], [3105, 3255], [3120, 3267]] },
    { from: 'bank_lumbridge', to: 'hub_lumbridge', path: [[3208, 3220], [3225, 3225], [3239, 3233]] },
    { from: 'bank_varrock_east', to: 'hub_varrock', path: [[3253, 3426], [3235, 3435], [3211, 3450]] },
    { from: 'bank_varrock_west', to: 'hub_varrock', path: [[3185, 3440], [3200, 3444], [3211, 3450]] },
    { from: 'bank_falador_east', to: 'hub_falador', path: [[3011, 3341], [3000, 3350], [2989, 3355]] },
    { from: 'hub_port_sarim', to: 'bank_draynor', path: [[3047, 3221], [3065, 3230], [3087, 3238]] },
    { from: 'wc_draynor_tree', to: 'bank_draynor', path: [[3088, 3235], [3087, 3238]] },
    { from: 'wc_draynor_oak', to: 'bank_draynor', path: [[3083, 3250], [3087, 3238]] },
    { from: 'wc_draynor_willow', to: 'bank_draynor', path: [[3084, 3230], [3087, 3238]] },
    { from: 'wc_varrock_east_tree', to: 'bank_varrock_east', path: [[3289, 3428], [3275, 3425], [3255, 3420]] },
    { from: 'wc_varrock_east_oak', to: 'bank_varrock_east', path: [[3275, 3426], [3262, 3423], [3255, 3420]] },
    { from: 'wc_varrock_north_yew', to: 'bank_varrock_west', path: [[3205, 3502], [3200, 3484], [3194, 3462], [3185, 3448], [3185, 3440]] },
    { from: 'wc_falador_south_yew', to: 'bank_falador_east', path: [[2997, 3312], [3005, 3330], [3011, 3341]] },
    { from: 'wc_catherby_oak', to: 'bank_catherby', path: [[2788, 3440], [2809, 3440]] },
    { from: 'wc_catherby_willow', to: 'bank_catherby', path: [[2783, 3428], [2795, 3435], [2809, 3440]] },
    { from: 'wc_catherby_yew', to: 'bank_catherby', path: [[2760, 3434], [2784, 3437], [2809, 3440]] },
    { from: 'wc_seers_maple', to: 'bank_seers', path: [[2720, 3475], [2727, 3493]] },
    { from: 'wc_seers_willow', to: 'bank_seers', path: [[2710, 3504], [2727, 3493]] },
    { from: 'wc_seers_yew', to: 'bank_seers', path: [[2707, 3465], [2718, 3478], [2727, 3493]] },
    { from: 'wc_edgeville_yew', to: 'bank_edgeville', path: [[3221, 3504], [3093, 3490]] },
    { from: 'wc_seers_magic', to: 'bank_seers', path: [[2705, 3396], [2727, 3493]] },
    { from: 'wc_seers_magic_north', to: 'bank_seers', path: [[2692, 3425], [2704, 3454], [2727, 3493]] },
    { from: 'bank_seers', to: 'bank_catherby', path: [[2727, 3493], [2750, 3450], [2811, 3441]] },
    {
        from: 'wc_gnome_magic_west',
        to: 'bank_gnome_stronghold',
        path: [[2371, 3426], [2405, 3425], [2432, 3422], [2460, 3440], [2484, 3464]],
        transition: { type: 'loc', locIds: GRAND_TREE_CLIMB_UP_LOC_IDS, op: 'Climb-up', target: [2444, 3424], targetPlane: 1 },
        bidirectional: false
    },
    {
        from: 'wc_gnome_magic_central',
        to: 'bank_gnome_stronghold',
        path: [[2432, 3410], [2440, 3420], [2460, 3440], [2484, 3464]],
        transition: { type: 'loc', locIds: GRAND_TREE_CLIMB_UP_LOC_IDS, op: 'Climb-up', target: [2444, 3424], targetPlane: 1 },
        bidirectional: false
    },
    {
        from: 'wc_gnome_magic_east',
        to: 'bank_gnome_stronghold',
        path: [[2490, 3414], [2480, 3425], [2460, 3440], [2484, 3464]],
        transition: { type: 'loc', locIds: GRAND_TREE_CLIMB_UP_LOC_IDS, op: 'Climb-up', target: [2444, 3424], targetPlane: 1 },
        bidirectional: false
    },
    {
        from: 'bank_gnome_stronghold',
        to: 'wc_gnome_magic_west',
        path: [[2444, 3424], [2485, 3464]],
        transition: { type: 'loc', locIds: GRAND_TREE_CLIMB_DOWN_LOC_IDS, op: 'Climb-down', target: [2371, 3426], targetPlane: 0 },
        bidirectional: false
    },
    {
        from: 'bank_gnome_stronghold',
        to: 'wc_gnome_magic_central',
        path: [[2444, 3424], [2485, 3464]],
        transition: { type: 'loc', locIds: GRAND_TREE_CLIMB_DOWN_LOC_IDS, op: 'Climb-down', target: [2432, 3410], targetPlane: 0 },
        bidirectional: false
    },
    {
        from: 'bank_gnome_stronghold',
        to: 'wc_gnome_magic_east',
        path: [[2444, 3424], [2485, 3464]],
        transition: { type: 'loc', locIds: GRAND_TREE_CLIMB_DOWN_LOC_IDS, op: 'Climb-down', target: [2490, 3414], targetPlane: 0 },
        bidirectional: false
    },
    { from: 'fish_draynor_net', to: 'bank_draynor', path: [[3087, 3230], [3087, 3238]] },
    { from: 'fish_draynor_bait', to: 'bank_draynor', path: [[3087, 3230], [3087, 3238]] },
    { from: 'fish_barbarian_fly', to: 'bank_edgeville', path: LEGACY_WORLD_PATHS.BARB_VILLAGE_TO_EDGEVILLE },
    { from: 'fish_barbarian_bait', to: 'bank_edgeville', path: LEGACY_WORLD_PATHS.BARB_VILLAGE_TO_EDGEVILLE },
    { from: 'fish_catherby_cage', to: 'bank_catherby', path: [[2851, 3428], [2836, 3434], [2821, 3438], [2809, 3440]] },
    { from: 'fish_catherby_harpoon_sword', to: 'bank_catherby', path: [[2851, 3428], [2836, 3434], [2821, 3438], [2809, 3440]] },
    { from: 'fish_catherby_harpoon_shark', to: 'bank_catherby', path: [[2851, 3428], [2836, 3434], [2821, 3438], [2809, 3440]] },
    { from: 'fish_catherby_big_net', to: 'bank_catherby', path: [[2851, 3428], [2836, 3434], [2821, 3438], [2809, 3440]] }
];

export const WALK_GRAPH: WalkGraphData = {
    nodes: WALK_NODES,
    edges: WALK_EDGES
};

/** Human-readable hub-to-hub routes for AutoWalker. */
export const HUB_ROUTE_OPTIONS: { label: string; from: WalkNode['id']; to: WalkNode['id'] }[] = [
    { label: 'Draynor ↔ Lumbridge', from: 'hub_draynor', to: 'hub_lumbridge' },
    { label: 'Draynor ↔ Falador', from: 'hub_draynor', to: 'hub_falador' },
    { label: 'Draynor ↔ Barb Village', from: 'hub_draynor', to: 'hub_barbarian_village' },
    { label: 'Barb Village ↔ Varrock', from: 'hub_barbarian_village', to: 'hub_varrock' },
    { label: 'Barb Village ↔ Edgeville bank', from: 'hub_barbarian_village', to: 'bank_edgeville' },
    { label: 'Falador ↔ Varrock', from: 'hub_falador', to: 'hub_varrock' },
    { label: 'Falador ↔ Catherby bank', from: 'hub_falador', to: 'bank_catherby' },
    { label: 'Varrock ↔ Lumbridge', from: 'hub_varrock', to: 'hub_lumbridge' },
    { label: 'Lumbridge ↔ Al Kharid bank', from: 'hub_lumbridge', to: 'bank_al_kharid' },
    { label: 'Lumbridge ↔ Port Sarim', from: 'hub_lumbridge', to: 'hub_port_sarim' },
    { label: 'Port Sarim ↔ Rimmington', from: 'hub_port_sarim', to: 'hub_rimmington' },
    { label: 'Rimmington ↔ Falador', from: 'hub_rimmington', to: 'hub_falador' }
];
