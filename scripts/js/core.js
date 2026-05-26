export const MODULE_ID = "dchat";

export class MessageClassifier {
    static TABS = {
        CHAT: "chat",
        GAME: "game",
        WHISPER: "whisper",
    };

    // Classifies a chat message by tab type.
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

// Checks if a value is a DOM element.
function isElement(value) {
    return !!value && typeof value === "object" && value.nodeType === 1 && typeof value.querySelector === "function";
}

// Converts Foundry HTML wrappers to an element.
export function getElement(html) {
    if (!html) return null;
    if (isElement(html)) return html;
    if (isElement(html[0])) return html[0];
    return null;
}

// Gets the chat section from rendered HTML.
export function getChatSection(html) {
    const element = getElement(html);
    if (!element) return null;
    if (element.matches?.("#chat, [data-tab='chat']")) return element;
    return element.querySelector("#chat, [data-tab='chat']");
}

const cleanupEntries = new WeakMap();
const messageElements = new Map();

// Checks if hook debug logging is enabled.
export function isHookDebugEnabled() {
    return !!globalThis.CONFIG?.debug?.hooks;
}

// Creates an abort controller for an element.
export function createAbortController(element) {
    const AbortControllerCtor = element?.ownerDocument?.defaultView?.AbortController ?? globalThis.AbortController;
    return new AbortControllerCtor();
}

// Gets cleanup state for an element.
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

// Gets connected elements for a message.
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

// Tracks an element for a chat message.
export function rememberMessageElement(message, html) {
    const element = getElement(html);
    const messageId = message?.id ?? message;
    if (!element || !messageId) return element;

    const tracked = getTrackedMessageElements(messageId) ?? new Set();
    tracked.add(element);
    messageElements.set(messageId, tracked);

    return element;
}

// Gets the cleanup controller for an element.
export function getController(element) {
    return getCleanupEntry(element).abortController;
}

// Aborts cleanup state for an element.
export function abortController(element) {
    const entry = cleanupEntries.get(element);
    if (entry) {
        entry.abortController.abort();
        cleanupEntries.delete(element);
    }
}

// Registers cleanup for an element.
export function registerCleanup(element, cleanupFn) {
    const entry = getCleanupEntry(element);
    entry.cleanups.push(cleanupFn);

    return entry.abortController.signal;
}

// Executes registered cleanup for an element.
export function executeCleanup(element) {
    const entry = cleanupEntries.get(element);
    if (!entry) return;

    entry.abortController.abort();

    for (const cleanupFn of entry.cleanups) {
        try {
            cleanupFn();
        } catch (err) {
            if (isHookDebugEnabled()) {
                console.error("DCHAT: Cleanup error:", err);
            }
        }
    }

    cleanupEntries.delete(element);
}

// Registers cleanup for deleted messages.
export function registerMessageCleanupHook() {
    Hooks.on("deleteChatMessage", (message) => {
        const tracked = getTrackedMessageElements(message.id);
        if (!tracked) return;

        for (const messageEl of tracked) {
            executeCleanup(messageEl);
        }

        messageElements.delete(message.id);
    });
}
