import { getElement, registerCleanup } from "../core.js";
import { registerBooleanSetting } from "./settings.js";

export class CollapsibleFormula {
    // Registers the collapsible formula setting.
    static init() {
        registerBooleanSetting("collapsibleFormula", {
            name: "DCHAT.Settings.CollapsibleFormula.Name",
            hint: "DCHAT.Settings.CollapsibleFormula.Hint"
        });
    }

    // Toggles dice formulas when roll titles are clicked.
    static processMessage(message, html) {
        const el = getElement(html);
        if (!el) return;

        const signal = registerCleanup(el, () => {
            el.querySelectorAll(".dice-roll h4").forEach(title => {
                title.style.cursor = "";
                title.style.userSelect = "";
                title.onclick = null;
            });
        });

        el.querySelectorAll(".dice-roll").forEach(roll => {
            const title = roll.querySelector("h4");
            const formula = roll.querySelector(".dice-formula");
            if (title && formula) {
                title.style.cursor = "pointer";
                title.style.userSelect = "none";
                title.addEventListener("click", (event) => {
                    event.stopPropagation();
                    formula.classList.toggle("dchat-show");
                }, { signal });
            }
        });
    }
}
