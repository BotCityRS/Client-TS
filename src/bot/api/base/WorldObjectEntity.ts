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

    interactByOpEquals(verb: string): boolean {
        const ops = this.locType.op;
        if (!ops) {
            this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpEquals', 'loc has no ops', {
                id: this.id,
                verb
            });
            return false;
        }
        const want = verb.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = ops[i];
            if (op === null || op === undefined) {
                continue;
            }
            if (op.toLowerCase() === want) {
                this.api.bot.log('INFO', 'WorldObjectEntity.interactByOpEquals', 'matched', {
                    id: this.id,
                    verb,
                    opSlot: i
                });
                this.interact(i);
                return true;
            }
        }
        this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpEquals', 'no matching op', {
            id: this.id,
            verb,
            ops: [...ops]
        });
        return false;
    }

    interactByOpIncludes(needle: string): boolean {
        const ops = this.locType.op;
        if (!ops) {
            this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpIncludes', 'loc has no ops', {
                id: this.id,
                needle
            });
            return false;
        }
        const lower = needle.toLowerCase();
        for (let i = 4; i >= 0; i--) {
            const op = ops[i];
            if (op === null || op === undefined) {
                continue;
            }
            if (op.toLowerCase().includes(lower)) {
                this.api.bot.log('INFO', 'WorldObjectEntity.interactByOpIncludes', 'matched', {
                    id: this.id,
                    needle,
                    verb: op,
                    opSlot: i
                });
                this.interact(i);
                return true;
            }
        }
        this.api.bot.log('WARN', 'WorldObjectEntity.interactByOpIncludes', 'no matching op', {
            id: this.id,
            needle,
            ops: [...ops]
        });
        return false;
    }

    examine() {
        const lx = this.typecode & 0x7f;
        const lz = (this.typecode >> 7) & 0x7f;
        this.api.doAction(MiniMenuAction.OP_LOC6, this.typecode, lx, lz);
    }
}