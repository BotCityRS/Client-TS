export const LOCAL_CDN_SOURCE_ID = 'local';
export const OFFICIAL_CDN_SOURCE_ID = 'official';
export const LOCAL_SCRIPT_STORAGE_PREFIX = 'localScript_';
export const CDN_SOURCE_STORAGE_KEY = 'botScriptCDNSources';
export const OFFICIAL_CDN_MANIFEST_URL = 'https://botcityrs.github.io/scripts/manifest.json';

export type CDNSourceType = 'local' | 'remote';

export interface BotScriptDefinition {
    name: string;
    startScript: string;
    updateScript: string;
    endScript: string;
    htmlSetupScript: string;
    buildFromHtmlScript: string;
}

export interface CDNSource {
    id: string;
    name: string;
    type: CDNSourceType;
    removable: boolean;
    enabled: boolean;
    manifestUrl?: string;
}

export interface CDNLoadResult {
    source: CDNSource;
    scripts: BotScriptDefinition[];
    error?: string;
}

type StoredRemoteSource = {
    id?: unknown;
    name?: unknown;
    manifestUrl?: unknown;
    enabled?: unknown;
};

function getStorage(): Storage | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

function sourceIdFromUrl(manifestUrl: string): string {
    let hash = 0;
    for (let i = 0; i < manifestUrl.length; i++) {
        hash = ((hash << 5) - hash + manifestUrl.charCodeAt(i)) | 0;
    }
    return `remote_${Math.abs(hash).toString(36)}`;
}

function normalizeScriptDefinition(raw: unknown): BotScriptDefinition | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }

    const data = raw as Record<string, unknown>;
    if (typeof data.name !== 'string' || !data.name.trim()) {
        return null;
    }

    return {
        name: data.name.trim(),
        startScript: typeof data.startScript === 'string' ? data.startScript : '',
        updateScript: typeof data.updateScript === 'string' ? data.updateScript : '',
        endScript: typeof data.endScript === 'string' ? data.endScript : '',
        htmlSetupScript: typeof data.htmlSetupScript === 'string' ? data.htmlSetupScript : '',
        buildFromHtmlScript: typeof data.buildFromHtmlScript === 'string' ? data.buildFromHtmlScript : 'return new this();'
    };
}

function scriptsFromManifest(raw: unknown): BotScriptDefinition[] {
    const entries = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object' && Array.isArray((raw as { scripts?: unknown }).scripts)
            ? (raw as { scripts: unknown[] }).scripts
            : [];

    return entries.flatMap(entry => {
        const script = normalizeScriptDefinition(entry);
        return script ? [script] : [];
    });
}

export default class CDNManager {
    private sources: CDNSource[];

    constructor() {
        this.sources = [
            {
                id: LOCAL_CDN_SOURCE_ID,
                name: 'Local CDN',
                type: 'local',
                removable: false,
                enabled: true
            },
            {
                id: OFFICIAL_CDN_SOURCE_ID,
                name: 'Official CDN',
                type: 'remote',
                removable: false,
                enabled: true,
                manifestUrl: OFFICIAL_CDN_MANIFEST_URL
            },
            ...this.loadStoredRemoteSources()
        ];
    }

    listSources(): CDNSource[] {
        return this.sources.map(source => ({ ...source }));
    }

    addSource(name: string, manifestUrl: string): CDNSource {
        const trimmedUrl = manifestUrl.trim();
        const trimmedName = name.trim() || 'Custom CDN';
        if (!trimmedUrl) {
            throw new Error('CDN manifest URL is required.');
        }

        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost') {
            throw new Error('CDN manifest URL must use HTTPS.');
        }

        if (this.sources.some(source => source.manifestUrl === parsed.href)) {
            throw new Error('CDN source already exists.');
        }

        const source: CDNSource = {
            id: sourceIdFromUrl(parsed.href),
            name: trimmedName,
            type: 'remote',
            removable: true,
            enabled: true,
            manifestUrl: parsed.href
        };
        this.sources.push(source);
        this.saveStoredRemoteSources();
        return { ...source };
    }

    removeSource(id: string): boolean {
        const source = this.sources.find(item => item.id === id);
        if (!source || !source.removable) {
            return false;
        }

        this.sources = this.sources.filter(item => item.id !== id);
        this.saveStoredRemoteSources();
        return true;
    }

    saveLocalScript(script: BotScriptDefinition): void {
        const normalized = normalizeScriptDefinition(script);
        if (!normalized) {
            throw new Error('Script name is required.');
        }

        getStorage()?.setItem(`${LOCAL_SCRIPT_STORAGE_PREFIX}${normalized.name}`, JSON.stringify(normalized));
    }

    deleteLocalScript(name: string): void {
        getStorage()?.removeItem(`${LOCAL_SCRIPT_STORAGE_PREFIX}${name}`);
    }

    async loadScripts(): Promise<CDNLoadResult[]> {
        const results: CDNLoadResult[] = [];
        const loadOrder = [
            ...this.sources.filter(source => source.type === 'remote'),
            ...this.sources.filter(source => source.type === 'local')
        ];
        for (const source of loadOrder) {
            if (!source.enabled) {
                continue;
            }

            try {
                const scripts = source.type === 'local'
                    ? this.loadLocalScripts()
                    : await this.loadRemoteScripts(source);
                results.push({ source: { ...source }, scripts });
            } catch (err) {
                results.push({
                    source: { ...source },
                    scripts: [],
                    error: err instanceof Error ? err.message : String(err)
                });
            }
        }

        return results;
    }

    private loadLocalScripts(): BotScriptDefinition[] {
        const storage = getStorage();
        if (!storage) {
            return [];
        }

        const scripts: BotScriptDefinition[] = [];
        for (let i = 0; i < storage.length; ++i) {
            const key = storage.key(i);
            if (!key?.startsWith(LOCAL_SCRIPT_STORAGE_PREFIX)) {
                continue;
            }

            const raw = storage.getItem(key);
            if (!raw) {
                continue;
            }

            try {
                const script = normalizeScriptDefinition(JSON.parse(raw));
                if (script) {
                    scripts.push(script);
                }
            } catch {
                // Ignore malformed local entries so one bad edit does not hide the rest of the local CDN.
            }
        }
        return scripts;
    }

    private async loadRemoteScripts(source: CDNSource): Promise<BotScriptDefinition[]> {
        if (!source.manifestUrl) {
            return [];
        }

        const response = await fetch(source.manifestUrl, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} loading ${source.manifestUrl}`);
        }

        return scriptsFromManifest(await response.json());
    }

    private loadStoredRemoteSources(): CDNSource[] {
        const raw = getStorage()?.getItem(CDN_SOURCE_STORAGE_KEY);
        if (!raw) {
            return [];
        }

        try {
            const stored = JSON.parse(raw);
            if (!Array.isArray(stored)) {
                return [];
            }

            return stored.flatMap((source: StoredRemoteSource) => {
                if (typeof source.name !== 'string' || typeof source.manifestUrl !== 'string') {
                    return [];
                }

                const id = typeof source.id === 'string' && source.id ? source.id : sourceIdFromUrl(source.manifestUrl);
                return [{
                    id,
                    name: source.name,
                    type: 'remote' as const,
                    removable: true,
                    enabled: source.enabled !== false,
                    manifestUrl: source.manifestUrl
                }];
            });
        } catch {
            return [];
        }
    }

    private saveStoredRemoteSources(): void {
        const storage = getStorage();
        if (!storage) {
            return;
        }

        const stored = this.sources
            .filter(source => source.removable && source.type === 'remote')
            .map(source => ({
                id: source.id,
                name: source.name,
                manifestUrl: source.manifestUrl,
                enabled: source.enabled
            }));
        storage.setItem(CDN_SOURCE_STORAGE_KEY, JSON.stringify(stored));
    }
}
