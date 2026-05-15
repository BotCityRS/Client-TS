import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import type WorldObjectEntity from '../api/base/WorldObjectEntity.js';
import type { Path } from '../api/World';
import Timer from '../api/Timer';
import Utility from '../api/Utility';
import Bot from '../Bot';
import BotScript from './BotScript';

const TIMER_GAME_INTERACT = 0;
const TIMER_ENABLE_RUN = 1;
const TIMER_KNIFE_USE = 2;

const ID_KNIFE = 946;
const ID_LOGS = 1511;
const ID_OAK_LOGS = 1521;
const ID_WILLOW_LOGS = 1519;

const AXE_IDS = [1349, 1351, 1353, 1355, 1357, 1359, 1361] as const;

const MULTIOBJ3_SHAFT = 2800;
const MULTIOBJ3_SHORT = 2801;
const MULTIOBJ3_LONG = 2802;
const MULTIOBJ2_SHORT = 142;
const MULTIOBJ2_LONG = 143;

type TreeKind = 'normal' | 'oak' | 'willow';

type WoodSpot = {
    label: string;
    treeKind: TreeKind;
    anchor: [number, number];
    pathToBank: Path;
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

function hasChopOp(loc: WorldObjectEntity['locType']): boolean {
    const ops = loc.op;
    if (!ops) {
        return false;
    }
    for (let i = 0; i < ops.length; i++) {
        const o = ops[i];
        if (o && o.toLowerCase().includes('chop')) {
            return true;
        }
    }
    return false;
}

function treeKindMatches(displayName: string | null, kind: TreeKind): boolean {
    if (!displayName) {
        return false;
    }
    if (kind === 'normal') {
        return displayName === 'Tree';
    }
    if (kind === 'oak') {
        return displayName === 'Oak';
    }
    return displayName === 'Willow';
}

function hasAnyAxe(api: Bot['api']): boolean {
    for (let i = 0; i < AXE_IDS.length; i++) {
        if (api.inventory.hasItem(AXE_IDS[i]!)) {
            return true;
        }
    }
    return false;
}

function hasAnyFletchLog(api: Bot['api']): boolean {
    return api.inventory.hasItem(ID_LOGS) || api.inventory.hasItem(ID_OAK_LOGS) || api.inventory.hasItem(ID_WILLOW_LOGS);
}

function findChoppableTree(api: Bot['api'], spot: WoodSpot, bankEnabled: boolean, anchorMaxDist: number): WorldObjectEntity | null {
    const objs = api.worldObject.getAll();
    let best: WorldObjectEntity | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    const baseX = api.surface.sceneBaseTileX;
    const baseZ = api.surface.sceneBaseTileZ;
    const ax = spot.anchor[0];
    const az = spot.anchor[1];
    for (let i = 0; i < objs.length; i++) {
        const wo = objs[i]!;
        if (!hasChopOp(wo.locType) || !treeKindMatches(wo.locType.name, spot.treeKind)) {
            continue;
        }
        if (bankEnabled) {
            const wx = wo.x + baseX;
            const wz = wo.z + baseZ;
            const da = Utility.getDistance(wx, wz, ax, az);
            if (da > anchorMaxDist) {
                continue;
            }
        }
        if (wo.playerDist < bestD) {
            bestD = wo.playerDist;
            best = wo;
        }
    }
    return best;
}

function pickDialogCom(
    logId: number,
    cutShafts: boolean,
    cutShortbow: boolean,
    cutLongbow: boolean
): number | null {
    if (logId === ID_LOGS) {
        if (cutShafts) {
            return MULTIOBJ3_SHAFT;
        }
        if (cutShortbow) {
            return MULTIOBJ3_SHORT;
        }
        if (cutLongbow) {
            return MULTIOBJ3_LONG;
        }
        return null;
    }
    if (logId === ID_OAK_LOGS || logId === ID_WILLOW_LOGS) {
        if (cutShortbow) {
            return MULTIOBJ2_SHORT;
        }
        if (cutLongbow) {
            return MULTIOBJ2_LONG;
        }
        return null;
    }
    return null;
}

function wantsFletchOnLog(logId: number, cutShafts: boolean, cutShortbow: boolean, cutLongbow: boolean): boolean {
    if (logId === ID_LOGS) {
        return cutShafts || cutShortbow || cutLongbow;
    }
    return (logId === ID_OAK_LOGS || logId === ID_WILLOW_LOGS) && (cutShortbow || cutLongbow);
}

export default class AutoWoodcutter extends BotScript {
    timer: Timer;

    spot: WoodSpot;
    bankEnabled: boolean;
    cutShafts: boolean;
    cutShortbow: boolean;
    cutLongbow: boolean;

    private knifeUseStep: 'idle' | 'need_use_on_log' = 'idle';
    private pendingDialogCom: number | null = null;
    private fletchDialogAt = 0;

    static spots: WoodSpot[] = [
        {
            label: 'Draynor tree',
            treeKind: 'normal',
            anchor: [3088, 3235],
            pathToBank: [[3088, 3235], [3087, 3238]]
        },
        {
            label: 'Draynor oak',
            treeKind: 'oak',
            anchor: [3083, 3250],
            pathToBank: [[3083, 3250], [3087, 3238]]
        },
        {
            label: 'Draynor willow',
            treeKind: 'willow',
            anchor: [3084, 3230],
            pathToBank: [[3084, 3230], [3087, 3238]]
        },
        {
            label: 'Varrock east tree',
            treeKind: 'normal',
            anchor: [3289, 3428],
            pathToBank: [[3289, 3428], [3275, 3425], [3255, 3420]]
        },
        {
            label: 'Varrock east oak',
            treeKind: 'oak',
            anchor: [3275, 3426],
            pathToBank: [[3275, 3426], [3262, 3423], [3255, 3420]]
        }
    ];

    static keepWhenBanking: readonly number[] = [ID_KNIFE, ...AXE_IDS];

    constructor(
        spotIndex: number,
        bankEnabled: boolean,
        cutShafts: boolean,
        cutShortbow: boolean,
        cutLongbow: boolean
    ) {
        super('AutoWoodcutter', true);
        this.timer = new Timer();
        const i = Math.max(0, Math.min(spotIndex, AutoWoodcutter.spots.length - 1));
        this.spot = AutoWoodcutter.spots[i]!;
        this.bankEnabled = bankEnabled;
        this.cutShafts = cutShafts;
        this.cutShortbow = cutShortbow;
        this.cutLongbow = cutLongbow;

        this.timer.defineTimer('TIMER_GAME_INTERACT', TIMER_GAME_INTERACT);
        this.timer.defineTimer('TIMER_ENABLE_RUN', TIMER_ENABLE_RUN);
        this.timer.defineTimer('TIMER_KNIFE_USE', TIMER_KNIFE_USE);
    }

    static htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent =
            'Woodcuts near the chosen spot, optionally fletches logs with a knife, and optionally banks. Requires a hatchet and (for fletching) a knife.';
        base.appendChild(desc);

        const elemBank = document.createElement('input');
        elemBank.id = 'awcBank';
        elemBank.type = 'checkbox';
        elemBank.className = 'bot-checkbox';

        const elemShafts = document.createElement('input');
        elemShafts.id = 'awcShafts';
        elemShafts.type = 'checkbox';
        elemShafts.className = 'bot-checkbox';

        const elemShort = document.createElement('input');
        elemShort.id = 'awcShort';
        elemShort.type = 'checkbox';
        elemShort.className = 'bot-checkbox';

        const elemLong = document.createElement('input');
        elemLong.id = 'awcLong';
        elemLong.type = 'checkbox';
        elemLong.className = 'bot-checkbox';

        const elemLocation = document.createElement('select');
        elemLocation.id = 'awcSpot';

        AutoWoodcutter.spots.forEach((s, idx) => {
            const option = document.createElement('option');
            option.value = String(idx);
            option.textContent = s.label;
            elemLocation.appendChild(option);
        });

        const syncLocationDisabled = () => {
            elemLocation.disabled = !elemBank.checked;
        };
        elemBank.addEventListener('change', syncLocationDisabled);
        syncLocationDisabled();

        createField(base, 'Bank logs / bows', elemBank, 'When on, walks the route to bank, deposits, and returns. Enables the tree area dropdown.');
        createField(base, 'Tree area (when banking)', elemLocation, 'Pick the grove that matches the logs you want.');
        createField(base, 'Cut plain logs into arrow shafts', elemShafts, 'Normal logs only (members fletching dialog).');
        createField(base, 'Cut logs into shortbows (unstrung)', elemShort, 'Uses the fletching choice dialog for your log type.');
        createField(base, 'Cut logs into longbows (unstrung)', elemLong, 'Uses the fletching choice dialog for your log type.');
    }

    static buildFromHtml(_base: HTMLElement) {
        const spot = getSelectNumber('awcSpot', 0);
        const bank = getChecked('awcBank');
        const shafts = getChecked('awcShafts');
        const shortb = getChecked('awcShort');
        const longb = getChecked('awcLong');
        return new AutoWoodcutter(spot, bank, shafts, shortb, longb);
    }

    private beginKnifeFletch(api: Bot['api'], logId: number): boolean {
        const knife = api.inventory.getItemById(ID_KNIFE);
        const log = api.inventory.getItemById(logId);
        const com = pickDialogCom(logId, this.cutShafts, this.cutShortbow, this.cutLongbow);
        if (!knife || !log || com === null) {
            return false;
        }
        this.pendingDialogCom = com;
        this.knifeUseStep = 'need_use_on_log';
        void api.doAction(MiniMenuAction.USEHELD_START, knife.id, knife.slot, knife.interfaceId);
        this.timer.setTimer(TIMER_KNIFE_USE, 120);
        this.timer.setTimer(TIMER_GAME_INTERACT, 400);
        return true;
    }

    override async update(bot: Bot) {
        const api = bot.api;

        if (this.fletchDialogAt > 0 && Date.now() >= this.fletchDialogAt) {
            const com = this.pendingDialogCom;
            this.fletchDialogAt = 0;
            this.pendingDialogCom = null;
            if (com !== null) {
                void api.doAction(MiniMenuAction.IF_BUTTON, 0, 0, com);
            }
            this.timer.setTimer(TIMER_GAME_INTERACT, 2200);
            return;
        }

        if (this.timer.hasTimer(TIMER_GAME_INTERACT)) {
            return;
        }
        if (api.world.hasPath()) {
            return;
        }
        api.tryLogin(() => {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + Math.random() * 60000);
        });
        if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + Math.random() * 60000);
        }
        if (api.player.isMoving()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 300);
            return;
        }

        if (this.knifeUseStep === 'need_use_on_log' && !this.timer.hasTimer(TIMER_KNIFE_USE)) {
            const log =
                api.inventory.getItemById(ID_LOGS) ??
                api.inventory.getItemById(ID_OAK_LOGS) ??
                api.inventory.getItemById(ID_WILLOW_LOGS);
            if (log) {
                void api.doAction(MiniMenuAction.USEHELD_ONHELD, log.id, log.slot, log.interfaceId);
            }
            this.knifeUseStep = 'idle';
            if (this.pendingDialogCom !== null) {
                this.fletchDialogAt = Date.now() + 450;
            }
            this.timer.setTimer(TIMER_GAME_INTERACT, 3600);
            return;
        }

        if (!hasAnyAxe(api)) {
            api.bot.log('WARN', 'AutoWoodcutter.update', 'no hatchet in inventory', {});
            this.timer.setTimer(TIMER_GAME_INTERACT, 2500);
            return;
        }

        const fletchTogglesOn = this.cutShafts || this.cutShortbow || this.cutLongbow;
        const logIds = [ID_LOGS, ID_OAK_LOGS, ID_WILLOW_LOGS];
        for (let li = 0; li < logIds.length; li++) {
            const lid = logIds[li]!;
            if (!api.inventory.hasItem(lid) || !wantsFletchOnLog(lid, this.cutShafts, this.cutShortbow, this.cutLongbow)) {
                continue;
            }
            if (!api.inventory.hasItem(ID_KNIFE)) {
                break;
            }
            if (this.beginKnifeFletch(api, lid)) {
                return;
            }
        }

        const needsKnifeForFletch = fletchTogglesOn && hasAnyFletchLog(api) && !api.inventory.hasItem(ID_KNIFE);
        const needBank =
            this.bankEnabled && (api.inventory.isFull() || !hasAnyAxe(api) || needsKnifeForFletch);

        if (needBank) {
            if (!api.bank.isOpen()) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
                if (!api.bank.open()) {
                    await api.world.walkPath(this.spot.pathToBank);
                }
                return;
            }

            if (api.bank.depositOneIfNotKept([...AutoWoodcutter.keepWhenBanking])) {
                this.timer.setTimer(TIMER_GAME_INTERACT, 780);
                return;
            }

            this.timer.setTimer(TIMER_GAME_INTERACT, 600);
            if (!hasAnyAxe(api)) {
                await api.bank.withdraw(1351, 1);
                return;
            }
            if (fletchTogglesOn && !api.inventory.hasItem(ID_KNIFE)) {
                await api.bank.withdraw(ID_KNIFE, 1);
            }
            return;
        }

        if (!api.player.isAnimating()) {
            this.timer.setTimer(TIMER_GAME_INTERACT, 2000);
            const tree = findChoppableTree(api, this.spot, this.bankEnabled, 14);
            if (tree) {
                tree.interact(0);
            } else if (this.bankEnabled && api.world.distanceTo(this.spot.anchor[0], this.spot.anchor[1]) > 8) {
                await api.world.walkPath(this.spot.pathToBank, false);
            }
        }
    }
}
