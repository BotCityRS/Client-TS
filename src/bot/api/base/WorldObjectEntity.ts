import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type LocType from '#/config/LocType';
import type BotAPI from '../BotAPI';
import Utility from "../Utility";

const LOC_INTERACT_OPCODES: readonly number[] = [
    MiniMenuAction.OP_LOC1,
    MiniMenuAction.OP_LOC2,
    MiniMenuAction.OP_LOC3,
    MiniMenuAction.OP_LOC4,
    MiniMenuAction.OP_LOC5
];

export default class WorldObjectEntity {
    api: BotAPI;
    x: number;
    z: number;
    id: number;
    typecode: number;
    locType: LocType;
    playerDist: number;

    constructor(api: BotAPI, id: number, x: number, z: number, typecode: number, locType: LocType) {
        this.api = api;
        this.id = id;
        this.x = x;
        this.z = z;
        this.typecode = typecode;
        this.locType = locType;
        this.playerDist = Utility.getDistance(api.player.getLocalX(), api.player.getLocalZ(), x, z);
    }

    interact(optionIndex: number) {
        // `Client.doAction` OP_LOC* passes `interactWithLoc(b, c, a, …)` — same as the real menu:
        // param A = packed typecode; B/C = low bits of typecode (scene fine tile indices), not model x/z.
        const lx = this.typecode & 0x7f;
        const lz = (this.typecode >> 7) & 0x7f;
        const opcode = LOC_INTERACT_OPCODES[optionIndex] ?? MiniMenuAction.OP_LOC1;
        this.api.doAction(opcode, this.typecode, lx, lz);
    }

    examine() {
        const lx = this.typecode & 0x7f;
        const lz = (this.typecode >> 7) & 0x7f;
        this.api.doAction(MiniMenuAction.OP_LOC6, this.typecode, lx, lz);
    }
}