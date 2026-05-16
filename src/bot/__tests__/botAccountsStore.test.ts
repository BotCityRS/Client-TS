import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
    addAccount,
    decryptPassword,
    encryptPassword,
    getSelectedId,
    loadAccounts,
    removeAccount,
    setSelectedId
} from '../BotAccountsStore.js';

type StorageMock = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
};

function createLocalStorageMock(): StorageMock {
    const data = new Map<string, string>();
    return {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => {
            data.set(key, value);
        },
        removeItem: (key) => {
            data.delete(key);
        },
        clear: () => {
            data.clear();
        }
    };
}

describe('BotAccountsStore', () => {
    let storage: StorageMock;

    beforeEach(() => {
        storage = createLocalStorageMock();
        (globalThis as { localStorage: StorageMock }).localStorage = storage;
    });

    afterEach(() => {
        storage.clear();
    });

    test('encryptPassword round-trips via decryptPassword', async () => {
        const plain = 'hunter2';
        const { iv, ciphertext } = await encryptPassword(plain);
        const password = await decryptPassword({ id: 'x', username: 'u', iv, ciphertext });
        expect(password).toBe(plain);
    });

    test('addAccount persists and rejects duplicate usernames', async () => {
        const first = await addAccount('Alice', 'pass1');
        expect(first.ok).toBe(true);
        if (!first.ok) {
            return;
        }

        const accounts = loadAccounts();
        expect(accounts).toHaveLength(1);
        expect(accounts[0]?.username).toBe('Alice');

        const dup = await addAccount('alice', 'pass2');
        expect(dup.ok).toBe(false);
        if (dup.ok) {
            return;
        }
        expect(dup.error).toContain('already exists');
    });

    test('removeAccount deletes entry and clears stale selection', async () => {
        const added = await addAccount('Bob', 'secret');
        expect(added.ok).toBe(true);
        if (!added.ok) {
            return;
        }

        setSelectedId(added.account.id);
        expect(getSelectedId()).toBe(added.account.id);

        const removed = removeAccount(added.account.id);
        expect(removed).toBe(true);
        expect(loadAccounts()).toHaveLength(0);
        expect(getSelectedId()).toBeNull();
    });

    test('setSelectedId persists selected account id', () => {
        setSelectedId('account-123');
        expect(getSelectedId()).toBe('account-123');
        setSelectedId(null);
        expect(getSelectedId()).toBeNull();
    });
});
