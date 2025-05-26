import { Client } from "#/client/Client";
import Component from "#/config/Component";
import ObjType from "#/config/ObjType";
import NpcEntity from "#/dash3d/entity/NpcEntity";
import type ObjStackEntity from "#/dash3d/entity/ObjStackEntity";
import AutoKiller from "./scripts/AutoKiller";
import BotScript from "./scripts/BotScript";

const BOT_TIMER_WALK = -20;

export default class Bot {

    private client: Client;

    intervalHandle: number;
    lastCombatUpdate: number;
    isInCombatScore: number;
    timers: any;

    constructor(client: Client, window: Window) {
        window.bot = this;
        this.client = client;

    
        this.lastCombatUpdate = new Date().getTime();
        this.isInCombatScore = -1000;
        this.timers = [];
    }

    getDistance(x1: number, z1: number, x2: number, z2: number) {
        return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(z1 - z2), 2));
    }

    setMenuOptions(menuOption:number, p1: number, p2: number, p3: number) {
        this.client.menuAction[0] = menuOption;
        this.client.menuParamA[0] = p1;
        this.client.menuParamB[0] = p2;
        this.client.menuParamC[0] = p3;
    }

    async doAction(menuOption:number, p1: number, p2: number, p3: number) {
        this.setMenuOptions(menuOption, p1, p2, p3);
        this.client.useMenuOption(0); 
    }

    getNPCs() {
        const _npcs = this.client.npcs;
        const npcs = [];
        for (let i = 0; i < _npcs.length; ++i) {
            if (_npcs[i] != null) {
                _npcs[i].listId = i;
                npcs.push(_npcs[i]);
            }
        }
        return npcs;
    }

    getNPCsById(id: number, includeInCombat: boolean) {
        const npcs = this.getNPCs();
        let orderedNPCs: NpcEntity[] = [];
        for (let i = 0; i < npcs.length; ++i) {
            if (npcs[i] && npcs[i]?.npcType?.id == id && (!includeInCombat || npcs[i]?.targetId == -1)) {
                orderedNPCs.push(npcs[i]);
            }
        }
        return orderedNPCs;
    }

    getNPCsByIdNearest(id: number, includeInCombat: boolean) {
        const player = this.client.localPlayer;
        if (!player) {
            return [];
        }
        const npcs = this.getNPCsById(id, includeInCombat);
        let orderedNPCs = [];
        for (let i = 0; i < npcs.length; ++i) {
            let dist = this.getDistance(player.x, player.z, npcs[i]?.x, npcs[i]?.z);
            npcs[i].dist = dist;
            let found = false;
            for (let sp = 0; sp < orderedNPCs.length; ++sp) {
                if (dist <= orderedNPCs[sp].dist) {
                    orderedNPCs.splice(sp, 0, npcs[i]);
                    found = true;
                    break;
                }
            }
            if (!found) {
                orderedNPCs.push(npcs[i]);
            }
        }
        return orderedNPCs;
    }

    attackNPC(id: number) {
        const npc = this.getNPCsByIdNearest(id, false);
        if (npc?.length > 0) {
            this.doAction(542, npc[0].listId, npc[0].x, npc[0].z);
        }
    }

    interactItem(itemId: number, optionIndex: number) {
        // TODO make optionIDs dynamic based on item
        const optionIds = [405, 38, 422];
        for (let s = 0; s < 28; ++s) {
            const invItem = this.getInvItem(s);
            if (invItem && invItem.id == itemId) {
                this.doAction(optionIds[optionIndex], itemId, s, invItem.interfaceId);
                return true;
            }
        }
        return false;
    };

    getInvItem(slotId: number) {
        const inv = Component.instances[3214];
        const slotItem = inv.invSlotObjId[slotId];
        if (slotItem > 0) {
            const invItem = ObjType.get(slotItem - 1);
            if (invItem) {
                invItem.interfaceId = inv.id;
                invItem.slotId = slotId;
            }
            return invItem;
        }
        return null;
    };

    setTimer(id: number, ms: number) {
        const realID = id + 1000; // 1000 timers reserved for injector
        this.timers[realID] = new Date().getTime() + ms;
    }

    hasTimer(id: number) {
        const realID = id + 1000;
        const now = new Date().getTime();
        return (this.timers[realID] || 0) > now;
    }
    
    clearTimer(id: number) {
        const realID = id + 1000;
        return this.timers[realID] = 0;
    }

    start(script: BotScript) {
        this.stop();
        const tickFunc = () => {
            //client.resetIdleTimeout();
            script.start(this)
        }
        this.intervalHandle = setInterval(tickFunc, 100);
        console.info('Script started.');
    }

    stop() {
        clearInterval(this.intervalHandle);
        console.info('Script stopped.');
    }

    enableRun() {
        this.doAction(960, 0, 0, 153)
    }

    hasTarget() {
        if (this.client.localPlayer == null) {
            return false;
        }
        return this.client.localPlayer.targetId != -1;
    }

    isInCombat() {
        if (this.client.localPlayer == null) {
            return false;
        }
        const lastScore = this.isInCombatScore;
        const newScore = this.client.localPlayer.combatCycle;
        const now = new Date().getTime();
        if (lastScore != newScore) {
            this.lastCombatUpdate = now;
            this.isInCombatScore = newScore;
        }
        if (now >= this.lastCombatUpdate + 2800) {
            return false;
        }
        return true;
    }

    isMoving() {
        return (this.client.localPlayer?.routeLength ?? 0) > 0;
    }

    
    _buildPickUpCallback = (index: number, x: number, z: number) => {
        return () => {
            this.doAction(99, index, x, z);
        };
    };
    getGroundItems() {
        let items = [];
        const currentLevel = this.client.currentLevel;
        const levelObjectStacks = this.client.objStacks;
        for (let x = 0; x < levelObjectStacks[currentLevel].length; ++x) {
            if (levelObjectStacks[currentLevel][x] != null) {
                for (let z = 0; z < levelObjectStacks[currentLevel][x].length; ++z) {
                    const itemStack = levelObjectStacks[currentLevel][x][z];
                    if (itemStack != null) {
                        let item = itemStack.sentinel.next as unknown as ObjStackEntity;
                        let loops = 10;
                        while(item.index != null && loops-- > 0) {
                            const pickUp = this._buildPickUpCallback(item.index, x, z);
                            let def = {x,z,index:item.index,count:item.count,dist:Number.MAX_SAFE_INTEGER, pickUp};
                            items.push(def);
                            item = item.next
                        }
                    }
                }
            }
        }
        return items;
    };
    
    getNearestGroundItems = (ids: number[], maxDist: number) => {
        if (!this.client.localPlayer) {
            return [];
        }
        const groundItems = this.getGroundItems();
        let items = [];
        for (let i = 0; i < groundItems.length; ++i) {
            for (let j = 0; j < ids.length; ++j) {
                if (groundItems[i].index == ids[j]) {
                    let dist =  this.getDistance(this.client.localPlayer.routeFlagX[0], this.client.localPlayer.routeFlagZ[0], groundItems[i].x, groundItems[i].z);
                    groundItems[i].dist = dist;
                    if (dist > maxDist) {
                        break;
                    }
                    let found = false;
                    for (let sp = 0; sp < items.length; ++sp) {
                        if (dist <= items[sp].dist) {
                            items.splice(sp, 0, groundItems[i]);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        items.push(groundItems[i]);
                    }
                    break;
                }
            }
        }
        return items;
    };

    isLoggedIn() {
        return this.client.ingame;
    }

    login() {
        this.client.tryLogin(this.client.usernameInput, this.client.passwordInput, true)
    }

    changeAttackStyle(index: number) {
        // TODO make change on weapon held
        const scim_ids = [2429, 2432, 2431, 2430];
        const sword_ids = [2282, 2285, 2284, 2283];
        this.doAction(960, 0, 0, sword_ids[index]);
    }

    startScript() {
        this.start(new AutoKiller(1, [41], [314,526], true))

    }
}
