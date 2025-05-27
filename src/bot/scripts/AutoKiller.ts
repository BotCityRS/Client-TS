import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_RECENT_TARGET = 1;
const TIMER_LOGGING_IN = 2;
const TIMER_SETUP_ACCOUNT_ON_LOGIN = 3;
const TIMER_LOGIN_WAIT = 4;
const TIMER_RECENT_MOVING = 5;
const TIMER_ENABLE_RUN = 6;
const TIMER_LONG_WAIT_TARGET = 7;

export default class AutoKiller extends BotScript {
    attackStyle: number
    npcIDs: number[]
    groundItemIDs: number[]
    buryBones: boolean

    constructor(attackStyle: number, npcIDs: number[], groundItemIDs: number[], buryBones: boolean) {
        super()
        this.attackStyle = attackStyle
        this.npcIDs = npcIDs
        this.groundItemIDs = groundItemIDs
        this.buryBones = buryBones
    }

    static htmlSetup(base: HTMLElement) {
        const elemAttackStyle = document.createElement('input')
        elemAttackStyle.id = 'elemAttackStyle'
        elemAttackStyle.placeholder = 'Attack Style: 0 = atk, 1 = str, 2 = shared, 3 = def'
        elemAttackStyle.value = '0'

        const elemNPCIDs = document.createElement('input')
        elemNPCIDs.id = 'elemNPCIDs'
        elemNPCIDs.placeholder = 'NPC IDs comma seperated'
        elemNPCIDs.value = '41'

        const elemGroundItemIDs = document.createElement('input')
        elemGroundItemIDs.id = 'elemGroundItemIDs'
        elemGroundItemIDs.placeholder = 'Pickup Item IDs comma seperated'
        elemGroundItemIDs.value = '314,526'

        const elemBuryLabel = document.createElement('div');
        elemBuryLabel.innerText = 'Bury Bones?'

        const elemBuryBones = document.createElement('input')
        elemBuryBones.id = 'elemBuryBones'
        elemBuryBones.type = 'checkbox';
        elemBuryBones.checked = true;

        base.appendChild(elemAttackStyle)
        base.appendChild(document.createElement('br'))
        base.appendChild(elemNPCIDs)
        base.appendChild(document.createElement('br'))
        base.appendChild(elemGroundItemIDs)
        base.appendChild(document.createElement('br'))
        base.appendChild(elemBuryLabel)
        base.appendChild(elemBuryBones)
    }

    static buildFromHtml(base: HTMLElement) {
        const elemAttackStyle = document.getElementById('elemAttackStyle')?.value
        const elemNPCIDs = document.getElementById('elemNPCIDs')?.value.split(',')
        const elemGroundItemIDs = document.getElementById('elemGroundItemIDs')?.value.split(',')
        const elemBuryBones = document.getElementById('elemBuryBones')?.checked

        return new AutoKiller(elemAttackStyle, elemNPCIDs, elemGroundItemIDs, elemBuryBones)
    }

    start(bot: Bot) {
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
            let groundItems = bot.getNearestGroundItems(this.groundItemIDs, 10);
            if (groundItems.length > 0) {
                groundItems[0].pickUp();
                bot.setTimer(TIMER_GAME_INTERACT, 1200);
            }
        }
        if (!bot.hasTimer(TIMER_GAME_INTERACT) && !bot.hasTimer(TIMER_RECENT_TARGET) && !bot.hasTimer(TIMER_RECENT_MOVING)) {
            this.attack(bot);
        } else if (!bot.hasTimer(TIMER_LONG_WAIT_TARGET) && bot.hasTarget() && !bot.isInCombat()) {
            this.attack(bot);
        }
        if (this.buryBones && !bot.hasTimer(TIMER_GAME_INTERACT)) {
            if (bot.interactItem(526, 0)) {
                bot.setTimer(TIMER_GAME_INTERACT, 800);
            } else if (bot.interactItem(532, 0)) {
                bot.setTimer(TIMER_GAME_INTERACT, 800);
            }
        }
    }

    login(bot: Bot) {
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
                bot.changeAttackStyle(this.attackStyle);
                bot.setTimer(TIMER_SETUP_ACCOUNT_ON_LOGIN, 3000);
                bot.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
            }
            return;
        }
    }

    attack(bot: Bot) {
        const ids = this.npcIDs;
        const randID = Math.floor(Math.random() * (ids.length - .0001));
        bot.attackNPC(ids[randID]);
        bot.setTimer(TIMER_LONG_WAIT_TARGET, 6500);
        bot.setTimer(TIMER_GAME_INTERACT, 2500);
    }
}