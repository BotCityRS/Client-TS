import Component from "#/config/Component";

export default class Interface {
    constructor() {

    }

    getInterface(id: number) {
        return Component.instances[id];
    }
}