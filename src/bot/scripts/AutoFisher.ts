import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;

export default class AutoFisher extends BotScript {
    timer: Timer;

    constructor(attackStyle: number, npcIDs: number[], groundItemIDs: number[], buryBones: boolean) {
        super()
        this.timer = new Timer();

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
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

        return new AutoFisher(elemAttackStyle, elemNPCIDs, elemGroundItemIDs, elemBuryBones)
    }

    start(bot: Bot) {
        let api = bot.api;
        if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
            return;
        }
        api.tryLogin(()=>{
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        });
        if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        }
        if (api.player.isMoving()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 300);
            return;
        }
        if (!api.inventory.hasItem(303) || api.inventory.isFull()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
            if (!api.bank.isOpen()) {
                api.bank.open()
            } else {
                api.bank.depositAllExcept([303])
                if (!api.inventory.hasItem(303)) {
                    api.bank.withdraw(303)
                }
            }
        } else if (!api.player.isAnimating()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
            api.npc.getNPCByIdsNearest([327])?.interact(0)
        }
    }
}