import type { Client } from '#/client/Client.js';
import type { BotLogLevel } from './BotLog.js';
import {
    type BotDebugFlags,
    readBotDebugModeEnabled,
    readEffectiveBotDebugFlags,
    readStoredBotDebugFlags,
    writeBotDebugModeEnabled,
    writeStoredBotDebugFlags
} from './botDebugStorage.js';
import BotAPI from './api/BotAPI';
import AutoFisher from './scripts/AutoFisher';
import AutoFlaxPicker from './scripts/AutoFlaxPicker';
import AutoKiller from './scripts/AutoKiller';
import AutoWalker from './scripts/AutoWalker';
import PathRecorder from './scripts/PathRecorder';
import AutoWoodcutter from './scripts/AutoWoodcutter';
import BotScript from './scripts/BotScript';
import LumbyThievSuicide from './scripts/LumbyThievSuicide';
import ScriptLoader from './scripts/ScriptLoader';
import { LOCAL_CDN_SOURCE_ID, type BotScriptDefinition } from './scripts/CDNManager';
import { formatDetail } from './api/botApiAssert.js';
import {
    addAccount,
    decryptPassword,
    findAccountById,
    getSelectedId,
    loadAccounts,
    removeAccount,
    setSelectedId
} from './BotAccountsStore.js';

/** Script list key: constructor `name` (preserved by bundle + Terser `keep_classnames`). */
function scriptRegistryKey(scriptCtor: new (...args: unknown[]) => unknown): string {
    return scriptCtor.name;
}

const MAX_LOG_LINES = 4000;

export default class Bot {
    client: Client;

    intervalHandle: number;

    api: BotAPI;
    scripts: any[];

    currentScript: BotScript | null = null;

    _injStartScript?: () => void;
    _injDeleteScript?: () => void;
    private activeTab: 'script' | 'accounts' | 'debug' | 'logs' = 'script';
    private debugModeEnabled = false;
    private debugFlags: BotDebugFlags = readStoredBotDebugFlags();

    private logLines: string[] = [];
    private reloadScriptsRun = 0;
    private localScriptNamesByRegistryKey = new Map<string, string>();

    isDebugModeEnabled(): boolean {
        return this.debugModeEnabled;
    }

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
        const effective = this.debugModeEnabled ? this.debugFlags : readEffectiveBotDebugFlags();
        this.getClientWithDebugSetter().setBotDebugFlags(effective);
    }

    private saveDebugFlags() {
        writeStoredBotDebugFlags(this.debugFlags);
    }

    private loadDebugFlags() {
        this.debugFlags = readStoredBotDebugFlags();
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

    private isDebugScriptInstance(script: BotScript): boolean {
        return script.isDebugScript === true;
    }

    private setTab(tab: 'script' | 'accounts' | 'debug' | 'logs') {
        if (tab === 'debug' && !this.debugModeEnabled) {
            tab = 'script';
        }
        this.activeTab = tab;
        const scriptButton = document.getElementById('botTabScript');
        const accountsButton = document.getElementById('botTabAccounts');
        const debugButton = document.getElementById('botTabDebug');
        const logsButton = document.getElementById('botTabLogs');
        const scriptPanel = document.getElementById('bot-script-panel');
        const accountsPanel = document.getElementById('bot-accounts-panel');
        const debugPanel = document.getElementById('bot-debug-panel');
        const logsPanel = document.getElementById('bot-logs-panel');

        scriptButton?.classList.toggle('bot-tab-active', tab === 'script');
        accountsButton?.classList.toggle('bot-tab-active', tab === 'accounts');
        debugButton?.classList.toggle('bot-tab-active', tab === 'debug');
        logsButton?.classList.toggle('bot-tab-active', tab === 'logs');
        scriptPanel?.classList.toggle('bot-panel-active', tab === 'script');
        accountsPanel?.classList.toggle('bot-panel-active', tab === 'accounts');
        debugPanel?.classList.toggle('bot-panel-active', tab === 'debug');
        logsPanel?.classList.toggle('bot-panel-active', tab === 'logs');
    }

    private bindDebugToggle(id: string, key: keyof BotDebugFlags) {
        const checkbox = document.getElementById(id) as HTMLInputElement | null;
        if (!checkbox) {
            return;
        }

        checkbox.checked = this.debugFlags[key];
        checkbox.disabled = !this.debugModeEnabled;
        checkbox.onchange = () => {
            this.debugFlags[key] = checkbox.checked;
            this.saveDebugFlags();
            this.applyDebugFlags();
        };
    }

    private refreshDebugToggleInputs() {
        const keys: (keyof BotDebugFlags)[] = ['itemIds', 'npcIds', 'worldObjectIds', 'walkTileCoords'];
        const ids = ['botDebugItemIds', 'botDebugNpcIds', 'botDebugWorldObjectIds', 'botDebugWalkTileCoords'];
        for (let i = 0; i < keys.length; i++) {
            const checkbox = document.getElementById(ids[i]) as HTMLInputElement | null;
            if (!checkbox) {
                continue;
            }
            checkbox.checked = this.debugFlags[keys[i]];
            checkbox.disabled = !this.debugModeEnabled;
        }
    }

    setDebugMode(enabled: boolean): void {
        if (this.debugModeEnabled === enabled) {
            return;
        }
        this.debugModeEnabled = enabled;
        writeBotDebugModeEnabled(enabled);
        this.updateDebugModeUi();
        if (!enabled && this.currentScript && this.isDebugScriptInstance(this.currentScript)) {
            this.stop();
        }
        void this.reloadScripts();
        this.applyDebugFlags();
    }

    private updateDebugModeUi() {
        const debugTab = document.getElementById('botTabDebug');
        const debugPanel = document.getElementById('bot-debug-panel');
        const modeToggle = document.getElementById('botDebugMode') as HTMLInputElement | null;

        if (debugTab) {
            debugTab.hidden = !this.debugModeEnabled;
        }
        if (debugPanel && !this.debugModeEnabled) {
            debugPanel.classList.remove('bot-panel-active');
        }
        if (modeToggle) {
            modeToggle.checked = this.debugModeEnabled;
        }

        if (!this.debugModeEnabled && this.activeTab === 'debug') {
            this.setTab('script');
        } else {
            this.setTab(this.activeTab);
        }

        this.refreshDebugToggleInputs();
    }

    private scriptVisibleInUi(scriptCtor: new (...args: unknown[]) => BotScript): boolean {
        const instance = new scriptCtor();
        if (!this.debugModeEnabled && instance.isDebugScript) {
            return false;
        }
        return true;
    }

    private setAccountStatus(message: string) {
        const el = document.getElementById('botAccountStatus');
        if (el) {
            el.textContent = message;
        }
    }

    private refreshAccountSelect(selectedId?: string | null): void {
        const select = document.getElementById('botAccountSelect') as HTMLSelectElement | null;
        if (!select) {
            return;
        }

        const accounts = loadAccounts();
        const removeBtn = document.getElementById('botAccountRemove') as HTMLButtonElement | null;
        select.replaceChildren();

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = accounts.length === 0 ? 'No saved accounts' : 'Select an account…';
        select.appendChild(placeholder);

        for (const account of accounts) {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = account.username;
            select.appendChild(option);
        }

        let id = selectedId !== undefined ? selectedId : getSelectedId();
        if (id && !accounts.some(a => a.id === id)) {
            id = accounts[0]?.id ?? null;
            setSelectedId(id);
        }

        select.value = id ?? '';
        if (removeBtn) {
            removeBtn.disabled = !id;
        }
    }

    private clearLoginCredentials(): void {
        this.api.surface.setLoginCredentials('', '');
    }

    /** Refill game login fields from the selected saved account (e.g. after logout). */
    reinjectSelectedAccount(): Promise<void> {
        return this.injectAccount(getSelectedId());
    }

    private async injectAccount(id: string | null): Promise<void> {
        if (!id) {
            this.clearLoginCredentials();
            return;
        }

        const account = findAccountById(id);
        if (!account) {
            this.clearLoginCredentials();
            return;
        }

        try {
            const password = await decryptPassword(account);
            this.api.surface.setLoginCredentials(account.username, password);
        } catch {
            this.setAccountStatus('Could not decrypt password for this account.');
            this.clearLoginCredentials();
        }
    }

    private async selectAccount(id: string | null): Promise<void> {
        setSelectedId(id);
        this.refreshAccountSelect(id);
        await this.injectAccount(id);
    }

    private initAccountsUi(): void {
        const select = document.getElementById('botAccountSelect') as HTMLSelectElement | null;
        const usernameInput = document.getElementById('botAccountUsername') as HTMLInputElement | null;
        const passwordInput = document.getElementById('botAccountPassword') as HTMLInputElement | null;
        const addBtn = document.getElementById('botAccountAdd');
        const removeBtn = document.getElementById('botAccountRemove');

        this.refreshAccountSelect();
        void this.reinjectSelectedAccount();

        select?.addEventListener('change', () => {
            const id = select.value || null;
            void this.selectAccount(id);
            this.setAccountStatus('');
        });

        addBtn?.addEventListener('click', () => {
            void (async () => {
                const username = usernameInput?.value ?? '';
                const password = passwordInput?.value ?? '';
                const result = await addAccount(username, password);
                if (!result.ok) {
                    this.setAccountStatus(result.error);
                    return;
                }
                this.setAccountStatus('');
                if (passwordInput) {
                    passwordInput.value = '';
                }
                await this.selectAccount(result.account.id);
            })();
        });

        removeBtn?.addEventListener('click', () => {
            const id = select?.value;
            if (!id) {
                return;
            }
            if (!window.confirm('Remove this saved account?')) {
                return;
            }
            removeAccount(id);
            const accounts = loadAccounts();
            const nextId = accounts[0]?.id ?? null;
            void this.selectAccount(nextId);
            this.setAccountStatus('');
        });
    }

    private initUi() {
        this.debugModeEnabled = readBotDebugModeEnabled();
        this.loadDebugFlags();
        this.applyDebugFlags();

        const scriptButton = document.getElementById('botTabScript');
        const accountsButton = document.getElementById('botTabAccounts');
        const debugButton = document.getElementById('botTabDebug');
        const logsButton = document.getElementById('botTabLogs');
        scriptButton?.addEventListener('click', () => this.setTab('script'));
        accountsButton?.addEventListener('click', () => this.setTab('accounts'));
        debugButton?.addEventListener('click', () => this.setTab('debug'));
        logsButton?.addEventListener('click', () => this.setTab('logs'));

        const modeToggle = document.getElementById('botDebugMode') as HTMLInputElement | null;
        modeToggle?.addEventListener('change', () => {
            this.setDebugMode(modeToggle.checked);
        });

        this.updateDebugModeUi();

        this.bindDebugToggle('botDebugItemIds', 'itemIds');
        this.bindDebugToggle('botDebugNpcIds', 'npcIds');
        this.bindDebugToggle('botDebugWorldObjectIds', 'worldObjectIds');
        this.bindDebugToggle('botDebugWalkTileCoords', 'walkTileCoords');

        const clearBtn = document.getElementById('botLogsClear');
        clearBtn?.addEventListener('click', () => this.clearLogs());

        this.initAccountsUi();
    }

    constructor(client: Client) {
        this.client = client;

        this.scripts = [ScriptLoader, PathRecorder, AutoKiller, AutoFisher, AutoFlaxPicker, AutoWoodcutter, LumbyThievSuicide, AutoWalker];
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
                    const key = scriptRegistryKey(this.scripts[i]);
                    del.hidden = new this.scripts[i]().isSystemScript || !this.localScriptNamesByRegistryKey.has(key);
                }
                this.setSummary(`Configure ${target} and click Start Bot.`);
                break;
            }
        }
    }

    saveScript(name: string, startScript: string, updateScript: string, endScript: string, htmlSetupScript: string, buildFromHtmlScript: string) {
        if (!this.debugModeEnabled) {
            window.alert('Enable debug mode to create or edit custom scripts.');
            return;
        }
        ScriptLoader.cdnManager.saveLocalScript({
            name,
            startScript,
            updateScript,
            endScript,
            htmlSetupScript,
            buildFromHtmlScript,
        });
        void this.reloadScripts();
    }

    deleteScript(scName: string) {
        const localName = this.localScriptNamesByRegistryKey.get(scName);
        if (!localName) {
            this.log('WARN', 'Bot.deleteScript', 'Only local CDN scripts can be deleted from the script dropdown', { script: scName });
            return;
        }

        ScriptLoader.cdnManager.deleteLocalScript(localName);
        void this.reloadScripts();
    }

    private renderScriptOptions(previousSelection?: string) {
        const elemBotScripts = document.getElementById('botscripts');
        elemBotScripts?.replaceChildren();

        this.scripts.forEach(script => {
            if (!this.scriptVisibleInUi(script)) {
                return;
            }
            const option = document.createElement('option');
            const key = scriptRegistryKey(script);
            option.value = key;
            option.textContent = key;
            elemBotScripts?.appendChild(option);
        });

        const select = elemBotScripts as HTMLSelectElement | null;
        if (select && previousSelection && this.scripts.some(script => scriptRegistryKey(script) === previousSelection && this.scriptVisibleInUi(script))) {
            select.value = previousSelection;
        }

        this.setScriptChoice();
    }

    private buildCdnScriptClass(script: BotScriptDefinition): new () => BotScript {
        return ScriptLoader.createScriptClass(
            script.name,
            script.startScript,
            script.updateScript,
            script.endScript,
            script.htmlSetupScript,
            script.buildFromHtmlScript
        ) as new () => BotScript;
    }

    async reloadScripts(): Promise<void> {
        const reloadRun = ++this.reloadScriptsRun;
        const elemBotScripts = document.getElementById('botscripts');
        const previousSelection = (elemBotScripts as HTMLSelectElement | null)?.value;

        for (let i = this.scripts.length - 1; i >= 0; i--) {
            if (!new this.scripts[i]().isSystemScript) {
                this.scripts.splice(i, 1);
            }
        }
        this.localScriptNamesByRegistryKey.clear();

        this.renderScriptOptions(previousSelection);

        const systemKeys = new Set(this.scripts.map(script => scriptRegistryKey(script)));
        const cdnScripts = new Map<string, new () => BotScript>();
        const results = await ScriptLoader.cdnManager.loadScripts();
        if (reloadRun !== this.reloadScriptsRun) {
            return;
        }

        for (const result of results) {
            if (result.source.id === LOCAL_CDN_SOURCE_ID && !this.debugModeEnabled) {
                continue;
            }

            if (result.error) {
                this.log('WARN', 'Bot.reloadScripts', 'Failed to load CDN source', {
                    source: result.source.name,
                    error: result.error
                });
                continue;
            }

            for (const script of result.scripts) {
                try {
                    const builtClass = this.buildCdnScriptClass(script);
                    const key = scriptRegistryKey(builtClass);
                    if (systemKeys.has(key)) {
                        this.log('WARN', 'Bot.reloadScripts', 'Skipping CDN script that conflicts with a system script', { script: key });
                        continue;
                    }

                    cdnScripts.set(key, builtClass);
                    if (result.source.id === LOCAL_CDN_SOURCE_ID) {
                        this.localScriptNamesByRegistryKey.set(key, script.name);
                    }
                } catch (err) {
                    this.log('ERROR', 'Bot.reloadScripts', 'Failed to compile CDN script', {
                        script: script.name,
                        source: result.source.name,
                        error: err instanceof Error ? err.message : String(err)
                    });
                }
            }
        }

        this.scripts.push(...cdnScripts.values());
        this.renderScriptOptions(previousSelection);
    }

    start(script: BotScript) {
        if (!this.debugModeEnabled && this.isDebugScriptInstance(script)) {
            this.log('WARN', 'Bot.start', 'Cannot start debug script without debug mode', { script: script.name });
            return;
        }
        this.stop();
        this.currentScript = script;
        const name = scriptRegistryKey(script.constructor as new (...args: unknown[]) => unknown);
        this.log('INFO', 'Bot.start', `Script started: ${name}`);
        const tickFunc = () => {
            this.api.tryLogin();
            if (this.api.isLoggedIn()) {
                this.api.surface.markClientInputActivity();
            }
            script.update(this);
        };
        script.start(this);
        this.api.tryLogin();
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
        this.api.world.stopPath();
        clearInterval(this.intervalHandle);
        console.info('Script stopped.');
    }
}
