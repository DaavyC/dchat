import { getElement } from "../core.js";
import { registerBooleanSetting } from "./settings.js";

export class HideDamageTraits {
    static SELECTORS = {
        TRAITS: '.flavor-text .tags[data-tooltip-class="pf2e"]',
        HR: ".flavor-text > hr:first-of-type"
    };

    // Registers the damage traits setting.
    static init() {
        registerBooleanSetting("hideDamageTraits", {
            name: "DCHAT.Settings.hideDamageTraits.Name",
            hint: "DCHAT.Settings.hideDamageTraits.Hint"
        });
    }

    // Hides PF2e damage trait details.
    static processMessage(message, html) {
        const el = getElement(html);
        if (!el || !el.querySelector(".damage-roll")) return;

        el.querySelectorAll(this.SELECTORS.TRAITS).forEach(trait => trait.style.display = "none");

        const hr = el.querySelector(this.SELECTORS.HR);
        if (hr) hr.style.display = "none";
    }
}
