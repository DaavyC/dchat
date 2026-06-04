import { MODULE_ID, SETTING_KEYS } from "./config.js";

export function log(...args) {
    if (isDebugEnabled()) console.log("Daavy's Chat:", ...args);
}

export function error(...args) {
    console.error("Daavy's Chat:", ...args);
}

export function isDebugEnabled() {
    if (!globalThis.game?.settings) return false;
    return game.settings.get(MODULE_ID, SETTING_KEYS.DEBUG) === true;
}
