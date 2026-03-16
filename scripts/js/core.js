// ——— Classifier ———

export class MessageClassifier {
    static TABS = {
        CHAT: "chat",
        GAME: "game",
        WHISPER: "whisper",
    };

    static classify(message) {
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

// ——— DOM Utilities ———

export function getElement(html) {
    if (!html) return null;
    if (html instanceof HTMLElement) return html;
    if (Array.isArray(html) && html[0] instanceof HTMLElement) return html[0];
    if (html[0] instanceof HTMLElement) return html[0];
    return null;
}

// ——— Cleanup Utilities ———

const elementControllers = new WeakMap();

export function getController(element) {
    if (!elementControllers.has(element)) {
        elementControllers.set(element, new AbortController());
    }
    return elementControllers.get(element);
}

export function abortController(element) {
    const controller = elementControllers.get(element);
    if (controller) {
        controller.abort();
        elementControllers.delete(element);
    }
}

export function registerCleanup(element, cleanupFn) {
    if (!elementControllers.has(element)) {
        elementControllers.set(element, {
            abortController: new AbortController(),
            cleanups: []
        });
    }

    const entry = elementControllers.get(element);
    entry.cleanups.push(cleanupFn);

    return entry.abortController.signal;
}

export function executeCleanup(element) {
    const entry = elementControllers.get(element);
    if (!entry) return;

    entry.abortController.abort();

    for (const cleanupFn of entry.cleanups) {
        try {
            cleanupFn();
        } catch (err) {
            if (CONFIG?.debug?.hooks) {
                console.error("DCHAT: Cleanup error:", err);
            }
        }
    }

    elementControllers.delete(element);
}

export function registerMessageCleanupHook() {
    Hooks.on("deleteChatMessage", (message, options, userId) => {
        const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
        if (messageEl) {
            executeCleanup(messageEl);
        }
    });
}
