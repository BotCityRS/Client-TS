import IfType from "#/config/IfType.js";

export default class Interface {
    getInterface(id: number) {
        return IfType.list[id];
    }
}
