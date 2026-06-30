import {
    CHAT_EDITOR_SELECTORS,
    CLEANER_CHAT_CLASSES,
    CLEANER_CHAT_SELECTORS,
    SETTING_KEYS
} from "../config.js";
import { isSettingEnabled } from "../settings.js";
import { getElement, registerCleanup } from "../utils.js";

export class HideChatFormatting {
    static _observers = new WeakMap();

    static onRenderChatInput(application, elements) {
        this.refresh(application?.element, elements);
    }

    static observe(renderedHtml) {
        const container = getElement(renderedHtml);
        if (!container) return;

        this.refresh(container);
        if (this._observers.has(container)) return;

        const observer = new MutationObserver(() => this.refresh(container));
        observer.observe(container, { childList: true, subtree: true });
        this._observers.set(container, observer);
    }

    static refresh(...renderedRoots) {
        const shouldHideFormatting = isSettingEnabled(SETTING_KEYS.HIDE_CHAT_FORMATTING);

        renderedRoots
            .flatMap(getRenderedElements)
            .flatMap(findChatEditors)
            .forEach(editor => editor.classList.toggle(CLEANER_CHAT_CLASSES.HIDE_CHAT_FORMATTING, shouldHideFormatting));
    }
}

function getRenderedElements(renderedRoot) {
    const rootElement = getElement(renderedRoot);
    if (rootElement) return [rootElement];
    return Object.values(renderedRoot ?? {}).map(getElement).filter(Boolean);
}

function findChatEditors(rootElement) {
    const editors = Array.from(rootElement.querySelectorAll(CHAT_EDITOR_SELECTORS.PROSE_MIRROR));
    if (rootElement.matches?.(CHAT_EDITOR_SELECTORS.PROSE_MIRROR)) editors.unshift(rootElement);
    return editors;
}

export class CollapsibleFormula {
    static processMessage(_message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement) return;

        const signal = registerCleanup(messageElement, () => {
            messageElement.querySelectorAll(CLEANER_CHAT_SELECTORS.ROLL_TITLE).forEach(title => {
                title.style.cursor = "";
                title.style.userSelect = "";
            });
        });

        messageElement.querySelectorAll(CLEANER_CHAT_SELECTORS.ROLL).forEach(roll => {
            const title = roll.querySelector(CLEANER_CHAT_SELECTORS.ROLL_TITLE);
            const formula = roll.querySelector(CLEANER_CHAT_SELECTORS.FORMULA);
            if (title && formula) {
                title.style.cursor = "pointer";
                title.style.userSelect = "none";
                title.addEventListener("click", (event) => {
                    event.stopPropagation();
                    formula.classList.toggle(CLEANER_CHAT_CLASSES.SHOW_FORMULA);
                }, { signal });
            }
        });
    }
}
