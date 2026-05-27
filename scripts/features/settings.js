import { MODULE_ID } from "../core.js";

// Registers a client boolean setting.
export function registerBooleanSetting(key, options) {
    game.settings.register(MODULE_ID, key, {
        scope: "client",
        config: true,
        default: false,
        type: Boolean,
        ...options
    });
}

// Checks if a module setting is enabled.
export function isSettingEnabled(key) {
    return game.settings.get(MODULE_ID, key);
}

// Gets Foundry utility helpers.
export function getFoundryUtils() {
    return globalThis.foundry?.utils ?? {};
}

// Reads a nested object path.
export function getProperty(source, path) {
    const foundryGetProperty = getFoundryUtils().getProperty;
    if (typeof foundryGetProperty === "function") return foundryGetProperty(source, path);

    return path.split(".").reduce((value, key) => value?.[key], source);
}

// Expands flattened object data.
export function expandObject(data) {
    const foundryExpandObject = getFoundryUtils().expandObject;
    return typeof foundryExpandObject === "function" ? foundryExpandObject(data) : data;
}

// Creates a Foundry compatible random id.
export function randomId() {
    const foundryRandomId = getFoundryUtils().randomID;
    return typeof foundryRandomId === "function" ? foundryRandomId() : Math.random().toString(36).slice(2);
}

// Removes attributes from an element.
export function removeAttributes(element, ...attributes) {
    attributes.forEach(attribute => element?.removeAttribute(attribute));
}
