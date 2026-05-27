import { getElement } from "../core.js";
import { registerBooleanSetting } from "./settings.js";

export class CleanerChat {
    static SELECTORS = {
        AVATARS: "header img, .message-header img, .message-portrait, [class*='portrait']",
        USERS: "header span.user, .message-header span.user"
    };

    // Registers the cleaner chat setting.
    static init() {
        registerBooleanSetting("cleanerChat", {
            name: "DCHAT.Settings.cleanerChat.Name",
            hint: "DCHAT.Settings.cleanerChat.Hint"
        });
    }

    // Hides chat avatars and user labels.
    static processMessage(message, html) {
        const el = getElement(html);
        if (!el) return;

        el.querySelectorAll(this.SELECTORS.AVATARS).forEach(t => t.style.display = "none");
        el.querySelectorAll(this.SELECTORS.USERS).forEach(t => t.style.display = "none");
    }
}
