
export default class Timer {
    private static systemTimer: Timer;

    static TIMER_LOGGING_IN = 'TIMER_LOGGING_IN';
    static TIMER_LOGIN_WAIT = 'TIMER_LOGIN_WAIT';
    static TIMER_SETUP_ACCOUNT_ON_LOGIN = 'TIMER_SETUP_ACCOUNT_ON_LOGIN';

    timers: number[];
    timerNames: string[];

    constructor() {
        this.timers = [];
        this.timerNames = [];
    }


    static SystemTimer() {
        if (this.systemTimer) {
            throw 'There should not be a system timer already. Do not create another.'
        }
        this.systemTimer = new Timer();

        this.systemTimer.defineTimer('TIMER_LOGGING_IN', 0);
        this.systemTimer.defineTimer('TIMER_LOGIN_WAIT', 1);
        this.systemTimer.defineTimer('TIMER_SETUP_ACCOUNT_ON_LOGIN', 2);

        return this.systemTimer;
    }

    defineTimer(name: string, id: number) {
        if (this.timerNames[id]) {
            throw 'Timer already exists as ' + this.timerNames[id];
        }
        this.timerNames[id] = name;
    }

    isTimerDefined(id: number) {
        return this.timerNames[id];
    }

    setTimer(id: number, ms: number) {
        if (!this.isTimerDefined(id)) {
            throw 'Undefined timer ID ' + id;
        }
        this.timers[id] = new Date().getTime() + ms;
    }

    hasTimer(id: number) {
        if (!this.isTimerDefined(id)) {
            throw 'Undefined timer ID ' + id;
        }
        const now = new Date().getTime();
        return (this.timers[id] || 0) > now;
    }
    
    clearTimer(id: number) {
        if (!this.isTimerDefined(id)) {
            throw 'Undefined timer ID ' + id;
        }
        return this.timers[id] = 0;
    }
    
}