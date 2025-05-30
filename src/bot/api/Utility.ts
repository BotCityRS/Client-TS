
export default class Utility {
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