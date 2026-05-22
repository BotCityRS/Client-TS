import Bot from '../Bot';
import CDNManager, { type CDNSource } from './CDNManager';
import BotScript from './BotScript';

function createSection(container: HTMLElement, title: string, description?: string): HTMLElement {
    const section = document.createElement('section');
    section.className = 'bot-section';

    const heading = document.createElement('h4');
    heading.className = 'bot-section-title';
    heading.textContent = title;
    section.appendChild(heading);

    if (description) {
        const desc = document.createElement('p');
        desc.className = 'bot-description';
        desc.textContent = description;
        section.appendChild(desc);
    }

    container.appendChild(section);
    return section;
}

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

function createScriptArea(id: string, value: string): HTMLTextAreaElement {
    const area = document.createElement('textarea');
    area.id = id;
    area.value = value;
    area.rows = 6;
    area.className = 'bot-textarea';
    return area;
}

function createInput(id: string, placeholder: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = id;
    input.placeholder = placeholder;
    input.className = 'bot-input';
    return input;
}

function getInputValue(id: string): string {
    return (document.getElementById(id) as HTMLInputElement | null)?.value ?? '';
}

function getTextAreaValue(id: string): string {
    return (document.getElementById(id) as HTMLTextAreaElement | null)?.value ?? '';
}

function toClassIdentifier(scriptName: string): string {
    const cleaned = scriptName.replace(/[^A-Za-z0-9_$]/g, '_');
    if (!cleaned) {
        return 'CustomScriptClass';
    }
    if (/^[0-9]/.test(cleaned)) {
        return `Script_${cleaned}`;
    }
    return cleaned;
}

export default class ScriptLoader extends BotScript {
    static cdnManager = new CDNManager();

    scriptStart: string;
    scriptUpdate: string;
    scriptEnd: string;

    constructor(scriptStart: string, scriptUpdate: string, scriptEnd: string) {
        super('ScriptLoader', true, true);

        this.scriptStart = scriptStart;
        this.scriptUpdate = scriptUpdate;
        this.scriptEnd = scriptEnd;

        this.start = new Function('bot', scriptStart) as (bot: Bot) => void;
        this.update = new Function('bot', scriptUpdate) as (bot: Bot) => void;
        this.stop = new Function('bot', scriptEnd) as (bot: Bot) => void;
    }

    private static renderCdnSources(container: HTMLElement) {
        container.replaceChildren();

        const sources = ScriptLoader.cdnManager.listSources();
        const select = document.createElement('select');
        select.id = 'botCdnSources';
        select.size = Math.min(Math.max(sources.length, 2), 8);
        select.setAttribute('aria-label', 'CDN sources');

        for (const source of sources) {
            const option = document.createElement('option');
            option.value = source.id;
            option.textContent = ScriptLoader.formatSourceLabel(source);
            select.appendChild(option);
        }

        const details = document.createElement('div');
        details.className = 'bot-cdn-source-details';

        const sourceType = document.createElement('div');
        sourceType.className = 'bot-label';
        details.appendChild(sourceType);

        const sourceUrl = document.createElement('small');
        sourceUrl.className = 'bot-hint';
        details.appendChild(sourceUrl);

        const remove = document.createElement('button');
        remove.className = 'bot-button bot-button-danger';
        remove.type = 'button';
        remove.textContent = 'Remove selected';

        const updateSelection = () => {
            const source = sources.find(candidate => candidate.id === select.value) ?? sources[0];
            if (!source) {
                sourceType.textContent = 'No CDN sources configured.';
                sourceUrl.textContent = '';
                remove.disabled = true;
                return;
            }

            select.value = source.id;
            sourceType.textContent = `${source.name} is a ${source.removable ? 'custom' : 'default'} ${source.type} source.`;
            sourceUrl.textContent = source.manifestUrl ?? 'Local browser storage';
            remove.disabled = !source.removable;
        };

        remove.onclick = () => {
            const source = sources.find(candidate => candidate.id === select.value);
            if (!source || !source.removable) {
                return;
            }
            ScriptLoader.cdnManager.removeSource(source.id);
            ScriptLoader.renderCdnSources(container);
            void (globalThis as unknown as { bot?: { reloadScripts: () => Promise<void> } }).bot?.reloadScripts();
        };

        select.onchange = updateSelection;
        container.appendChild(select);
        container.appendChild(details);
        container.appendChild(remove);
        updateSelection();
    }

    private static formatSourceLabel(source: CDNSource): string {
        const protection = source.removable ? 'custom' : 'default';
        return `${source.name} (${source.type}, ${protection})`;
    }

    static renderCdnPanel(base: HTMLElement) {
        base.replaceChildren();

        const intro = document.createElement('p');
        intro.className = 'bot-description';
        intro.textContent = 'Load scripts from the local CDN and remote manifest sources.';
        base.appendChild(intro);

        const sourcesSection = createSection(base, 'CDN sources');
        const cdnSourceList = document.createElement('div');
        cdnSourceList.id = 'botCdnSourcesList';
        sourcesSection.appendChild(cdnSourceList);
        ScriptLoader.renderCdnSources(cdnSourceList);

        const sourceName = createInput('botCdnSourceName', 'Community scripts');
        const sourceUrl = createInput('botCdnSourceUrl', 'https://owner.github.io/repo/manifest.json');
        createField(sourcesSection, 'Source name', sourceName);
        createField(sourcesSection, 'Manifest URL', sourceUrl, 'GitHub Pages manifests must be served over HTTPS.');

        const addSourceButton = document.createElement('button');
        addSourceButton.className = 'bot-button';
        addSourceButton.type = 'button';
        addSourceButton.textContent = 'Add Source';
        addSourceButton.onclick = () => {
            try {
                ScriptLoader.cdnManager.addSource(sourceName.value, sourceUrl.value);
                sourceName.value = '';
                sourceUrl.value = '';
                ScriptLoader.renderCdnSources(cdnSourceList);
                void (globalThis as unknown as { bot?: { reloadScripts: () => Promise<void> } }).bot?.reloadScripts();
            } catch (err) {
                window.alert(err instanceof Error ? err.message : String(err));
            }
        };
        const sourceActions = document.createElement('div');
        sourceActions.className = 'bot-actions';
        sourceActions.appendChild(addSourceButton);
        sourcesSection.appendChild(sourceActions);
    }

    static htmlSetup(base: HTMLElement) {
        const scriptName = document.createElement('input');
        scriptName.type = 'text';
        scriptName.value = '';
        scriptName.id = 'scriptName';
        scriptName.placeholder = 'MyCustomScript';

        const htmlSetupScript = createScriptArea('htmlSetupScript', '');

        const buildFromHtmlScript = createScriptArea('buildFromHtmlScript', 'return new this();');

        const startScript = createScriptArea('startScript', '');

        const updateScript = createScriptArea('updateScript', "bot.log('DEBUG', 'userScript.update', 'tick', { isAnimating: bot.api.player.isAnimating() });");

        const endScript = createScriptArea('endScript', '');

        const saveScriptButton = document.createElement('button');
        saveScriptButton.className = 'bot-button';
        saveScriptButton.type = 'button';
        saveScriptButton.innerText = 'Save to Local CDN';
        saveScriptButton.onclick = () => {
            const scName = scriptName.value.trim();
            if (!scName) {
                window.alert('Please enter a script name before saving.');
                return;
            }
            (globalThis as unknown as { bot: { saveScript: (...args: [string, string, string, string, string, string]) => void } }).bot
                .saveScript(scName, startScript.value, updateScript.value, endScript.value, htmlSetupScript.value, buildFromHtmlScript.value);
        };

        const intro = document.createElement('p');
        intro.className = 'bot-description';
        intro.textContent = 'Create and save custom scripts to the local CDN. Existing script names are overwritten.';
        base.appendChild(intro);

        const basicsSection = createSection(base, 'Script identity');
        createField(basicsSection, 'Script name', scriptName, 'Used as the dropdown entry and local CDN key.');

        const uiSection = createSection(base, 'UI configuration', 'Optional setup for custom parameter fields.');
        createField(uiSection, 'htmlSetup(base)', htmlSetupScript, 'Runs when script is selected to build the parameter UI.');
        createField(uiSection, 'buildFromHtml(base)', buildFromHtmlScript, 'Returns a script instance based on the UI values.');

        const lifecycleSection = createSection(base, 'Lifecycle code', 'Each function receives `bot` (instance of Bot).');
        createField(lifecycleSection, 'start(bot)', startScript);
        createField(lifecycleSection, 'update(bot)', updateScript);
        createField(lifecycleSection, 'stop(bot)', endScript);

        const actions = document.createElement('div');
        actions.className = 'bot-actions';
        actions.appendChild(saveScriptButton);
        base.appendChild(actions);
    }

    static createScriptClass(className: string, startScript: string, updateScript: string, endScript: string, htmlSetupScript: string, buildFromHtmlScript: string) {
        const safeName = JSON.stringify(className);
        const classIdentifier = toClassIdentifier(className);
        try {
            return new Function('BotScript', 'startCode', 'updateCode', 'stopCode', 'htmlSetupCode', 'buildFromHtmlCode', `
            return class ${classIdentifier} extends BotScript {
                constructor() {
                    super(${safeName}, false);
                    this.start = new Function('bot', startCode);
                    this.update = new Function('bot', updateCode);
                    this.stop = new Function('bot', stopCode);
                }

                static htmlSetup = new Function('base', htmlSetupCode);
                static buildFromHtml = new Function('base', buildFromHtmlCode);
            }
        `)(BotScript, startScript, updateScript, endScript, htmlSetupScript, buildFromHtmlScript);
        } catch (err) {
            (globalThis as unknown as { bot?: { log: (l: 'ERROR', s: string, m: string, d?: unknown) => void } }).bot?.log(
                'ERROR',
                'ScriptLoader.createScriptClass',
                'Failed to compile custom script',
                { className, message: err instanceof Error ? err.message : String(err) }
            );
            throw err;
        }
    }

    static buildFromHtml(_base: HTMLElement) {
        const scriptName = getInputValue('scriptName').trim() || 'CustomScript';
        const startScript = getTextAreaValue('startScript');
        const updateScript = getTextAreaValue('updateScript');
        const endScript = getTextAreaValue('endScript');
        const htmlSetupScript = getTextAreaValue('htmlSetupScript');
        const buildFromHtmlScript = getTextAreaValue('buildFromHtmlScript') || 'return new this();';

        return new (ScriptLoader.createScriptClass(scriptName, startScript, updateScript, endScript, htmlSetupScript, buildFromHtmlScript))();
    }
}