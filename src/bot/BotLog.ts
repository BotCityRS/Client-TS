export type BotLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export type BotLogFn = (level: BotLogLevel, source: string, message: string, detail?: unknown) => void;
