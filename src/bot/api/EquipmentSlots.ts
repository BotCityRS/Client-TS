export const EQUIPMENT_SLOT_IDS = {
    hat: 0,
    back: 1,
    front: 2,
    rhand: 3,
    torso: 4,
    lhand: 5,
    arms: 6,
    legs: 7,
    head: 8,
    hands: 9,
    feet: 10,
    jaw: 11,
    ring: 12,
    quiver: 13
} as const;

export type EquipmentSlotName = keyof typeof EQUIPMENT_SLOT_IDS;

export const EQUIPMENT_SLOT_NAMES: readonly EquipmentSlotName[] = [
    'hat',
    'back',
    'front',
    'rhand',
    'torso',
    'lhand',
    'arms',
    'legs',
    'head',
    'hands',
    'feet',
    'jaw',
    'ring',
    'quiver'
];

export function getEquipmentSlotId(slot: number | EquipmentSlotName): number {
    return typeof slot === 'number' ? slot : EQUIPMENT_SLOT_IDS[slot];
}

export function getEquipmentSlotName(slot: number): EquipmentSlotName | null {
    return EQUIPMENT_SLOT_NAMES[slot] ?? null;
}
