import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_RECENT_TARGET = 1;
const TIMER_RECENT_MOVING = 2;
const TIMER_ENABLE_RUN = 3;
const TIMER_LONG_WAIT_TARGET = 4;

export default class AutoKiller extends BotScript {
    attackStyle: number
    npcIDs: number[]
    groundItemIDs: number[]
    buryBones: boolean
    timer: Timer;

    constructor(attackStyle: number, npcIDs: number[], groundItemIDs: number[], buryBones: boolean) {
        super('AutoKiller')
        this.attackStyle = attackStyle
        this.npcIDs = npcIDs
        this.groundItemIDs = groundItemIDs
        this.buryBones = buryBones
        this.timer = new Timer();

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_RECENT_TARGET', TIMER_RECENT_TARGET)
        this.timer.defineTimer('TIMER_RECENT_MOVING', TIMER_RECENT_MOVING)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
        this.timer.defineTimer('TIMER_LONG_WAIT_TARGET', TIMER_LONG_WAIT_TARGET)
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

    update(bot: Bot) {
        let api = bot.api;
        api.tryLogin(()=>{
            api.player.enableRun();
            api.player.changeAttackStyle(this.attackStyle);
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        });
        if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        }
        if (api.player.hasTarget()) {
            this.timer.setTimer(TIMER_RECENT_TARGET, 900);
        }
        if (api.player.isMoving()) {
            this.timer.setTimer(TIMER_RECENT_MOVING, 900);
        }
        if (api.player.isInCombat()) {
            this.timer.setTimer(TIMER_LONG_WAIT_TARGET, 4000);
        }
        if (!this.timer.hasTimer(TIMER_GAME_INTERACT) && !api.player.hasTarget() && !this.timer.hasTimer(TIMER_RECENT_MOVING)) {
            let groundItem = api.groundItem.getNearestGroundItemById(this.groundItemIDs, 10);
            if (groundItem) {
                groundItem.pickUp();
                this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
            }
        }
        if (!this.timer.hasTimer(TIMER_GAME_INTERACT) && !this.timer.hasTimer(TIMER_RECENT_TARGET) && !this.timer.hasTimer(TIMER_RECENT_MOVING)) {
            this.attack(api);
        } else if (!this.timer.hasTimer(TIMER_LONG_WAIT_TARGET) && api.player.hasTarget() && !api.player.isInCombat()) {
            this.attack(api);
        }
        if (this.buryBones && !this.timer.hasTimer(TIMER_GAME_INTERACT)) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 800);
            api.inventory.getItemById(526)?.interact(0);
            api.inventory.getItemById(532)?.interact(0);
        }
    }

    attack(api: BotAPI) {
        const ids = this.npcIDs;
        api.npc.getNPCByIdsNearest(ids, false)?.attack();
        this.timer.setTimer(TIMER_LONG_WAIT_TARGET, 6500);
        this.timer.setTimer(TIMER_GAME_INTERACT, 2500);
    }
}