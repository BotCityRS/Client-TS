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
        super('AutoWalker', true);
        this.timer = new Timer();
        this.path = AutoWalker.paths[locationId];
        this.traverse = traverse;

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT)
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN)
        this.timer.defineTimer('TIMER_NOT_MOVING', TIMER_NOT_MOVING)
    }

    static htmlSetup(base: HTMLElement) {
        const elemLocation = document.createElement('select')
        elemLocation.id = 'elemLocation'

        const elemReverseLabel = document.createElement('div');
        elemReverseLabel.innerText = 'Reverse?'

        const elemReverse = document.createElement('input')
        elemReverse.id = 'elemReverse'
        elemReverse.type = 'checkbox';

        AutoWalker.paths.forEach((loc, i) => {
            const option = document.createElement('option');
            option.value = String(i);
            option.textContent = loc.label;
            elemLocation.appendChild(option);
        });

        base.appendChild(document.createElement('br'))
        base.appendChild(elemLocation)
        base.appendChild(document.createElement('br'))
        base.appendChild(elemReverseLabel)
        base.appendChild(elemReverse)
    }

    static buildFromHtml(base: HTMLElement) {
        const elemLocation = document.getElementById('elemLocation')?.value
        const traverse = !document.getElementById('elemReverse')?.checked

        return new AutoWalker(elemLocation, traverse)
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

    stop(bot: Bot) {
        bot.api.world.stopPath()
    }
}