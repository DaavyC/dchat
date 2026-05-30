import { CLEANER_CHAT_CLASSES, CLEANER_CHAT_SELECTORS } from "../config.js";
import { getElement, registerCleanup } from "../utils.js";

export class CleanerChat {
    static processMessage(message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement) return;

        messageElement.querySelectorAll(CLEANER_CHAT_SELECTORS.AVATARS).forEach(avatarElement => avatarElement.style.display = "none");
        messageElement.querySelectorAll(CLEANER_CHAT_SELECTORS.USERS).forEach(userElement => userElement.style.display = "none");
    }
}

export class CollapsibleFormula {
    static processMessage(message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement) return;

        const signal = registerCleanup(messageElement, () => {
            messageElement.querySelectorAll(CLEANER_CHAT_SELECTORS.ROLL_TITLE).forEach(title => {
                title.style.cursor = "";
                title.style.userSelect = "";
                title.onclick = null;
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

export class CompactChat {
}
