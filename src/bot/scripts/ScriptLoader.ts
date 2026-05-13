import type BotAPI from "../api/BotAPI";
import Timer from "../api/Timer";
import type { Path } from "../api/World";
import Bot from "../Bot";
import BotScript from "./BotScript";


export default class ScriptLoader extends BotScript {
    scriptStart: string;
    scriptUpdate: string;
    scriptEnd: string;

    constructor(scriptStart: string, scriptUpdate: string, scriptEnd: string) {
        super('ScriptLoader', true)

        this.scriptStart = scriptStart;
        this.scriptUpdate = scriptUpdate;
        this.scriptEnd = scriptEnd;

        this.start = new Function('bot', scriptStart) as (bot: Bot) => void;
        this.update = new Function('bot', scriptUpdate) as (bot: Bot) => void;
        this.start = new Function('bot', scriptEnd) as (bot: Bot) => void;
    }

    static htmlSetup(base: HTMLElement) {
        const nameLabel = document.createElement('p')
        nameLabel.innerText = 'Name of script:';

        const scriptName = document.createElement('input')
        scriptName.type = 'text';
        scriptName.value = ``;
        scriptName.id = 'scriptName';
        
        const htmlSetupScript = document.createElement('textarea')
        htmlSetupScript.value = ``;
        htmlSetupScript.id = 'htmlSetupScript';
        
        const buildFromHtmlScript = document.createElement('textarea')
        buildFromHtmlScript.value = `return new this();`;
        buildFromHtmlScript.id = 'buildFromHtmlScript';
        
        const startScript = document.createElement('textarea')
        startScript.value = ``;
        startScript.id = 'startScript';
        
        const updateScript = document.createElement('textarea')
        updateScript.value = `console.info('isanim: ', bot.api.player.isAnimating());`;
        updateScript.id = 'updateScript';
        
        const endScript = document.createElement('textarea')
        endScript.value = ``;
        endScript.id = 'endScript';

        const saveScriptButton = document.createElement('button');
        saveScriptButton.innerText = 'Save Script'
        saveScriptButton.onclick = () => {
            const scName = scriptName.value;
            window.bot.saveScript(scName, startScript.value, updateScript.value, endScript.value, htmlSetupScript.value, buildFromHtmlScript.value)
        }

        const introLabel = document.createElement('p')
        introLabel.innerText = 'Paste your script in the input box below. It will be passed a Bot instance.\nPress "Start Bot" to load the script into the script list.\nIf the name exists already it will be overwritten.'

        base.appendChild(document.createElement('br'))
        base.appendChild(nameLabel);
        base.appendChild(saveScriptButton);
        base.appendChild(document.createElement('br'))
        base.appendChild(scriptName);
        base.appendChild(document.createElement('br'))
        base.appendChild(htmlSetupScript);
        base.appendChild(document.createElement('br'))
        base.appendChild(buildFromHtmlScript);
        base.appendChild(document.createElement('br'))
        base.appendChild(startScript);
        base.appendChild(document.createElement('br'))
        base.appendChild(updateScript);
        base.appendChild(document.createElement('br'))
        base.appendChild(endScript);
        base.appendChild(document.createElement('br'))
        base.appendChild(introLabel);
    }

    static createScriptClass(className: string, startScript: string, updateScript: string, endScript: string, htmlSetupScript: string, buildFromHtmlScript: string) {
        const safeName = JSON.stringify(className);
        return new Function('BotScript', 'startCode', 'updateCode', 'stopCode', 'htmlSetupCode', 'buildFromHtmlCode', `
            return class ${className} extends BotScript {
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

    static buildFromHtml(base: HTMLElement) {
        const scriptName = document.getElementById('scriptName')?.value
        const startScript = document.getElementById('startScript')?.value
        const updateScript = document.getElementById('updateScript')?.value
        const endScript = document.getElementById('endScript')?.value
        const htmlSetupScript = document.getElementById('htmlSetupScript')?.value
        const buildFromHtmlScript = document.getElementById('buildFromHtmlScript')?.value

        return new (ScriptLoader.createScriptClass(scriptName, startScript, updateScript, endScript, htmlSetupScript, buildFromHtmlScript))()
    }
}