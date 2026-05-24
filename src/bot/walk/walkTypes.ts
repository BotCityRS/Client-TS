export type PathNode = [x: number, z: number];
export type Path = PathNode[];

export type WalkNodeKind = 'bank' | 'hub' | 'activity';

export type WalkTransition = {
    type: 'loc';
    locIds: number[];
    op: string;
    target: PathNode;
    targetPlane?: number;
    timeoutMs?: number;
};

export type WalkNodeId =
    | 'bank_lumbridge'
    | 'bank_draynor'
    | 'bank_varrock_east'
    | 'bank_varrock_west'
    | 'bank_falador_east'
    | 'bank_falador_west'
    | 'bank_edgeville'
    | 'bank_al_kharid'
    | 'bank_catherby'
    | 'bank_seers'
    | 'bank_gnome_stronghold'
    | 'hub_lumbridge'
    | 'hub_draynor'
    | 'hub_falador'
    | 'hub_varrock'
    | 'hub_barbarian_village'
    | 'hub_port_sarim'
    | 'hub_rimmington'
    | 'wc_draynor_tree'
    | 'wc_draynor_oak'
    | 'wc_draynor_willow'
    | 'wc_varrock_east_tree'
    | 'wc_varrock_east_oak'
    | 'wc_varrock_north_yew'
    | 'wc_falador_south_yew'
    | 'wc_catherby_oak'
    | 'wc_catherby_willow'
    | 'wc_catherby_yew'
    | 'wc_seers_maple'
    | 'wc_seers_willow'
    | 'wc_seers_yew'
    | 'wc_edgeville_yew'
    | 'wc_seers_magic'
    | 'wc_seers_magic_north'
    | 'wc_gnome_magic_west'
    | 'wc_gnome_magic_central'
    | 'wc_gnome_magic_east'
    | 'fish_draynor_net'
    | 'fish_draynor_bait'
    | 'fish_barbarian_fly'
    | 'fish_barbarian_bait'
    | 'fish_catherby_cage'
    | 'fish_catherby_harpoon_sword'
    | 'fish_catherby_harpoon_shark'
    | 'fish_catherby_big_net';

export type WalkNode = {
    id: WalkNodeId;
    label: string;
    world: PathNode;
    kind: WalkNodeKind;
    plane?: number;
};

export type WalkEdge = {
    from: WalkNodeId;
    to: WalkNodeId;
    path: Path;
    transition?: WalkTransition;
    /** When true (default), a reverse edge is registered at graph load. */
    bidirectional?: boolean;
};

export type WalkGraphData = {
    nodes: WalkNode[];
    edges: WalkEdge[];
};
