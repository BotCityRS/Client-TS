import { describe, expect, test } from 'bun:test';
import {
    ID_LOGS,
    MULTIOBJ2_LONG,
    MULTIOBJ2_SHORT,
    MULTIOBJ3_CLOSE_LONG,
    MULTIOBJ3_CLOSE_SHAFT,
    MULTIOBJ3_CLOSE_SHORT,
    pickFletchKnifeDialogCom
} from '../api/fletchCutLogsDialogCom.js';

/** Magic logs — uses `multiobj2` (no arrow shafts). */
const ID_MAGIC_LOGS = 1513;

describe('pickFletchKnifeDialogCom', () => {
    test('normal logs use multiobj3_close resume components', () => {
        expect(pickFletchKnifeDialogCom(ID_LOGS, true, false, false)).toBe(MULTIOBJ3_CLOSE_SHAFT);
        expect(pickFletchKnifeDialogCom(ID_LOGS, false, true, false)).toBe(MULTIOBJ3_CLOSE_SHORT);
        expect(pickFletchKnifeDialogCom(ID_LOGS, false, false, true)).toBe(MULTIOBJ3_CLOSE_LONG);
    });

    test('magic logs use multiobj2 text resume components (not model slots 142/143)', () => {
        expect(pickFletchKnifeDialogCom(ID_MAGIC_LOGS, false, true, false)).toBe(MULTIOBJ2_SHORT);
        expect(pickFletchKnifeDialogCom(ID_MAGIC_LOGS, false, false, true)).toBe(MULTIOBJ2_LONG);
        expect(MULTIOBJ2_SHORT).toBe(144);
        expect(MULTIOBJ2_LONG).toBe(145);
    });
});
