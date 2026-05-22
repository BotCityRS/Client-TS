import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import CDNManager, {
    CDN_SOURCE_STORAGE_KEY,
    LOCAL_CDN_SOURCE_ID,
    LOCAL_SCRIPT_STORAGE_PREFIX,
    OFFICIAL_CDN_MANIFEST_URL,
    OFFICIAL_CDN_SOURCE_ID
} from '../scripts/CDNManager.js';

type StorageMock = Storage & {
    data: Map<string, string>;
};

function createLocalStorageMock(): StorageMock {
    const data = new Map<string, string>();
    return {
        data,
        get length() {
            return data.size;
        },
        clear: () => {
            data.clear();
        },
        getItem: (key: string) => data.get(key) ?? null,
        key: (index: number) => [...data.keys()][index] ?? null,
        removeItem: (key: string) => {
            data.delete(key);
        },
        setItem: (key: string, value: string) => {
            data.set(key, value);
        }
    } as StorageMock;
}

describe('CDNManager', () => {
    let storage: StorageMock;
    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
        storage = createLocalStorageMock();
        (globalThis as { localStorage: Storage }).localStorage = storage;
        originalFetch = globalThis.fetch;
        globalThis.fetch = async () => new Response(JSON.stringify({ scripts: [] }));
    });

    afterEach(() => {
        storage.clear();
        globalThis.fetch = originalFetch;
    });

    test('registers local and official CDN sources by default', () => {
        const manager = new CDNManager();

        expect(manager.listSources()).toEqual([
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
            }
        ]);
    });

    test('saves, loads, and deletes local CDN scripts', async () => {
        const manager = new CDNManager();
        manager.saveLocalScript({
            name: 'MyLocalScript',
            startScript: 'bot.log("INFO", "start", "ok");',
            updateScript: 'bot.log("INFO", "update", "ok");',
            endScript: '',
            htmlSetupScript: '',
            buildFromHtmlScript: 'return new this();'
        });

        expect(storage.getItem(`${LOCAL_SCRIPT_STORAGE_PREFIX}MyLocalScript`)).not.toBeNull();

        const results = await manager.loadScripts();
        const local = results.find(result => result.source.id === LOCAL_CDN_SOURCE_ID);
        expect(local?.scripts).toEqual([
            {
                name: 'MyLocalScript',
                startScript: 'bot.log("INFO", "start", "ok");',
                updateScript: 'bot.log("INFO", "update", "ok");',
                endScript: '',
                htmlSetupScript: '',
                buildFromHtmlScript: 'return new this();'
            }
        ]);

        manager.deleteLocalScript('MyLocalScript');
        expect(storage.getItem(`${LOCAL_SCRIPT_STORAGE_PREFIX}MyLocalScript`)).toBeNull();
    });

    test('adds, persists, and removes custom remote sources', () => {
        const manager = new CDNManager();
        const source = manager.addSource('Community CDN', 'https://example.com/bot-scripts/manifest.json');

        expect(source.removable).toBe(true);
        expect(manager.listSources().some(item => item.id === source.id)).toBe(true);
        expect(JSON.parse(storage.getItem(CDN_SOURCE_STORAGE_KEY) ?? '[]')).toEqual([
            {
                id: source.id,
                name: 'Community CDN',
                manifestUrl: 'https://example.com/bot-scripts/manifest.json',
                enabled: true
            }
        ]);

        expect(manager.removeSource(source.id)).toBe(true);
        expect(manager.listSources().some(item => item.id === source.id)).toBe(false);
        expect(JSON.parse(storage.getItem(CDN_SOURCE_STORAGE_KEY) ?? '[]')).toEqual([]);
    });

    test('does not remove protected default sources', () => {
        const manager = new CDNManager();

        expect(manager.removeSource(LOCAL_CDN_SOURCE_ID)).toBe(false);
        expect(manager.removeSource(OFFICIAL_CDN_SOURCE_ID)).toBe(false);
        expect(manager.listSources().map(source => source.id)).toEqual([LOCAL_CDN_SOURCE_ID, OFFICIAL_CDN_SOURCE_ID]);
    });

    test('loads remote manifests through fetch', async () => {
        globalThis.fetch = async () => new Response(JSON.stringify({
            scripts: [
                {
                    name: 'RemoteScript',
                    updateScript: 'bot.log("INFO", "remote", "tick");'
                }
            ]
        }));
        const manager = new CDNManager();

        const results = await manager.loadScripts();
        const official = results.find(result => result.source.id === OFFICIAL_CDN_SOURCE_ID);

        expect(official?.scripts).toEqual([
            {
                name: 'RemoteScript',
                startScript: '',
                updateScript: 'bot.log("INFO", "remote", "tick");',
                endScript: '',
                htmlSetupScript: '',
                buildFromHtmlScript: 'return new this();'
            }
        ]);
    });

    test('isolates remote failures from local CDN scripts', async () => {
        globalThis.fetch = async () => {
            throw new Error('offline');
        };
        const manager = new CDNManager();
        manager.saveLocalScript({
            name: 'StillLocal',
            startScript: '',
            updateScript: '',
            endScript: '',
            htmlSetupScript: '',
            buildFromHtmlScript: 'return new this();'
        });

        const results = await manager.loadScripts();
        const official = results.find(result => result.source.id === OFFICIAL_CDN_SOURCE_ID);
        const local = results.find(result => result.source.id === LOCAL_CDN_SOURCE_ID);

        expect(official?.error).toContain('offline');
        expect(local?.scripts.map(script => script.name)).toEqual(['StillLocal']);
    });
});
