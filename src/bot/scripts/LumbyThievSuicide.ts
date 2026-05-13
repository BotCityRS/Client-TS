import type ClientNPCEntity from "../api/base/ClientNPCEntity";
import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import type { Path } from "../api/World";
import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;

function createField(container: HTMLElement, label: string, input: HTMLElement, hint?: string) {
    const field = document.createElement('div');
    field.className = 'bot-field';

    const labelElem = document.createElement('label');
    labelElem.className = 'bot-label';
    labelElem.textContent = label;
    field.appendChild(labelElem);

    field.appendChild(input);

    if (hint) {
        const hintElem = document.createElement('small');
        hintElem.className = 'bot-hint';
        hintElem.textContent = hint;
        field.appendChild(hintElem);
    }

    container.appendChild(field);
}

function getChecked(id: string): boolean {
    return (document.getElementById(id) as HTMLInputElement | null)?.checked ?? false;
}

export default class LumbyThievSuicide extends BotScript {
    timer: Timer;
    pickupCoins: boolean;

    constructor(pickupCoins: boolean) {
        super('LumbyThievSuicide', true)
        this.timer = new Timer();
        this.pickupCoins = pickupCoins;

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
    }

    static htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent = 'Steals from Lumbridge NPCs and optionally collects dropped coins.';
        base.appendChild(desc);

        const elemPickupCoins = document.createElement('input')
        elemPickupCoins.id = 'elemPickupCoins'
        elemPickupCoins.type = 'checkbox';
        elemPickupCoins.checked = true;
        elemPickupCoins.className = 'bot-checkbox';

        createField(base, 'Pick up coins', elemPickupCoins, 'Collects nearby coin drops before thieving again.');
    }

    static buildFromHtml(base: HTMLElement) {
        const pickupCoins = getChecked('elemPickupCoins')

        return new LumbyThievSuicide(pickupCoins)
    }

    update(bot: Bot) {
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
        if (api.player.isMoving() || api.player.isAnimating()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 300);
            return;
        } else {
            let groundItem = this.pickupCoins && api.groundItem.getNearestGroundItemById([995], 20);
            if (groundItem) {
                groundItem.pickUp();
                this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
            } else {
                api.npc.getNPCByIdsNearestIf([1, 2, 3, 4], (npc: ClientNPCEntity) => {
                    return !npc.isInArea(3202, 3209, 3216, 3228)
                })?.interact(1);
                this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
            }
        }
    }
}