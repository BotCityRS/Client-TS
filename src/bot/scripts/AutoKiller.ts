import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import Bot from "../Bot";
import BotScript from "./BotScript";

const TIMER_GAME_INTERACT = 0;
const TIMER_RECENT_TARGET = 1;
const TIMER_RECENT_MOVING = 2;
const TIMER_ENABLE_RUN = 3;
const TIMER_LONG_WAIT_TARGET = 4;
const TIMER_BURY = 5;
const TIMER_ATTACK_STYLE = 6;

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

function getInputValue(id: string): string {
    return (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
}

function getChecked(id: string): boolean {
    return (document.getElementById(id) as HTMLInputElement | null)?.checked ?? false;
}

function parseCsvIds(input: string, fallback: number[]): number[] {
    const values = input
        .split(',')
        .map(token => Number.parseInt(token.trim(), 10))
        .filter(value => Number.isFinite(value) && value >= 0);

    return values.length > 0 ? values : fallback;
}

export default class AutoKiller extends BotScript {
    attackStyle: number
    npcIDs: number[]
    groundItemIDs: number[]
    buryBones: boolean
    timer: Timer;
    private dbgTick = 0;

    constructor(attackStyle: number, npcIDs: number[], groundItemIDs: number[], buryBones: boolean) {
        super('AutoKiller', true)
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
        this.timer.defineTimer('TIMER_BURY', TIMER_BURY)
        this.timer.defineTimer('TIMER_ATTACK_STYLE', TIMER_ATTACK_STYLE)
    }

    static htmlSetup(base: HTMLElement) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent = 'Combat automation with target NPCs, optional loot pickup, and optional bone burying.';
        base.appendChild(desc);

        const elemAttackStyle = document.createElement('input');
        elemAttackStyle.id = 'elemAttackStyle'
        elemAttackStyle.type = 'number';
        elemAttackStyle.min = '0';
        elemAttackStyle.max = '3';
        elemAttackStyle.value = '0'

        const elemNPCIDs = document.createElement('input')
        elemNPCIDs.id = 'elemNPCIDs'
        elemNPCIDs.type = 'text';
        elemNPCIDs.placeholder = '41, 82'
        elemNPCIDs.value = '41'

        const elemGroundItemIDs = document.createElement('input')
        elemGroundItemIDs.id = 'elemGroundItemIDs'
        elemGroundItemIDs.type = 'text';
        elemGroundItemIDs.placeholder = '314, 526'
        elemGroundItemIDs.value = '314,526'

        const elemBuryBones = document.createElement('input')
        elemBuryBones.id = 'elemBuryBones'
        elemBuryBones.type = 'checkbox';
        elemBuryBones.checked = true;
        elemBuryBones.className = 'bot-checkbox';

        createField(base, 'Attack style', elemAttackStyle, '0: Attack, 1: Strength, 2: Shared, 3: Defence');
        createField(base, 'Target NPC IDs', elemNPCIDs, 'Comma-separated NPC IDs to attack.');
        createField(base, 'Ground item IDs', elemGroundItemIDs, 'Comma-separated IDs to pick up while fighting.');
        createField(base, 'Bury bones', elemBuryBones, 'Uses bones in inventory when available.');
    }

    static buildFromHtml(base: HTMLElement) {
        const parsedAttackStyle = Number.parseInt(getInputValue('elemAttackStyle'), 10);
        const attackStyle = Number.isFinite(parsedAttackStyle) && parsedAttackStyle >= 0 && parsedAttackStyle <= 3 ? parsedAttackStyle : 0;
        const npcIDs = parseCsvIds(getInputValue('elemNPCIDs'), [41]);
        const groundItemIDs = parseCsvIds(getInputValue('elemGroundItemIDs'), [314, 526]);
        const buryBones = getChecked('elemBuryBones');

        return new AutoKiller(attackStyle, npcIDs, groundItemIDs, buryBones)
    }

    override update(bot: Bot) {
        let api = bot.api;
        this.dbgTick++;
        if (this.dbgTick % 10 === 0) {
            api.bot.log('DEBUG', 'AutoKiller.update', 'tick', {
            timers: {
                gameInteract: this.timer.hasTimer(TIMER_GAME_INTERACT),
                recentTarget: this.timer.hasTimer(TIMER_RECENT_TARGET),
                recentMoving: this.timer.hasTimer(TIMER_RECENT_MOVING),
                enableRun: this.timer.hasTimer(TIMER_ENABLE_RUN),
                longWaitTarget: this.timer.hasTimer(TIMER_LONG_WAIT_TARGET)
            },
            player: {
                hasTarget: api.player.hasTarget(),
                isMoving: api.player.isMoving(),
                isInCombat: api.player.isInCombat(),
                isAnimating: api.player.isAnimating()
            },
            npcIds: this.npcIDs,
            ingame: api.isLoggedIn()
        });
        }
        api.tryLogin(() => {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + Math.random() * 60000);
        });
        if (!this.timer.hasTimer(TIMER_ENABLE_RUN)) {
            api.player.enableRun();
            this.timer.setTimer(TIMER_ENABLE_RUN, 90000 + Math.random() * 60000);
        }
        if (!this.timer.hasTimer(TIMER_ATTACK_STYLE)) {
            api.player.changeAttackStyle(this.attackStyle);
            this.timer.setTimer(TIMER_ATTACK_STYLE, 12000 + Math.random() * 4000);
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
        if (this.buryBones && !this.timer.hasTimer(TIMER_BURY) && !this.timer.hasTimer(TIMER_GAME_INTERACT)) {
            const bone = api.inventory.getItemById(526) ?? api.inventory.getItemById(532);
            if (bone) {
                api.bot.log('INFO', 'AutoKiller.update', 'bury bone', { id: bone.id, slot: bone.slot });
                bone.interact(0);
                this.timer.setTimer(TIMER_BURY, 2200);
                this.timer.setTimer(TIMER_GAME_INTERACT, 1600);
            }
        }
        if (!this.timer.hasTimer(TIMER_GAME_INTERACT) && !api.player.hasTarget() && !this.timer.hasTimer(TIMER_RECENT_MOVING)) {
            let groundItem = api.groundItem.getNearestGroundItemById(this.groundItemIDs, 10);
            if (groundItem) {
                api.bot.log('INFO', 'AutoKiller.update', 'pickup ground item', { id: groundItem.id });
                groundItem.pickUp();
                this.timer.setTimer(TIMER_GAME_INTERACT, 1200);
            }
        }
        if (!this.timer.hasTimer(TIMER_GAME_INTERACT) && !this.timer.hasTimer(TIMER_RECENT_TARGET) && !this.timer.hasTimer(TIMER_RECENT_MOVING)) {
            api.bot.log('INFO', 'AutoKiller.update', 'attack branch: idle');
            this.runCombatAttack(api);
        } else if (!this.timer.hasTimer(TIMER_LONG_WAIT_TARGET) && api.player.hasTarget() && !api.player.isInCombat()) {
            api.bot.log('INFO', 'AutoKiller.update', 'attack branch: has target not in combat');
            this.runCombatAttack(api);
        }
    }

    private runCombatAttack(api: BotAPI) {
        const ids = this.npcIDs;
        const target = api.npc.getNPCByIdsNearest(ids, false);
        if (!target) {
            api.bot.log('WARN', 'AutoKiller.runCombatAttack', 'no NPC in range for ids', { ids });
        } else {
            api.bot.log('INFO', 'AutoKiller.runCombatAttack', 'attacking', { uid: target.uid, id: target.id, dist: target.playerDist });
            target.attack();
        }
        this.timer.setTimer(TIMER_LONG_WAIT_TARGET, 6500);
        this.timer.setTimer(TIMER_GAME_INTERACT, 2500);
    }
}