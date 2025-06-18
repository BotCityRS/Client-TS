import { Client } from "#/client/Client";
import Component from "#/config/Component";
import ObjType from "#/config/ObjType";
import NpcEntity from "#/dash3d/entity/NpcEntity";
import type ObjStackEntity from "#/dash3d/entity/ObjStackEntity";
import BotAPI from "./api/BotAPI";
import AutoFisher from "./scripts/AutoFisher";
import AutoKiller from "./scripts/AutoKiller";
import AutoWalker from "./scripts/AutoWalker";
import BotScript from "./scripts/BotScript";
import LumbyThievSuicide from "./scripts/LumbyThievSuicide";
import ScriptLoader from "./scripts/ScriptLoader";

const BOT_TIMER_WALK = -20;

export default class Bot {
    client: Client;
        
    intervalHandle: number;

    api: BotAPI;
    scripts: any[];

    currentScript: BotScript | null = null;

    constructor(client: Client, window: Window) {
        window.bot = this;
        this.client = client;

        this.scripts = [ScriptLoader, AutoKiller, AutoFisher, LumbyThievSuicide, AutoWalker];
        this.api = new BotAPI(this);

        this.intervalHandle = -1;
    }

    setScriptChoice() {
        const botParams = document.getElementById('botparams');
        const target = document.getElementById('botscripts')?.value;

        botParams.innerHTML = '';

        for (let i = 0; i < this.scripts.length; ++i) {
            if (this.scripts[i].name == target) {
                this.scripts[i].htmlSetup(botParams)
                this._injStartScript = () => {
                    this.start(this.scripts[i].buildFromHtml())
                }
                this._injDeleteScript = () => {
                    this.deleteScript(this.scripts[i].name)
                }
                document.getElementById('deleteBot').hidden = (new this.scripts[i]()).isSystemScript;
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
        }))
        this.reloadScripts();
    }

    deleteScript(scName: string) {
        localStorage.removeItem('localScript_' + scName);
        this.reloadScripts();
    }

    reloadScripts() {
        const elemBotScripts = document.getElementById('botscripts')

        elemBotScripts?.replaceChildren();

        for (let i = this.scripts.length - 1; i >= 0; i--) {
            if (!(new this.scripts[i]()).isSystemScript) {
                this.scripts.splice(i, 1)
            }
        }

        for (let i = 0; i < localStorage.length; ++i) {
            const lsKey = localStorage.key(i);
            if (lsKey?.startsWith('localScript_')) {
                const scData = JSON.parse(localStorage.getItem(lsKey));
                const builtClass = ScriptLoader.createScriptClass(scData.name, scData.startScript, scData.updateScript, scData.endScript, scData.htmlSetupScript, scData.buildFromHtmlScript);
                window.bot.scripts.push(builtClass);
            }
        }

        this.scripts.forEach(script => {
            const option = document.createElement('option');
            option.value = script.name;
            option.textContent = script.name;
            elemBotScripts?.appendChild(option);
        });

        this.setScriptChoice();
    }

    start(script: BotScript) {
        this.stop();
        this.currentScript = script;
        const tickFunc = () => {
            //client.resetIdleTimeout();
            script.update(this)
        }
        script.start(this);
        this.intervalHandle = setInterval(tickFunc, 100);
        console.info('Script started.');
    }

    stop() {
        this.currentScript?.stop(this)
        clearInterval(this.intervalHandle);
        console.info('Script stopped.');
    }
}
