const hookLoader = (client) => {
    client.useMenuOption = client.IV;
    client.setMenuOptions = (option, p1, p2, p3) => {
        client.up[0] = option;
        client.dn[0] = p1;
        client.bn[0] = p2;
        client.fn[0] = p3;
    };
    client.npcs = () => client.sm;
    client.currentLevel = () => client.JS;
    client.levelObjectStacks = () => client.wm;
    client.localPlayer = () => client.fo;
    client.isMoving = () => client.Ck;
    client.isLoggedIn = () => client.hN;
    client.login = client.vn;
    client.getWalkPathX = (entity) => entity.ML;
    client.getWalkPathZ = (entity) => entity.LL;
    client.getGroundItemStack = (itemStack) => itemStack.I;
    client.getTargetId = (entity) => entity.tM;
    client.playerIsInCombatScore = () => client.localPlayer()?.ZM;
    client.interfaces = Rt.Na;
    client.interfaceSlot = (interf, slotId) => interf.$Q[slotId];
    client.getInterfaceObject = (interfSlot) => ut.get(interfSlot);
    client.resetIdleTimeout = () => {client.qm = 0; client.eN = Date.now();}
    client.tryMove = client.bV;
    client.sceneBaseTileX = () => client.fS;
    client.sceneBaseTileZ = () => client.hS;
    client.baseX = () => client.Id;
    client.baseZ = () => client.Rd;
};

const injector = (client) => {
    hookLoader(client);
    window.bot = {};
    window.util = {};
    let intervalHandle = null;
    let lastCombatUpdate = new Date().getTime();
    let isInCombatScore = -1000;
    let timers = [];
    const BOT_TIMER_WALK = -20;
    window.bot.getClient = () => {
        return client;
    };
    window.util.getDistance = (x1, z1, x2, z2) => {
        return Math.sqrt(Math.pow(Math.abs(x1 - x2), 2) + Math.pow(Math.abs(z1 - z2), 2));
    };
    window.bot.doAction = (menuOption, p1, p2, p3) => {
        client.setMenuOptions(menuOption, p1, p2, p3);
        client.useMenuOption(0); 
    };
    window.bot.getNPCs = () => {
        const _npcs = client.npcs();
        const npcs = [];
        for (let i = 0; i < _npcs.length; ++i) {
            if (_npcs[i] != null) {
                _npcs[i].listId = i;
                npcs.push(_npcs[i]);
            }
        }
        return npcs;
    };
    window.bot.handleRandoms = () => {
        const talkToIds = [409, 410, 956]; //genie, mysteroldman, drunkdwarf
        const runFromIds = [411, 428, 422]; //swarm, shade, zombie
        // const talkToRandoms = window.bot.getNPCsByIds(talkToIds);
       // if (talkToRandoms.length > 0) {
            // talk-to each random
        //}
    };
    window.bot.getPlayerPos = () => {
        let coords = {x: -1, z: -1, chunkX: -1, chunkZ: -1, worldX: -1, worldZ: -1};
        const player = window.bot.getPlayer()
        if (!player) {
            return coords;
        }
        coords.x = client.getWalkPathX(player)[0];
        coords.z = client.getWalkPathZ(player)[0];
        coords.chunkX = client.sceneBaseTileX();
        coords.chunkZ = client.sceneBaseTileZ();
        coords.worldX = client.sceneBaseTileX() + coords.x;
        coords.worldZ = client.sceneBaseTileZ() + coords.z;
        return coords;
    };
    window.bot.info = () => {
        console.info('Player pos: ', window.bot.getPlayerPos());
    };
    window.bot.walkTo = (x, z) => {
        const playerPos = window.bot.getPlayerPos();
        client.tryMove(playerPos.x, playerPos.z, x - playerPos.chunkX, z - playerPos.chunkZ, 0, 0, 0, 0, 0, 0, true);
    };
    window.bot.isPlayerNear = (x, z, dist) => {
        const playerPos = window.bot.getPlayerPos();
        const calcDist = window.util.getDistance(playerPos.x, playerPos.z, x - playerPos.chunkX, z - playerPos.chunkZ);
        return calcDist < dist;
    };
    window.bot.walkPath = (coords) => {
        let i = 0;
        return () => {
            if (i < coords.length) {
                let coord = coords[i];
                if (!window.bot.hasTimer(BOT_TIMER_WALK) && (!window.bot.isMoving() || window.bot.isPlayerNear(coord[0], coord[1], 4))) {
                    if (i < coords.length) {
                        coord = coords[i++];
                        window.bot.walkTo(coord[0], coord[1]);
                        window.bot.setTimer(BOT_TIMER_WALK, 2000);
                        return false;
                    } else {
                        return true;
                    }
                }
                return false;
            }
            return window.bot.isPlayerNear(coords[coords.length - 1][0], coords[coords.length - 1][1], 1);
        };
    };
    window.bot.getNPCsById = (id, includeInCombat) => {
        const npcs = window.bot.getNPCs();
        let orderedNPCs = [];
        for (let i = 0; i < npcs.length; ++i) {
            if (npcs[i].type && npcs[i].type.id == id && (!includeInCombat || client.getTargetId(npcs[i]) == -1)) {
                orderedNPCs.push(npcs[i]);
            }
        }
        return orderedNPCs;
    }
    window.bot.getNPCsByIdNearest = (id, includeInCombat) => {
        const player = window.bot.getPlayer();
        if (!player) {
            return [];
        }
        const npcs = window.bot.getNPCsById(id, includeInCombat);
        let orderedNPCs = [];
        for (let i = 0; i < npcs.length; ++i) {
            let dist = window.util.getDistance(client.getWalkPathX(player)[0], client.getWalkPathZ(player)[0], client.getWalkPathX(npcs[i])[0], client.getWalkPathZ(npcs[i])[0]);
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
    window.bot._buildPickUpCallback = (index, x, z) => {
        return () => {
            window.bot.doAction(99, index, x, z);
        };
    };
    window.bot.getGroundItems = () => {
        let items = [];
        const currentLevel = client.currentLevel();
        const levelObjectStacks = client.levelObjectStacks();
        for (let x = 0; x < levelObjectStacks[currentLevel].length; ++x) {
            if (levelObjectStacks[currentLevel][x] != null) {
                for (let z = 0; z < levelObjectStacks[currentLevel][x].length; ++z) {
                    const itemStack = levelObjectStacks[currentLevel][x][z];
                    if (itemStack != null) {
                        let item = client.getGroundItemStack(itemStack).next;
                        let loops = 10;
                        while(item.index != null && loops-- > 0) {
                            let def = {x,z,index:item.index,count:item.count};
                            def.pickUp = window.bot._buildPickUpCallback(def.index, x, z);
                            items.push(def);
                            item = item.next;
                        }
                    }
                }
            }
        }
        return items;
    };
    window.bot.getNearestGroundItems = (ids, maxDist) => {
        const player = window.bot.getPlayer();
        if (!player) {
            return [];
        }
        const groundItems = window.bot.getGroundItems();
        let items = [];
        for (let i = 0; i < groundItems.length; ++i) {
            for (let j = 0; j < ids.length; ++j) {
                if (groundItems[i].index == ids[j]) {
                    let dist =  window.util.getDistance(client.getWalkPathX(player)[0], client.getWalkPathZ(player)[0], groundItems[i].x, groundItems[i].z);
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
    window.bot.enableRun = () => {
        window.bot.doAction(960, null, null, 153);
    };
    window.bot.changeAttackStyle = (index) => {
        const scim_ids = [2429, 2432, 2431, 2430];
        const sword_ids = [2282, 2285, 2284, 2283];
        window.bot.doAction(960, null, null, sword_ids[index]);
    };
    window.bot.attackNPC = (id) => {
        const npc = window.bot.getNPCsByIdNearest(id, false);
        if (npc.length > 0) {
            window.bot.doAction(542, npc[0].listId, npc[0].x, npc[0].z);
        }
    };
    window.bot.setTimer = (id, ms) => {
        const realID = id + 20; // 20 timers reserved for injector
        timers[realID] = new Date().getTime() + ms;
    }
    window.bot.hasTimer = (id) => {
        const realID = id + 20;
        const now = new Date().getTime();
        return (timers[realID] || 0) > now;
    }
    window.bot.clearTimer = (id) => {
        const realID = id + 20;
        return timers[realID] = 0;
    }
    window.bot.getPlayer = () => {
        return client.localPlayer();
    };
    window.bot.hasTarget = () => {
        const player = window.bot.getPlayer();
        if (player == null) {
            return false;
        }
        return client.getTargetId(player) != -1;
    };
    window.bot.isInCombat = () => {
        const player = window.bot.getPlayer();
        if (player == null) {
            return false;
        }
        const lastScore = isInCombatScore;
        const newScore = client.playerIsInCombatScore();
        const now = new Date().getTime();
        if (lastScore != newScore) {
            lastCombatUpdate = now;
            isInCombatScore = newScore;
        }
        if (now >= lastCombatUpdate + 2800) {
            return false;
        }
        return true;
    };
    window.bot.interactItem = (itemId, optionIndex) => {
        const optionIds = [405, 38, 422];
        for (let s = 0; s < 28; ++s) {
            const invItem = window.bot.getInvItem(s);
            if (invItem && invItem.id == itemId) {
                window.bot.doAction(optionIds[optionIndex], itemId, s, invItem.interfaceId);
                return true;
            }
        }
        return false;
    };
    // window.bot.interactWorldObject = (optionIndex, x, z) => {
    //     const actions = [285, 504, 364, 581, 1501];
    //     window.bot.doAction(actions[optionIndex], )
    // };
    window.bot.isInvFull = () => {
        for (let s = 0; s < 28; ++s) {
            const invItem = window.bot.getInvItem(s);
            if (invItem) {
                return false;
            }
        }
        return true;
    };
    window.bot.hasItem = (itemId) => {
        for (let s = 0; s < 28; ++s) {
            const invItem = window.bot.getInvItem(s);
            if (invItem && invItem.id == itemId) {
                return true;
            }
        }
        return false;
    };
    window.bot.getInvItem = (slotId) => {
        const inv = client.interfaces[3214];
        const slotItem = client.interfaceSlot(inv, slotId);
        if (slotItem > 0) {
            const invItem = client.getInterfaceObject(slotItem - 1);
            if (invItem) {
                invItem.interfaceId = inv.id;
            }
            return invItem;
        }
        return null;
    };
    window.bot.isMoving = () => {
        return client.isMoving();
    };
    window.bot.isLoggedIn = () => {
        return client.isLoggedIn();
    };
    window.bot.closeInfoInterfaces = () => {
        window.bot.doAction(947, 0, 0, 6052);
    };
    window.bot.login = () => {
        client.login("zippy", "Dra1np1pe!", true);
    };
    window.bot.start = (func) => {
        window.bot.stop();
        const tickFunc = () => {
            client.resetIdleTimeout();
            func();
        }
        intervalHandle = setInterval(tickFunc, 100);
        console.info('Script started.');
    };
    window.bot.stop = () => {
        clearInterval(intervalHandle);
        console.info('Script stopped.');
    };
    window.bot.randomRange = (min, max) => {
        return min + Math.round(Math.random() * (max - min));
    };
    // scripts
    window.scripts = {};
    window.scripts.AutoKiller = (ATTACK_STYLE, NPC_IDS, GROUND_ITEM_IDS, BURY_BONES) => {
        const bot = window.bot;
        const TIMER_GAME_INTERACT = 0;
        const TIMER_RECENT_TARGET = 1;
        const TIMER_LOGGING_IN = 2;
        const TIMER_SETUP_ACCOUNT_ON_LOGIN = 3;
        const TIMER_LOGIN_WAIT = 4;
        const TIMER_RECENT_MOVING = 5;
        const TIMER_ENABLE_RUN = 6;
        const TIMER_LONG_WAIT_TARGET = 7;
        window.bot.start(() => {
            let attack = () => {
                const ids = NPC_IDS;
                const randID = Math.floor(Math.random() * (ids.length - .0001));
                bot.attackNPC(ids[randID]);
                bot.setTimer(TIMER_LONG_WAIT_TARGET, 6500);
                bot.setTimer(TIMER_GAME_INTERACT, 2500);
            };
            if (!bot.isLoggedIn() && !bot.hasTimer(TIMER_LOGGING_IN)) {
                bot.setTimer(TIMER_LOGGING_IN, 6000);
                bot.setTimer(TIMER_LOGIN_WAIT, 3000);
                return;
            }
            if (bot.hasTimer(TIMER_LOGGING_IN)) {
                if (!bot.isLoggedIn() && !bot.hasTimer(TIMER_LOGIN_WAIT)) {
                    bot.login();
                    bot.setTimer(TIMER_LOGIN_WAIT, 3001);
                }
                if (bot.isLoggedIn() && !bot.hasTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN)) {
                    bot.enableRun();
                    bot.changeAttackStyle(ATTACK_STYLE);
                    bot.setTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN, 3000);
                    bot.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
                }
                return;
            }
            if (!bot.hasTimer(TIMER_ENABLE_RUN)) {
                bot.enableRun();
                bot.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
            }
            if (bot.hasTarget()) {
                bot.setTimer(TIMER_RECENT_TARGET, 900);
            }
            if (bot.isMoving()) {
                bot.setTimer(TIMER_RECENT_MOVING, 900);
            }
            if (bot.isInCombat()) {
                bot.setTimer(TIMER_LONG_WAIT_TARGET, 4000);
            }
            if (!bot.hasTimer(TIMER_GAME_INTERACT) && !bot.hasTarget() && !bot.hasTimer(TIMER_RECENT_MOVING)) {
                let groundItems = bot.getNearestGroundItems(GROUND_ITEM_IDS, 10);
                if (groundItems.length > 0) {
                    groundItems[0].pickUp();
                    bot.setTimer(TIMER_GAME_INTERACT, 1200);
                }
            }
            if (!bot.hasTimer(TIMER_GAME_INTERACT) && !bot.hasTimer(TIMER_RECENT_TARGET) && !bot.hasTimer(TIMER_RECENT_MOVING)) {
                attack();
            } else if (!bot.hasTimer(TIMER_LONG_WAIT_TARGET) && bot.hasTarget() && !bot.isInCombat()) {
                attack();
            }
            if (BURY_BONES && !bot.hasTimer(TIMER_GAME_INTERACT)) {
                if (bot.interactItem(526, 0)) {
                    bot.setTimer(TIMER_GAME_INTERACT, bot.randomRange(800,1100));
                } else if (bot.interactItem(532, 0)) {
                    bot.setTimer(TIMER_GAME_INTERACT, bot.randomRange(800,1100));
                }
            }
        });
    };
    window.scripts.AutoDwarfKiller = (attackStyle, buryBones) => {
        const items = [995, 561, 562, 453, 1623, 1621, 1619, 1617];
        if (buryBones) {
            items.push(526, 532);
        }
        window.scripts.AutoKiller(attackStyle, [118], items, buryBones);
    };
    window.scripts.AutoWizardKiller = (attackLevel20, attackStyle, buryBones) => {
        const npcs = [174];
        const items = [554, 555, 556, 557, 558, 559, 560, 561, 562, 563, 564, 565, 566, 995, 1623, 1621, 1619, 1617];
        if (buryBones) {
            items.push(526, 532);
        }
        if (attackLevel20) {
            npcs.push(172);
        }
        window.scripts.AutoKiller(attackStyle, [174], items, buryBones);
    };
    // end scripts
    // ui
    const button = document.createElement('button');
    button.innerText = 'Stop';
    button.onclick = () => {
        window.bot.stop()
    };
    document.getElementById('game').appendChild(button);
    // end ui
}
