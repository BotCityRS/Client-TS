import type { Client } from '#/client/Client.js';
import type { BotLogLevel } from './BotLog.js';
import BotAPI from './api/BotAPI';
import AutoFisher from './scripts/AutoFisher';
import AutoKiller from './scripts/AutoKiller';
import AutoWalker from './scripts/AutoWalker';
import BotScript from './scripts/BotScript';
import LumbyThievSuicide from './scripts/LumbyThievSuicide';
import ScriptLoader from './scripts/ScriptLoader';
import { formatDetail } from './api/botApiAssert.js';

/** Script list key: constructor `name` (preserved by bundle + Terser `keep_classnames`). */
function scriptRegistryKey(scriptCtor: new (...args: unknown[]) => unknown): string {
    return scriptCtor.name;
}

type BotDebugFlags = {
    itemIds: boolean;
    npcIds: boolean;
    worldObjectIds: boolean;
    walkTileCoords: boolean;
};

const BOT_DEBUG_STORAGE_KEY = 'bot_debug_flags';

const MAX_LOG_LINES = 4000;

export default class Bot {
    client: Client;

    intervalHandle: number;

    api: BotAPI;
    scripts: any[];

    currentScript: BotScript | null = null;

    _injStartScript?: () => void;
    _injDeleteScript?: () => void;
    private activeTab: 'script' | 'debug' | 'logs' = 'script';
    private debugFlags: BotDebugFlags = {
        itemIds: false,
        npcIds: false,
        worldObjectIds: false,
        walkTileCoords: false
    };

    private logLines: string[] = [];

    private setSummary(text: string) {
        const summary = document.getElementById('botScriptSummary');
        if (summary) {
            summary.textContent = text;
        }
    }

    private getClientWithDebugSetter(): { setBotDebugFlags(flags: BotDebugFlags): void } {
        return this.client as unknown as { setBotDebugFlags(flags: BotDebugFlags): void };
    }

    private applyDebugFlags() {
        this.getClientWithDebugSetter().setBotDebugFlags(this.debugFlags);
    }

    private saveDebugFlags() {
        localStorage.setItem(BOT_DEBUG_STORAGE_KEY, JSON.stringify(this.debugFlags));
    }

    private loadDebugFlags() {
        const raw = localStorage.getItem(BOT_DEBUG_STORAGE_KEY);
        if (!raw) {
            return;
        }

        try {
            const parsed = JSON.parse(raw) as Partial<BotDebugFlags>;
            this.debugFlags = {
                itemIds: parsed.itemIds === true,
                npcIds: parsed.npcIds === true,
                worldObjectIds: parsed.worldObjectIds === true,
                walkTileCoords: parsed.walkTileCoords === true
            };
        } catch {
            this.debugFlags = { itemIds: false, npcIds: false, worldObjectIds: false, walkTileCoords: false };
        }
    }

    private flushLogTextarea() {
        const ta = document.getElementById('botLogsArea') as HTMLTextAreaElement | null;
        if (!ta) {
            return;
        }
        const wasAtEnd = ta.scrollTop + ta.clientHeight >= ta.scrollHeight - 8;
        ta.value = this.logLines.join('\n');
        if (wasAtEnd) {
            ta.scrollTop = ta.scrollHeight;
        }
    }

    /** Session-only bot / script / client diagnostics (also mirrored to console on WARN+). */
    log(level: BotLogLevel, source: string, message: string, detail?: unknown): void {
        const ts = new Date().toISOString();
        const extra = formatDetail(detail);
        const line = `[${ts}] [${level}] [${source}] ${message}${extra ? ` | ${extra}` : ''}`;
        this.logLines.push(line);
        while (this.logLines.length > MAX_LOG_LINES) {
            this.logLines.shift();
        }
        this.flushLogTextarea();
        if (level === 'WARN' || level === 'ERROR') {
            console.warn(line);
        } else if (level === 'INFO') {
            console.info(line);
        } else {
            console.debug(line);
        }
    }

    clearLogs(): void {
        this.logLines = [];
        this.flushLogTextarea();
    }

    isScriptRunning(): boolean {
        return this.currentScript !== null;
    }

    private setTab(tab: 'script' | 'debug' | 'logs') {
        this.activeTab = tab;
        const scriptButton = document.getElementById('botTabScript');
        const debugButton = document.getElementById('botTabDebug');
        const logsButton = document.getElementById('botTabLogs');
        const scriptPanel = document.getElementById('bot-script-panel');
        const debugPanel = document.getElementById('bot-debug-panel');
        const logsPanel = document.getElementById('bot-logs-panel');

        scriptButton?.classList.toggle('bot-tab-active', tab === 'script');
        debugButton?.classList.toggle('bot-tab-active', tab === 'debug');
        logsButton?.classList.toggle('bot-tab-active', tab === 'logs');
        scriptPanel?.classList.toggle('bot-panel-active', tab === 'script');
        debugPanel?.classList.toggle('bot-panel-active', tab === 'debug');
        logsPanel?.classList.toggle('bot-panel-active', tab === 'logs');
    }

    private bindDebugToggle(id: string, key: keyof BotDebugFlags) {
        const checkbox = document.getElementById(id) as HTMLInputElement | null;
        if (!checkbox) {
            return;
        }

        checkbox.checked = this.debugFlags[key];
        checkbox.onchange = () => {
            this.debugFlags[key] = checkbox.checked;
            this.saveDebugFlags();
            this.applyDebugFlags();
        };
    }

    private initUi() {
        this.loadDebugFlags();
        this.applyDebugFlags();

        const scriptButton = document.getElementById('botTabScript');
        const debugButton = document.getElementById('botTabDebug');
        const logsButton = document.getElementById('botTabLogs');
        scriptButton?.addEventListener('click', () => this.setTab('script'));
        debugButton?.addEventListener('click', () => this.setTab('debug'));
        logsButton?.addEventListener('click', () => this.setTab('logs'));
        this.setTab(this.activeTab);

        this.bindDebugToggle('botDebugItemIds', 'itemIds');
        this.bindDebugToggle('botDebugNpcIds', 'npcIds');
        this.bindDebugToggle('botDebugWorldObjectIds', 'worldObjectIds');
        this.bindDebugToggle('botDebugWalkTileCoords', 'walkTileCoords');

        const clearBtn = document.getElementById('botLogsClear');
        clearBtn?.addEventListener('click', () => this.clearLogs());
    }

    constructor(client: Client) {
        this.client = client;

        this.scripts = [ScriptLoader, AutoKiller, AutoFisher, LumbyThievSuicide, AutoWalker];
        this.api = new BotAPI(this);

        this.intervalHandle = -1;
        this.initUi();
    }

    setScriptChoice() {
        const botParams = document.getElementById('botparams');
        const target = (document.getElementById('botscripts') as HTMLSelectElement | null)?.value;

        if (!botParams) {
            return;
        }
        botParams.innerHTML = '';
        this.setSummary('');

        for (let i: number = 0; i < this.scripts.length; ++i) {
            if (scriptRegistryKey(this.scripts[i]) === target) {
                this.scripts[i].htmlSetup(botParams);
                this._injStartScript = () => {
                    const C = this.scripts[i] as unknown as { buildFromHtml(el: HTMLElement): BotScript };
                    this.start(C.buildFromHtml(botParams));
                };
                this._injDeleteScript = () => {
                    this.deleteScript(scriptRegistryKey(this.scripts[i]));
                };
                const del = document.getElementById('deleteBot');
                if (del) {
                    del.hidden = new this.scripts[i]().isSystemScript;
                }
                this.setSummary(`Configure ${target} and click Start Bot.`);
                break;
            }
        }
    }

    saveScript(name: string, startScript: string, updateScript: string, endScript: string, htmlSetupScript: string, buildFromHtmlScript: string) {
        localStorage.setItem('localScript_' + name, JSON.stringify({
            name,
            startScript,
            updateScript,
            endScript,
            htmlSetupScript,
            buildFromHtmlScript,
        }));
        this.reloadScripts();
    }

    deleteScript(scName: string) {
        localStorage.removeItem('localScript_' + scName);
        this.reloadScripts();
    }

    reloadScripts() {
        const elemBotScripts = document.getElementById('botscripts');
        const previousSelection = (elemBotScripts as HTMLSelectElement | null)?.value;

        elemBotScripts?.replaceChildren();

        for (let i = this.scripts.length - 1; i >= 0; i--) {
            if (!new this.scripts[i]().isSystemScript) {
                this.scripts.splice(i, 1);
            }
        }

        for (let i = 0; i < localStorage.length; ++i) {
            const lsKey = localStorage.key(i);
            if (lsKey?.startsWith('localScript_')) {
                const raw = localStorage.getItem(lsKey);
                if (!raw) {
                    continue;
                }
                const scData = JSON.parse(raw);
                const builtClass = ScriptLoader.createScriptClass(scData.name, scData.startScript, scData.updateScript, scData.endScript, scData.htmlSetupScript, scData.buildFromHtmlScript);
                this.scripts.push(builtClass);
            }
        }

        this.scripts.forEach(script => {
            const option = document.createElement('option');
            const key = scriptRegistryKey(script);
            option.value = key;
            option.textContent = key;
            elemBotScripts?.appendChild(option);
        });

        const select = elemBotScripts as HTMLSelectElement | null;
        if (select && previousSelection && this.scripts.some(script => scriptRegistryKey(script) === previousSelection)) {
            select.value = previousSelection;
        }

        this.setScriptChoice();
    }

    start(script: BotScript) {
        this.stop();
        this.currentScript = script;
        const name = scriptRegistryKey(script.constructor as new (...args: unknown[]) => unknown);
        this.log('INFO', 'Bot.start', `Script started: ${name}`);
        const tickFunc = () => {
            if (this.api.isLoggedIn()) {
                this.api.surface.markClientInputActivity();
            }
            script.update(this);
        };
        script.start(this);
        this.intervalHandle = setInterval(tickFunc, 100) as unknown as number;
        console.info('Script started.');
    }

    stop() {
        const script = this.currentScript;
        if (script) {
            const name = scriptRegistryKey(script.constructor as new (...args: unknown[]) => unknown);
            script.stop(this);
            this.log('INFO', 'Bot.stop', `Script stopped: ${name}`);
        }
        this.currentScript = null;
        clearInterval(this.intervalHandle);
        console.info('Script stopped.');
    }
}
