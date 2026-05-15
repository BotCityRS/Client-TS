import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import type { Path } from "../api/World";
import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;

type FishLocation = {
    label: string,
    itemReq: number,
    baitReq: number,
    pathToBank: Path,
    poolIds: number[],
    /** Exact NPC op label from content (e.g. `Net`, `Bait`) — uses config slot, not context-menu order. */
    poolInteractOp: string,
};

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

function getSelectNumber(id: string, fallback: number): number {
    const raw = (document.getElementById(id) as HTMLSelectElement | null)?.value ?? '';
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export default class AutoFisher extends BotScript {
    timer: Timer;

    static locations: FishLocation[] = [{
        label: 'Draynor Small Net',
        itemReq: 303,
        baitReq: -1,
        pathToBank: [[3087, 3238]],
        poolIds: [327],
        poolInteractOp: 'Net',
    }, {
        label: 'Draynor Bait',
        itemReq: 307,
        baitReq: 313,
        pathToBank: [[3087, 3238]],
        poolIds: [327],
        poolInteractOp: 'Bait',
    }, {
        label: 'Barbarian Fly',
        itemReq: 309,
        baitReq: 314,
        pathToBank: [[3107,3433],[3095,3444],[3094,3457],[3087,3464],[3081,3476],[3087,3488],[3096,3491],[3093,3490]],
        poolIds: [328],
        poolInteractOp: 'Lure',
    }, {
        label: 'Barbarian Bait',
        itemReq: 307,
        baitReq: 313,
        pathToBank: [[3107,3433],[3095,3444],[3094,3457],[3087,3464],[3081,3476],[3087,3488],[3096,3491],[3093,3490]],
        poolIds: [328],
        poolInteractOp: 'Bait',
    }, {
        label: 'Catherby Cage',
        itemReq: 301,
        baitReq: -1,
        pathToBank: [[2851, 3428],[2836,3434],[2821,3438],[2809,3440]],
        poolIds: [321],
        poolInteractOp: 'Cage',
    }, {
        label: 'Catherby Harpoon (Swordfish)',
        itemReq: 311,
        baitReq: -1,
        pathToBank: [[2851, 3428],[2836,3434],[2821,3438],[2809,3440]],
        poolIds: [321],
        poolInteractOp: 'Harpoon',
    }, {
        label: 'Catherby Harpoon (Shark)',
        itemReq: 311,
        baitReq: -1,
        pathToBank: [[2851, 3428],[2836,3434],[2821,3438],[2809,3440]],
        poolIds: [322],
        poolInteractOp: 'Harpoon',
    }, {
        label: 'Catherby Big Net',
        itemReq: 305,
        baitReq: -1,
        pathToBank: [[2851, 3428],[2836,3434],[2821,3438],[2809,3440]],
        poolIds: [322],
        poolInteractOp: 'Net',
    }]
    location: FishLocation;

    constructor(locationId: number) {
        super('AutoFisher', true)
        this.timer = new Timer();
        this.location = AutoFisher.locations[locationId];

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
    }

    static htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent = 'Automates fishing and banking for the selected location and method.';
        base.appendChild(desc);

        const elemLocation = document.createElement('select')
        elemLocation.id = 'elemLocation'

        AutoFisher.locations.forEach((loc, i) => {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = loc.label;
            elemLocation.appendChild(option);
        });

        createField(base, 'Fishing location', elemLocation, 'Choose a preset with tool, bait, and bank route.');
    }

    static buildFromHtml(base: HTMLElement) {
        const elemLocation = getSelectNumber('elemLocation', 0);
        const clampedLocation = Math.max(0, Math.min(elemLocation, AutoFisher.locations.length - 1));

        return new AutoFisher(clampedLocation)
    }

    override async update(bot: Bot) {
        const api = bot.api;
        api.bot.log('DEBUG', 'AutoFisher.update', 'tick', { hasInteractTimer: this.timer.hasTimer(TIMER_GAME_INTERACT), pathActive: api.world.hasPath() });
        if (api.world.hasPath()) {
            return;
        }
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

        const needBank =
            !api.inventory.hasItem(this.location.itemReq) ||
            (this.location.baitReq >= 0 && !api.inventory.hasItem(this.location.baitReq)) ||
            api.inventory.isFull();

        if (needBank) {
            if (!api.bank.isOpen()) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
                if (!api.bank.open()) {
                    await api.world.walkPath(this.location.pathToBank);
                }
                return;
            }

            const keepIds = [this.location.itemReq, ...(this.location.baitReq >= 0 ? [this.location.baitReq] : [])];
            if (api.bank.depositOneIfNotKept(keepIds)) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 780);
                return;
            }

            this.timer.setTimer(TIMER_GAME_INTERACT, 600);
            if (!api.inventory.hasItem(this.location.itemReq)) {
                await api.bank.withdraw(this.location.itemReq);
                return;
            }
            if (this.location.baitReq >= 0 && !api.inventory.hasItemAmount(this.location.baitReq, 100)) {
                await api.bank.getItemById(this.location.baitReq)?.withdraw(1000);
            }
            return;
        }

        if (!api.player.isAnimating()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
            const nearestPool = api.npc.getNPCByIdsNearest(this.location.poolIds);
            if (nearestPool) {
                nearestPool.interactByOpEquals(this.location.poolInteractOp);
            } else if (api.world.distanceTo(this.location.pathToBank[0][0], this.location.pathToBank[0][1]) > 10) {
                await api.world.walkPath(this.location.pathToBank, false);
            }
        }
    }
}