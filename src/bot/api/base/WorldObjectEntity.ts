import type LocType from "#/config/LocType";
import type Entity from "#/dash3d/entity/Entity";
import type BotAPI from "../BotAPI";
import Utility from "../Utility";

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
        const optionIDs = [285, 504, 364, 581, 1501];
        this.api.doAction(optionIDs[optionIndex], this.typecode, this.x, this.z)
    }

    examine() {
        this.api.doAction(1175, this.typecode, this.x, this.z)
    }
}