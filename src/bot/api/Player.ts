import { assertApi } from './botApiAssert.js';
import type BotAPI from './BotAPI';

export default class Player {
    api: BotAPI;

    lastCombatUpdate: number;
    isInCombatScore: number;

    constructor(api: BotAPI) {
        this.api = api;

        this.lastCombatUpdate = 0;
        this.isInCombatScore = 0;
    }

    private log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', source: string, message: string, detail?: unknown): void {
        this.api.bot.log(level, source, message, detail);
    }

    private logFn() {
        return (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', source: string, message: string, detail?: unknown) => this.api.bot.log(level, source, message, detail);
    }

    getLocalX() {
        return this.api.surface.localPlayer?.routeX[0] ?? -1;
    }

    getLocalZ() {
        return this.api.surface.localPlayer?.routeZ[0] ?? -1;
    }

    enableRun() {
        this.log('DEBUG', 'Player.enableRun', 'doAction 960 run energy');
        this.api.doAction(960, 0, 0, 153);
    }

    hasTarget() {
        return this.api.surface.localPlayer?.faceEntity != -1;
    }

    isInCombat() {
        const lp = this.api.surface.localPlayer;
        if (!lp) {
            return false;
        }
        const now = Date.now();

        if (this.isInCombatScore != lp.combatCycle) {
            this.lastCombatUpdate = now;
            this.isInCombatScore = lp.combatCycle;
            this.log('DEBUG', 'Player.isInCombat', 'combatCycle changed', { combatCycle: lp.combatCycle });
        }
        if (now >= this.lastCombatUpdate + 2800) {
            return false;
        }
        return true;
    }

    isMoving() {
        return (this.api.surface.localPlayer?.routeLength ?? 0) > 0;
    }

    isAnimating() {
        return (this.api.surface.localPlayer?.primaryAnim ?? -1) >= 0;
    }

    changeAttackStyle(index: number) {
        assertApi(index >= 0 && index <= 3, this.logFn(), 'Player.changeAttackStyle', 'index must be 0..3', { index });
        const scim_ids = [2429, 2432, 2431, 2430];
        const sword_ids = [2282, 2285, 2284, 2283];
        const param = sword_ids[index];
        this.log('DEBUG', 'Player.changeAttackStyle', 'doAction', { index, param, scimNote: scim_ids });
        this.api.doAction(960, 0, 0, param);
    }

    getLevel(skillId: number) {
        return this.api.surface.skillLevel[skillId];
    }

    getBaseLevel(skillId: number) {
        return this.api.surface.skillBaseLevel[skillId];
    }

    getXP(skillId: number) {
        return this.api.surface.skillExperience[skillId];
    }
}
