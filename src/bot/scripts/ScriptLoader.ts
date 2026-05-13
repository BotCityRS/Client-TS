import Bot from '../Bot';
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
    scriptStart: string;
    scriptUpdate: string;
    scriptEnd: string;

    constructor(scriptStart: string, scriptUpdate: string, scriptEnd: string) {
        super('ScriptLoader', true);

        this.scriptStart = scriptStart;
        this.scriptUpdate = scriptUpdate;
        this.scriptEnd = scriptEnd;

        this.start = new Function('bot', scriptStart) as (bot: Bot) => void;
        this.update = new Function('bot', scriptUpdate) as (bot: Bot) => void;
        this.stop = new Function('bot', scriptEnd) as (bot: Bot) => void;
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

        const updateScript = createScriptArea('updateScript', 'console.info(\'isanim: \', bot.api.player.isAnimating());');

        const endScript = createScriptArea('endScript', '');

        const saveScriptButton = document.createElement('button');
        saveScriptButton.className = 'bot-button';
        saveScriptButton.innerText = 'Save Script';
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
        intro.textContent = 'Create and save custom scripts. Existing script names are overwritten.';
        base.appendChild(intro);

        const basicsSection = createSection(base, 'Script identity');
        createField(basicsSection, 'Script name', scriptName, 'Used as the dropdown entry and local storage key.');

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