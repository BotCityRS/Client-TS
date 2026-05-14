import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import { assertApi } from './botApiAssert.js';
import type BotAPI from './BotAPI';
import { findAttackStyleButtonComIdFromSidebarSlots } from './combatStyleIfButtons.js';

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
        this.log('DEBUG', 'Player.enableRun', 'IF_BUTTON run toggle', { comId: 153 });
        this.api.doAction(MiniMenuAction.IF_BUTTON, 0, 0, 153);
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
        const tabs = this.api.surface.sidebarTabOverlayRootIds;
        const comId = findAttackStyleButtonComIdFromSidebarSlots(tabs, index);
        if (comId === null) {
            this.log('WARN', 'Player.changeAttackStyle', 'no combat interface in sidebar tabs (logged in / weapon equipped?)', {
                index,
                sidebarTabRoots: tabs
            });
            return;
        }
        this.log('DEBUG', 'Player.changeAttackStyle', 'IF_BUTTON', { index, comId, sidebarTabRoots: tabs });
        this.api.doAction(MiniMenuAction.IF_BUTTON, 0, 0, comId);
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
