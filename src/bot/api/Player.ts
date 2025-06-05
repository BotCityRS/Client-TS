import PlayerEntity from "#/dash3d/entity/PlayerEntity";
import type BotAPI from "./BotAPI";
import Timer from "./Timer";
import Utility from "./Utility";

export default class Player {
    api: BotAPI;

    lastCombatUpdate: number;
    isInCombatScore: number;
    
    constructor(api: BotAPI) {
        this.api = api;

        this.lastCombatUpdate = 0;
        this.isInCombatScore = 0;
    }

    getLocalX() {
        return this.api.client.localPlayer?.routeFlagX[0] ?? -1;
    }

    getLocalZ() {
        return this.api.client.localPlayer?.routeFlagZ[0] ?? -1;
    }

    enableRun() {
        this.api.doAction(960, 0, 0, 153)
    }

    hasTarget() {
        return this.api.client.localPlayer?.targetId != -1;
    }

    isInCombat() {
        if (!this.api.client.localPlayer)
            return;
        const now = new Date().getTime();

        if (this.isInCombatScore != this.api.client.localPlayer.combatCycle) {
            this.lastCombatUpdate = now;
            this.isInCombatScore = this.api.client.localPlayer.combatCycle;
        }
        if (now >= this.lastCombatUpdate + 2800) {
            return false;
        }
        return true;
    }

    isMoving() {
        return (this.api.client.localPlayer?.routeLength ?? 0) > 0;
    }

    isAnimating() {
        return (this.api.client.localPlayer?.primarySeqId ?? -1) >= 0
    }

    changeAttackStyle(index: number) {
        // TODO make change on weapon held
        const scim_ids = [2429, 2432, 2431, 2430];
        const sword_ids = [2282, 2285, 2284, 2283];
        this.api.doAction(960, 0, 0, sword_ids[index]);
    }

    getLevel(skillId: number) {
        return this.api.client.skillLevel[skillId];
    }

    getBaseLevel(skillId: number) {
        return this.api.client.skillBaseLevel[skillId];
    }

    getXP(skillId: number) {
        return this.api.client.skillExperience[skillId];
    }
}