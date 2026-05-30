import { error, isHookDebugEnabled } from "./debug.js";
import { CHAT_SELECTORS, MESSAGE_TYPES } from "./config.js";

export class MessageClassifier {
    static TABS = MESSAGE_TYPES;

    static classify(message = {}) {
        const flags = message.flags?.pf2e ?? {};

        const isSystem = !!(flags.context || flags.origin || flags.item);
        const isDiceRoll = message.isRoll || (message.rolls?.length > 0);
        const isPf2eDamage = !!(flags.appliedDamage || flags.damageRoll?.outcomes);
        const isDamageReaction = /damage-(taken|received)/.test(message.flavor || "") ||
            flags.context?.type === "damage-taken";

        if (isSystem || isDiceRoll || isPf2eDamage || isDamageReaction) {
            return this.TABS.GAME;
        }

        if (message.whisper?.length > 0 || message.blind) {
            return this.TABS.WHISPER;
        }

        return this.TABS.CHAT;
    }
}

function isElement(candidateElement) {
    return !!candidateElement
        && typeof candidateElement === "object"
        && candidateElement.nodeType === 1
        && typeof candidateElement.querySelector === "function";
}

export function getElement(renderedHtml) {
    if (!renderedHtml) return null;
    if (isElement(renderedHtml)) return renderedHtml;
    if (isElement(renderedHtml[0])) return renderedHtml[0];
    return null;
}

export function getDocument(element = null) {
    return element?.ownerDocument ?? globalThis.document;
}

export function isCurrentUserAuthor(message) {
    return message?.author?.id === game.user?.id;
}

export function getChatSection(renderedHtml) {
    const element = getElement(renderedHtml);
    if (!element) return null;
    if (element.matches?.(CHAT_SELECTORS.SECTION)) return element;
    return element.querySelector(CHAT_SELECTORS.SECTION);
}

export function getFoundryUtils() {
    return globalThis.foundry?.utils ?? {};
}

export function getProperty(sourceObject, path) {
    const foundryGetProperty = getFoundryUtils().getProperty;
    if (typeof foundryGetProperty === "function") return foundryGetProperty(sourceObject, path);

    return path.split(".").reduce((currentValue, key) => currentValue?.[key], sourceObject);
}

export function expandObject(flattenedData) {
    const foundryExpandObject = getFoundryUtils().expandObject;
    return typeof foundryExpandObject === "function" ? foundryExpandObject(flattenedData) : flattenedData;
}

export function randomId() {
    const foundryRandomId = getFoundryUtils().randomID;
    return typeof foundryRandomId === "function" ? foundryRandomId() : Math.random().toString(36).slice(2);
}

export function removeAttributes(element, ...attributes) {
    attributes.forEach(attribute => element?.removeAttribute(attribute));
}

const cleanupEntries = new WeakMap();
const messageElements = new Map();

export function createAbortController(element) {
    const AbortControllerCtor = element?.ownerDocument?.defaultView?.AbortController ?? globalThis.AbortController;
    return new AbortControllerCtor();
}

function getCleanupEntry(element) {
    let entry = cleanupEntries.get(element);
    if (!entry) {
        entry = {
            abortController: createAbortController(element),
            cleanups: []
        };
        cleanupEntries.set(element, entry);
    }
    return entry;
}

function getTrackedMessageElements(messageId) {
    const tracked = messageElements.get(messageId);
    if (!tracked) return null;

    for (const element of Array.from(tracked)) {
        if (!element?.isConnected) tracked.delete(element);
    }

    if (!tracked.size) {
        messageElements.delete(messageId);
        return null;
    }

    return tracked;
}

export function rememberMessageElement(message, renderedHtml) {
    const element = getElement(renderedHtml);
    const messageId = message?.id ?? message;
    if (!element || !messageId) return element;

    const tracked = getTrackedMessageElements(messageId) ?? new Set();
    tracked.add(element);
    messageElements.set(messageId, tracked);

    return element;
}

export function getController(element) {
    return getCleanupEntry(element).abortController;
}

export function abortController(element) {
    const entry = cleanupEntries.get(element);
    if (entry) {
        entry.abortController.abort();
        cleanupEntries.delete(element);
    }
}

export function registerCleanup(element, cleanupFn) {
    const entry = getCleanupEntry(element);
    entry.cleanups.push(cleanupFn);

    return entry.abortController.signal;
}

export function executeCleanup(element) {
    const entry = cleanupEntries.get(element);
    if (!entry) return;

    entry.abortController.abort();

    for (const cleanupFn of entry.cleanups) {
        try {
            cleanupFn();
        } catch (errorValue) {
            if (isHookDebugEnabled()) {
                error("Cleanup error:", errorValue);
            }
        }
    }

    cleanupEntries.delete(element);
}

export function cleanupDeletedMessage(message) {
    const tracked = getTrackedMessageElements(message.id);
    if (!tracked) return;

    for (const messageElement of tracked) {
        executeCleanup(messageElement);
    }

    messageElements.delete(message.id);
}
