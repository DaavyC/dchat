import { getDocument, getElement, isCurrentUserAuthor, registerCleanup } from "../core.js";
import { registerBooleanSetting } from "./settings.js";

export class HideDamageButtons {
    static DAMAGE_BUTTON_SELECTOR = "button.success[data-action='strike-damage'], button.critical-success[data-action='strike-damage']";
    static HIDDEN_CLASS = "dchat-buttons-hidden";
    static TOGGLE_SELECTOR = ".dchat-toggle-buttons";
    static TOGGLE_CLASS = "dchat-toggle-buttons";

    // Registers the damage button setting.
    static init() {
        registerBooleanSetting("hideDamageButtons", {
            name: "DCHAT.Settings.HideDamageButtons.Name",
            hint: "DCHAT.Settings.HideDamageButtons.Hint"
        });
    }

    // Hides damage buttons and adds the toggle.
    static processMessage(message, html) {
        const el = getElement(html);
        if (!el || el.dataset.dchatButtonsProcessed) return;
        el.dataset.dchatButtonsProcessed = "true";

        const damageButtons = el.querySelectorAll(this.DAMAGE_BUTTON_SELECTOR);
        if (!damageButtons.length) return;

        const metadata = el.querySelector(".message-metadata");
        const canToggle = isCurrentUserAuthor(message) || !!game.user?.isGM;
        this._setButtonsHidden(damageButtons, true);

        const signal = registerCleanup(el, () => {
            damageButtons.forEach(btn => {
                btn.onclick = null;
            });
        });

        damageButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                this._setButtonsHidden(damageButtons, true);
                const toggleIcon = el.querySelector(this.TOGGLE_SELECTOR);
                if (toggleIcon) this._setToggleIcon(toggleIcon, true);
            }, { signal });
        });

        if (canToggle && metadata) this.addToggleIcon(metadata, damageButtons, signal);
    }

    // Sets the hidden state for damage buttons.
    static _setButtonsHidden(buttons, hidden) {
        buttons.forEach(button => button.classList.toggle(this.HIDDEN_CLASS, hidden));
    }

    // Updates the toggle icon state.
    static _setToggleIcon(toggleIcon, hidden) {
        toggleIcon.innerHTML = hidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
        toggleIcon.title = hidden
            ? game.i18n.localize("DCHAT.HideDamageButtons.Show")
            : game.i18n.localize("DCHAT.HideDamageButtons.Hide");
    }

    // Adds the damage button toggle.
    static addToggleIcon(metadata, damageButtons, signal) {
        if (metadata.querySelector(this.TOGGLE_SELECTOR)) return;

        const doc = getDocument(metadata);
        const toggleIcon = doc.createElement("a");
        toggleIcon.className = this.TOGGLE_CLASS;
        toggleIcon.setAttribute("aria-label", game.i18n.localize("DCHAT.HideDamageButtons.ToggleLabel"));

        // Syncs the toggle icon with button visibility.
        const updateIcon = () => {
            const hidden = damageButtons[0]?.classList.contains(this.HIDDEN_CLASS);
            this._setToggleIcon(toggleIcon, hidden);
        };

        updateIcon();

        toggleIcon.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const hidden = damageButtons[0]?.classList.contains(this.HIDDEN_CLASS);
            this._setButtonsHidden(damageButtons, !hidden);
            updateIcon();
        }, { signal });

        const deleteBtn = metadata.querySelector(".message-delete");
        if (deleteBtn) {
            metadata.insertBefore(toggleIcon, deleteBtn.nextSibling);
        } else {
            metadata.appendChild(toggleIcon);
        }
    }
}
