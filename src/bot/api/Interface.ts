import { MiniMenuAction } from '#/client/MiniMenuAction.js';
import IfType from '#/config/IfType.js';
import type BotAPI from './BotAPI';

export class InterfaceComponent {
    constructor(
        private readonly api: BotAPI,
        readonly id: number,
        readonly type: IfType
    ) {}

    get layerId(): number {
        return this.type.layerId;
    }

    get componentType(): number {
        return this.type.type;
    }

    get buttonType(): number {
        return this.type.buttonType;
    }

    get text(): string | null {
        return this.type.text;
    }

    get alternateText(): string | null {
        return this.type.text2;
    }

    get buttonText(): string | null {
        return this.type.buttonText;
    }

    get hidden(): boolean {
        return this.type.hide;
    }

    get width(): number {
        return this.type.width;
    }

    get height(): number {
        return this.type.height;
    }

    get linkObjType(): Int32Array | null {
        return this.type.linkObjType;
    }

    get linkObjNumber(): Int32Array | null {
        return this.type.linkObjNumber;
    }

    get ops(): readonly (string | null)[] {
        return this.type.iop ?? [];
    }

    get targetVerb(): string | null {
        return this.type.targetVerb;
    }

    get targetBase(): string | null {
        return this.type.targetBase;
    }

    get targetMask(): number {
        return this.type.targetMask;
    }

    click(): boolean {
        return this.api.interface.clickComponent(this.id);
    }

    clickByOp(op: string): boolean {
        const lower = op.toLowerCase();
        if (
            this.buttonText?.toLowerCase() === lower ||
            this.ops.some(label => label?.toLowerCase() === lower)
        ) {
            return this.click();
        }
        return false;
    }
}

export default class Interface {
    constructor(private readonly api: BotAPI) {}

    getInterface(id: number) {
        return IfType.list[id];
    }

    getComponent(id: number): InterfaceComponent | null {
        const com = this.getInterface(id);
        return com ? new InterfaceComponent(this.api, id, com) : null;
    }

    activeRootIds(): number[] {
        return [
            this.api.surface.mainModalRootId,
            this.api.surface.mainOverlayRootId,
            this.api.surface.sideModalRootId,
            this.api.surface.sidebarOverlayRootId,
            this.api.surface.chatRootId,
            this.api.surface.tutorialRootId
        ].filter(id => id >= 0);
    }

    isOpen(rootId: number): boolean {
        return this.activeRootIds().includes(rootId);
    }

    isVisible(componentId: number): boolean {
        const component = this.getComponent(componentId);
        if (!component || component.hidden) {
            return false;
        }
        return component.layerId < 0 || this.isOpen(component.layerId) || this.isOpen(component.id);
    }

    clickComponent(id: number): boolean {
        if (!this.getInterface(id)) {
            this.api.bot.log('WARN', 'Interface.clickComponent', 'component does not exist', { id });
            return false;
        }
        this.api.doAction(MiniMenuAction.IF_BUTTON, 0, 0, id);
        return true;
    }

    findComponentsByText(text: string, exact = false): InterfaceComponent[] {
        const needle = text.toLowerCase();
        return IfType.list
            .map((com, id) => ({ com, id }))
            .filter(({ com }) => {
                if (!com) {
                    return false;
                }
                const labels = [com.text, com.text2, com.buttonText].filter((v): v is string => !!v);
                return labels.some(label => {
                    const lower = label.toLowerCase();
                    return exact ? lower === needle : lower.includes(needle);
                });
            })
            .map(({ com, id }) => new InterfaceComponent(this.api, id, com));
    }

    findComponentsByOp(op: string, exact = false): InterfaceComponent[] {
        const needle = op.toLowerCase();
        return IfType.list
            .map((com, id) => ({ com, id }))
            .filter(({ com }) => {
                if (!com) {
                    return false;
                }
                const labels = [com.buttonText, ...(com.iop ?? [])].filter((v): v is string => !!v);
                return labels.some(label => {
                    const lower = label.toLowerCase();
                    return exact ? lower === needle : lower.includes(needle);
                });
            })
            .map(({ com, id }) => new InterfaceComponent(this.api, id, com));
    }

    submitCountDialog(amount: number): boolean {
        return this.api.surface.submitCountDialog(amount);
    }
}
