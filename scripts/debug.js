export function isHookDebugEnabled() {
    return !!globalThis.CONFIG?.debug?.hooks;
}

export function log(...args) {
    if (isHookDebugEnabled()) console.log("DCHAT:", ...args);
}

export function warn(...args) {
    console.warn("DCHAT:", ...args);
}

export function error(...args) {
    console.error("DCHAT:", ...args);
}
