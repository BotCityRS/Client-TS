import type { BotLogFn } from '../BotLog.js';

export function formatDetail(detail: unknown): string {
    if (detail === undefined || detail === null) {
        return '';
    }
    try {
        if (typeof detail === 'string') {
            return detail;
        }
        return JSON.stringify(detail);
    } catch {
        return String(detail);
    }
}

export function stackTail(maxFrames = 2): string {
    const stack = new Error().stack;
    if (!stack) {
        return '';
    }
    const lines = stack
        .split('\n')
        .slice(2, 2 + maxFrames)
        .map(l => l.trim())
        .filter(Boolean);
    return lines.join(' | ');
}

/** When `ok` is false, emit WARN to the bot log (soft assert; never throws). */
export function assertApi(ok: boolean, log: BotLogFn | undefined, source: string, message: string, detail?: unknown, includeStack = true): void {
    if (ok || !log) {
        return;
    }
    const tail = includeStack ? stackTail() : '';
    const suffix = tail ? ` | at: ${tail}` : '';
    log('WARN', source, message + suffix, detail);
}
