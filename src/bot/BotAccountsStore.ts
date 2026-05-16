export type BotStoredAccount = {
    id: string;
    username: string;
    iv: string;
    ciphertext: string;
};

const ACCOUNTS_KEY = 'bot_accounts';
const SELECTED_KEY = 'bot_accounts_selected';
const CRYPTO_KEY_KEY = 'bot_accounts_crypto_key';

const MAX_USERNAME_LEN = 12;
const MAX_PASSWORD_LEN = 20;

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function getOrCreateCryptoKey(): Promise<CryptoKey> {
    const raw = localStorage.getItem(CRYPTO_KEY_KEY);
    if (raw) {
        const keyBytes = base64ToBytes(raw);
        return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    }

    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const exported = new Uint8Array(await crypto.subtle.exportKey('raw', key));
    localStorage.setItem(CRYPTO_KEY_KEY, bytesToBase64(exported));
    return key;
}

export function clampUsername(username: string): string {
    return username.trim().substring(0, MAX_USERNAME_LEN);
}

export function clampPassword(password: string): string {
    return password.substring(0, MAX_PASSWORD_LEN);
}

export function loadAccounts(): BotStoredAccount[] {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) {
        return [];
    }
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.filter(
            (entry): entry is BotStoredAccount =>
                typeof entry === 'object' &&
                entry !== null &&
                typeof (entry as BotStoredAccount).id === 'string' &&
                typeof (entry as BotStoredAccount).username === 'string' &&
                typeof (entry as BotStoredAccount).iv === 'string' &&
                typeof (entry as BotStoredAccount).ciphertext === 'string'
        );
    } catch {
        return [];
    }
}

export function saveAccounts(accounts: BotStoredAccount[]): void {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getSelectedId(): string | null {
    return localStorage.getItem(SELECTED_KEY);
}

export function setSelectedId(id: string | null): void {
    if (id === null) {
        localStorage.removeItem(SELECTED_KEY);
    } else {
        localStorage.setItem(SELECTED_KEY, id);
    }
}

export async function encryptPassword(password: string): Promise<{ iv: string; ciphertext: string }> {
    const key = await getOrCreateCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(clampPassword(password));
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return {
        iv: bytesToBase64(iv),
        ciphertext: bytesToBase64(new Uint8Array(cipherBuf))
    };
}

export async function decryptPassword(account: BotStoredAccount): Promise<string> {
    const key = await getOrCreateCryptoKey();
    const iv = base64ToBytes(account.iv);
    const ciphertext = base64ToBytes(account.ciphertext);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(plainBuf);
}

export type AddAccountResult = { ok: true; account: BotStoredAccount } | { ok: false; error: string };

export async function addAccount(username: string, password: string): Promise<AddAccountResult> {
    const trimmedUser = clampUsername(username);
    const trimmedPass = password.trim();

    if (!trimmedUser) {
        return { ok: false, error: 'Username is required.' };
    }
    if (!trimmedPass) {
        return { ok: false, error: 'Password is required.' };
    }

    const accounts = loadAccounts();
    const lower = trimmedUser.toLowerCase();
    if (accounts.some(a => a.username.toLowerCase() === lower)) {
        return { ok: false, error: 'An account with this username already exists.' };
    }

    const { iv, ciphertext } = await encryptPassword(trimmedPass);
    const account: BotStoredAccount = {
        id: crypto.randomUUID(),
        username: trimmedUser,
        iv,
        ciphertext
    };
    accounts.push(account);
    saveAccounts(accounts);
    return { ok: true, account };
}

export function removeAccount(id: string): boolean {
    const accounts = loadAccounts();
    const next = accounts.filter(a => a.id !== id);
    if (next.length === accounts.length) {
        return false;
    }
    saveAccounts(next);
    if (getSelectedId() === id) {
        setSelectedId(null);
    }
    return true;
}

export function findAccountById(id: string): BotStoredAccount | undefined {
    return loadAccounts().find(a => a.id === id);
}
