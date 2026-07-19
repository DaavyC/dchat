import { CHAT_SELECTORS, MESSAGE_TYPES, MODULE_ID } from "./constants.js";

export function classifyMessage(message = {}) {
    const flags = message.flags?.pf2e ?? {};

    const isSystem = !!(flags.context || flags.origin || flags.item);
    const isDiceRoll = message.isRoll || (message.rolls?.length > 0);
    const isPf2eDamage = !!(flags.appliedDamage || flags.damageRoll?.outcomes);
    const isDamageReaction = /damage-(taken|received)/.test(message.flavor || "") ||
        flags.context?.type === "damage-taken";

    if (isSystem || isDiceRoll || isPf2eDamage || isDamageReaction) {
        return MESSAGE_TYPES.GAME;
    }

    if (message.whisper?.length > 0 || message.blind) {
        return MESSAGE_TYPES.WHISPER;
    }

    return MESSAGE_TYPES.CHAT;
}

export function isPinnedMessage(message = {}) {
    return message.getFlag?.(MODULE_ID, "pinned") === true || message.flags?.[MODULE_ID]?.pinned === true;
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

export function createAbortController(element) {
    const AbortControllerCtor = element?.ownerDocument?.defaultView?.AbortController ?? globalThis.AbortController;
    return new AbortControllerCtor();
}
