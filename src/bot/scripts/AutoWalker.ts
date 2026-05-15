import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import type { Path } from "../api/World";
import World from "../api/World";
import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;
const TIMER_NOT_MOVING = 2;

type WalkLocation = {
    label: string,
    path: Path
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

function getChecked(id: string): boolean {
    return (document.getElementById(id) as HTMLInputElement | null)?.checked ?? false;
}

export default class AutoWalker extends BotScript {
    timer: Timer;

    static paths: WalkLocation[] = [{
        label: 'Draynor <-> Lumbridge',
        path: World.paths.DRAYNOR_TO_LUMBRIDGE
    }, {
        label: 'Draynor <-> Falador',
        path: World.paths.DRAYNOR_TO_FALADOR
    }, {
        label: 'Draynor <-> Barb Village',
        path: World.paths.VARROCK_TO_LUMBRIDGE
    }, {
        label: 'Barb Village <-> Varrock',
        path: World.paths.BARB_VILLAGE_TO_VARROCK
    }, {
        label: 'Barb Village <-> Edgeville',
        path: World.paths.BARB_VILLAGE_TO_EDGEVILLE
    }, {
        label: 'Falador <-> Barb Village',
        path: World.paths.FALADOR_TO_BARB_VILLAGE
    },  {
        label: 'Falador <-> Varrock',
        path: World.paths.FALADOR_TO_VARROCK
    }, {
        label: 'Falador <-> Catherby',
        path: World.paths.FALADOR_TO_CATHERBY
    }, {
        label: 'Varrock <-> Lumbridge',
        path: World.paths.VARROCK_TO_LUMBRIDGE
    }]
    path: WalkLocation;
    traverse: boolean;

    constructor(locationId: number, traverse: boolean) {
        super('AutoWalker', true, true);
        this.timer = new Timer();
        this.path = AutoWalker.paths[locationId];
        this.traverse = traverse;

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
        this.timer.defineTimer('TIMER_NOT_MOVING', TIMER_NOT_MOVING)
    }

    static htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent = 'Walks a predefined route repeatedly or in reverse until the path completes.';
        base.appendChild(desc);

        const elemLocation = document.createElement('select')
        elemLocation.id = 'elemLocation'

        const elemReverse = document.createElement('input')
        elemReverse.id = 'elemReverse'
        elemReverse.type = 'checkbox';
        elemReverse.className = 'bot-checkbox';

        AutoWalker.paths.forEach((loc, i) => {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = loc.label;
            elemLocation.appendChild(option);
        });

        createField(base, 'Route', elemLocation, 'Choose a route pair. Script stops after arrival.');
        createField(base, 'Walk route in reverse', elemReverse, 'If enabled, route direction is swapped.');
    }

    static buildFromHtml(base: HTMLElement) {
        const elemLocation = getSelectNumber('elemLocation', 0);
        const clampedLocation = Math.max(0, Math.min(elemLocation, AutoWalker.paths.length - 1));
        const traverse = !getChecked('elemReverse')

        return new AutoWalker(clampedLocation, traverse)
    }

    override update(bot: Bot) {
        let api = bot.api;
        if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
            return;
        }
        api.tryLogin(()=>{
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + (Math.random() * 60000));
        });
        if (api.player.isMoving()) {
            this.timer.setTimer(TIMER_NOT_MOVING, 1200);
        }
        if (!this.timer.hasTimer(TIMER_NOT_MOVING)) {
            api.world.walkPath(this.path.path, this.traverse).then((result: boolean) => {
                if (result) {
                    api.bot.stop()
                }
            })
            this.timer.setTimer(TIMER_NOT_MOVING, 1200);
        }
    }

    override stop(bot: Bot) {
        bot.api.world.stopPath()
    }
}