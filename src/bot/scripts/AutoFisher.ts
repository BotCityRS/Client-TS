import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import type { Path } from "../api/World";
import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;

type FishLocation = {
    id: number,
    label: string,
    itemReq: number,
    baitReq: number,
    pathToBank: Path,
    poolIds: number[],
    poolInteractOption: number,
};
export default class AutoFisher extends BotScript {
    timer: Timer;

    static locations: FishLocation[] = [{
        id: 0,
        label: 'Draynor Small Net',
        itemReq: 303,
        baitReq: -1,
        pathToBank: [[3087, 3238]],
        poolIds: [327],
        poolInteractOption: 0,
    }, {
        id: 1,
        label: 'Draynor Bait',
        itemReq: 307,
        baitReq: 313,
        pathToBank: [[3087, 3238]],
        poolIds: [327],
        poolInteractOption: 1,
    }, {
        id: 2,
        label: 'Barbarian Fly',
        itemReq: 309,
        baitReq: 314,
        pathToBank: [[3107,3433],[3095,3444],[3094,3457],[3087,3464],[3081,3476],[3087,3488],[3096,3491],[3093,3490]],
        poolIds: [328],
        poolInteractOption: 0,
    }, {
        id: 3,
        label: 'Barbarian Bait',
        itemReq: 307,
        baitReq: 313,
        pathToBank: [[3107,3433],[3095,3444],[3094,3457],[3087,3464],[3081,3476],[3087,3488],[3096,3491],[3093,3490]],
        poolIds: [328],
        poolInteractOption: 1,
    }]
    location: FishLocation;

    constructor(locationId: number) {
        super('AutoFisher')
        this.timer = new Timer();
        this.location = AutoFisher.locations[locationId];

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
    }

    static htmlSetup(base: HTMLElement) {
        const elemLocation = document.createElement('select')
        elemLocation.id = 'elemLocation'

        AutoFisher.locations.forEach(loc => {
            const option = document.createElement('option');
            option.value = loc.id.toString();
            option.textContent = loc.label;
            elemLocation.appendChild(option);
        });

        base.appendChild(document.createElement('br'))
        base.appendChild(elemLocation)
        base.appendChild(document.createElement('br'))
    }

    static buildFromHtml(base: HTMLElement) {
        const elemLocation = document.getElementById('elemLocation')?.value

        return new AutoFisher(elemLocation)
    }

    async update(bot: Bot) {
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
        if (!api.inventory.hasItem(this.location.itemReq) || (this.location.baitReq >= 0 && !api.inventory.hasItem(this.location.baitReq)) || api.inventory.isFull()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
            if (!api.bank.isOpen()) {
                if (!api.bank.open()) {
                    await api.world.walkPath(this.location.pathToBank);
                }
            } else {
                api.bank.depositAllExcept([this.location.itemReq, this.location.baitReq])
                if (!api.inventory.hasItem(this.location.itemReq)) {
                    api.bank.withdraw(this.location.itemReq)
                }
                if (this.location.baitReq >= 0 && !api.inventory.hasItemAmount(this.location.baitReq, 100)) {
                    api.bank.getItemById(this.location.baitReq)?.withdraw(1000)
                }
            }
        } else if (!api.player.isAnimating()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
            const nearestPool = api.npc.getNPCByIdsNearest(this.location.poolIds)
            if (nearestPool) {
                nearestPool.interact(this.location.poolInteractOption);
            } else if (api.world.distanceTo(this.location.pathToBank[0][0], this.location.pathToBank[0][1]) > 10) {
                await api.world.walkPath(this.location.pathToBank, false);
            }
        }
    }
}