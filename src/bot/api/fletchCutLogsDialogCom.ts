/** Normal logs (`obj.pack` id). */
export const ID_LOGS = 1511;

/**
 * `IF_BUTTON` component ids for knife-on-logs fletch dialogs (`interface.pack`).
 * Resume buttons from `if_addresumebutton` in `chat.rs2` — not the model slots.
 */
export const MULTIOBJ3_CLOSE_SHAFT = 2800; // multiobj3_close:com_1
export const MULTIOBJ3_CLOSE_SHORT = 2801; // multiobj3_close:com_2
export const MULTIOBJ3_CLOSE_LONG = 2802; // multiobj3_close:com_3
export const MULTIOBJ2_SHORT = 144; // multiobj2:objtext1
export const MULTIOBJ2_LONG = 145; // multiobj2:objtext2

export function pickFletchKnifeDialogCom(
    logId: number,
    cutShafts: boolean,
    cutShortbow: boolean,
    cutLongbow: boolean
): number | null {
    if (logId === ID_LOGS) {
        if (cutShafts) {
            return MULTIOBJ3_CLOSE_SHAFT;
        }
        if (cutShortbow) {
            return MULTIOBJ3_CLOSE_SHORT;
        }
        if (cutLongbow) {
            return MULTIOBJ3_CLOSE_LONG;
        }
        return null;
    }
    if (cutShortbow) {
        return MULTIOBJ2_SHORT;
    }
    if (cutLongbow) {
        return MULTIOBJ2_LONG;
    }
    return null;
}
