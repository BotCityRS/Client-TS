import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import { assertApi } from './botApiAssert.js';
import type BotAPI from './BotAPI';
import { findAttackStyleButtonComIdFromSidebarSlots } from './combatStyleIfButtons.js';

const STAT_HITPOINTS = 3;

export type PlayerTilePosition = {
    x: number;
    z: number;
    plane: number;
};

export type PlayerAnimationState = {
    id: number;
    frame: number;
    delay: number;
    loop: number;
};

export type PlayerTarget =
    | { kind: 'npc'; slot: number; raw: number }
    | { kind: 'player'; slot: number; raw: number };

export type PlayerHealthBar = {
    current: number;
    total: number;
    percent: number;
};

export type PlayerHitmark = {
    slot: number;
    value: number;
    type: number;
    cycle: number;
};

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

    getLocalPosition(): PlayerTilePosition {
        return {
            x: this.getLocalX(),
            z: this.getLocalZ(),
            plane: this.api.surface.currentLevel
        };
    }

    getWorldPosition(): PlayerTilePosition {
        const local = this.getLocalPosition();
        return {
            x: local.x >= 0 ? local.x + this.api.surface.sceneBaseTileX : -1,
            z: local.z >= 0 ? local.z + this.api.surface.sceneBaseTileZ : -1,
            plane: local.plane
        };
    }

    enableRun() {
        this.api.doAction(MiniMenuAction.IF_BUTTON, 0, 0, 153);
    }

    hasTarget() {
        return this.api.surface.localPlayer?.faceEntity != -1;
    }

    getTarget(): PlayerTarget | null {
        const raw = this.api.surface.localPlayer?.faceEntity ?? -1;
        if (raw < 0) {
            return null;
        }
        if (raw < 32768) {
            return { kind: 'npc', slot: raw, raw };
        }
        return { kind: 'player', slot: raw - 32768, raw };
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

    isIdle() {
        return !this.isMoving() && !this.isAnimating() && !this.hasTarget();
    }

    getCombatLevel() {
        return this.api.surface.localPlayer?.combatLevel ?? 0;
    }

    getCurrentHP() {
        return this.getLevel(STAT_HITPOINTS) ?? 0;
    }

    getMaxHP() {
        return this.getBaseLevel(STAT_HITPOINTS) ?? 0;
    }

    getHPPercent() {
        const max = this.getMaxHP();
        if (max <= 0) {
            return 0;
        }
        return Math.max(0, Math.min(100, (this.getCurrentHP() / max) * 100));
    }

    getRunEnergy() {
        return this.api.surface.runEnergy;
    }

    getWeight() {
        return this.api.surface.runWeight;
    }

    getOverheadText(): string | null {
        return this.api.surface.localPlayer?.chatMessage ?? null;
    }

    getChatMessage(): string | null {
        return this.getOverheadText();
    }

    getOverheadTextTicks(): number {
        return this.api.surface.localPlayer?.chatTimer ?? 0;
    }

    getHealthBar(): PlayerHealthBar {
        const lp = this.api.surface.localPlayer;
        const current = lp?.health ?? 0;
        const total = lp?.totalHealth ?? 0;
        return {
            current,
            total,
            percent: total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0
        };
    }

    getHitmarks(): PlayerHitmark[] {
        const lp = this.api.surface.localPlayer;
        if (!lp) {
            return [];
        }
        const hitmarks: PlayerHitmark[] = [];
        for (let slot = 0; slot < lp.damageValues.length && slot < lp.damageTypes.length && slot < lp.damageCycles.length; slot++) {
            hitmarks.push({
                slot,
                value: lp.damageValues[slot],
                type: lp.damageTypes[slot],
                cycle: lp.damageCycles[slot]
            });
        }
        return hitmarks;
    }

    isInMultiway(): boolean {
        return this.api.surface.inMultizone === 1;
    }

    isMembersAccount(): boolean {
        return this.api.surface.membersAccount === 1;
    }

    getAnimation(): PlayerAnimationState {
        const lp = this.api.surface.localPlayer as (NonNullable<typeof this.api.surface.localPlayer> & {
            primaryAnimFrame?: number;
            primaryAnimDelay?: number;
            primaryAnimLoop?: number;
        }) | null;
        return {
            id: lp?.primaryAnim ?? -1,
            frame: lp?.primaryAnimFrame ?? -1,
            delay: lp?.primaryAnimDelay ?? -1,
            loop: lp?.primaryAnimLoop ?? -1
        };
    }

    getRoute(): PlayerTilePosition[] {
        const lp = this.api.surface.localPlayer;
        if (!lp) {
            return [];
        }
        const len = Math.max(0, lp.routeLength);
        const route: PlayerTilePosition[] = [];
        for (let i = 0; i <= len && i < lp.routeX.length && i < lp.routeZ.length; i++) {
            route.push({
                x: lp.routeX[i],
                z: lp.routeZ[i],
                plane: this.api.surface.currentLevel
            });
        }
        return route;
    }

    getDestination(): PlayerTilePosition {
        const route = this.getRoute();
        return route[route.length - 1] ?? this.getLocalPosition();
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
