import { SETTING_KEYS } from "../config.js";
import { isSettingEnabled } from "../settings.js";
import { getElement } from "../utils.js";

const PROSE_MIRROR_SELECTOR = "prose-mirror[name='message']";
const HIDE_CHAT_FORMATTING_CLASS = "daavy-chat-hide-chat-formatting";
const SHOW_FORMULA_CLASS = "daavy-chat-show";
const ROLL_SELECTOR = ".dice-roll";
const ROLL_TITLE_SELECTOR = ".dice-roll h4";
const FORMULA_SELECTOR = ".dice-formula";

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
            .forEach(editor => editor.classList.toggle(HIDE_CHAT_FORMATTING_CLASS, shouldHideFormatting));
    }
}

function getRenderedElements(renderedRoot) {
    const rootElement = getElement(renderedRoot);
    if (rootElement) return [rootElement];
    return Object.values(renderedRoot ?? {}).map(getElement).filter(Boolean);
}

function findChatEditors(rootElement) {
    const editors = Array.from(rootElement.querySelectorAll(PROSE_MIRROR_SELECTOR));
    if (rootElement.matches?.(PROSE_MIRROR_SELECTOR)) editors.unshift(rootElement);
    return editors;
}

export class CollapsibleFormula {
    static processMessage(_message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement) return;

        messageElement.querySelectorAll(ROLL_SELECTOR).forEach(roll => {
            const title = roll.querySelector(ROLL_TITLE_SELECTOR);
            const formula = roll.querySelector(FORMULA_SELECTOR);
            if (title && formula) {
                title.addEventListener("click", (event) => {
                    event.stopPropagation();
                    formula.classList.toggle(SHOW_FORMULA_CLASS);
                });
            }
        });
    }
}
