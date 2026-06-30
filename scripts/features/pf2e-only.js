import { PF2E_CLASSES, PF2E_DATA, PF2E_I18N, PF2E_ICONS, PF2E_LIMITS, PF2E_SELECTORS, PF2E_TRAITS_TO_HIDE } from "../config.js";
import { getCleanupSignal, getDocument, getElement, isCurrentUserAuthor, registerCleanup } from "../utils.js";
import { log } from "../debug.js";

export class TraitFilter {
    static processMessage(_message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement) return;

        const traitTags = messageElement.querySelectorAll(PF2E_SELECTORS.TRAIT_TAGS);
        for (const tag of traitTags) {
            const tooltip = tag.dataset.tooltip;
            if (!tooltip) continue;

            const tooltipLower = tooltip.toLowerCase();
            log("TraitFilter: tooltip =", tooltip, "toLowerCase =", tooltipLower);
            const shouldHide = PF2E_TRAITS_TO_HIDE.some(trait => tooltipLower.endsWith(trait));

            if (shouldHide) {
                tag.style.display = "none";
                tag.classList.add(PF2E_CLASSES.FILTERED_TRAIT);
            }
        }

        this._applyTraitLimit(messageElement);
    }

    static _applyTraitLimit(messageElement) {
        messageElement.querySelectorAll(PF2E_SELECTORS.TRAIT_CONTAINERS).forEach(container => {
            if (container.dataset[PF2E_DATA.TRAITS_LIMITED]) return;
            container.dataset[PF2E_DATA.TRAITS_LIMITED] = "true";

            const visibleTraitTags = Array.from(container.querySelectorAll(PF2E_SELECTORS.VISIBLE_TRAIT_TAGS))
                .filter(tag => !tag.classList.contains(PF2E_CLASSES.FILTERED_TRAIT));

            if (visibleTraitTags.length <= PF2E_LIMITS.VISIBLE_TRAITS) return;

            visibleTraitTags.forEach((tag, index) => {
                tag.classList.add(PF2E_CLASSES.CLICKABLE_TRAIT);
                if (index >= PF2E_LIMITS.VISIBLE_TRAITS) tag.classList.add(PF2E_CLASSES.HIDDEN_TRAIT);
            });

            const signal = registerCleanup(messageElement, () => {
                container.classList.remove(PF2E_CLASSES.EXPANDED_TRAITS);
            });

            container.addEventListener("click", (event) => {
                const clickableTag = event.target.closest(PF2E_SELECTORS.CLICKABLE_TRAIT_TAG);
                if (!clickableTag || clickableTag.classList.contains(PF2E_CLASSES.FILTERED_TRAIT)) return;

                event.preventDefault();
                event.stopPropagation();
                container.classList.toggle(PF2E_CLASSES.EXPANDED_TRAITS);
            }, { signal, capture: true });
        });
    }
}

export class HideDamageButtons {
    static processMessage(message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement || messageElement.dataset[PF2E_DATA.DAMAGE_BUTTONS_PROCESSED]) return;

        const damageButtons = messageElement.querySelectorAll(PF2E_SELECTORS.DAMAGE_BUTTONS);
        if (!damageButtons.length) return;
        messageElement.dataset[PF2E_DATA.DAMAGE_BUTTONS_PROCESSED] = "true";

        const messageMetadata = messageElement.querySelector(PF2E_SELECTORS.MESSAGE_METADATA);
        const canToggle = isCurrentUserAuthor(message) || !!game.user?.isGM;
        this._setButtonsHidden(damageButtons, true);

        const signal = getCleanupSignal(messageElement);

        damageButtons.forEach(button => {
            button.addEventListener("click", () => {
                this._setButtonsHidden(damageButtons, true);
                const toggleIcon = messageElement.querySelector(PF2E_SELECTORS.TOGGLE_DAMAGE_BUTTONS);
                if (toggleIcon) this._setToggleIcon(toggleIcon, true);
            }, { signal });
        });

        if (canToggle && messageMetadata) this._addVisibilityToggle(messageMetadata, damageButtons, signal);
    }

    static _setButtonsHidden(damageButtons, shouldHide) {
        damageButtons.forEach(button => button.classList.toggle(PF2E_CLASSES.HIDDEN_DAMAGE_BUTTONS, shouldHide));
    }

    static _setToggleIcon(toggleIcon, areButtonsHidden) {
        const documentRef = getDocument(toggleIcon);
        const icon = documentRef.createElement("i");
        icon.className = areButtonsHidden ? PF2E_ICONS.DAMAGE_BUTTONS_HIDDEN : PF2E_ICONS.DAMAGE_BUTTONS_VISIBLE;
        toggleIcon.replaceChildren(icon);
        toggleIcon.title = areButtonsHidden
            ? game.i18n.localize(PF2E_I18N.SHOW_DAMAGE_BUTTONS)
            : game.i18n.localize(PF2E_I18N.HIDE_DAMAGE_BUTTONS);
    }

    static _addVisibilityToggle(messageMetadata, damageButtons, signal) {
        if (messageMetadata.querySelector(PF2E_SELECTORS.TOGGLE_DAMAGE_BUTTONS)) return;

        const documentRef = getDocument(messageMetadata);
        const toggleIcon = documentRef.createElement("a");
        toggleIcon.className = PF2E_CLASSES.TOGGLE_DAMAGE_BUTTONS;
        toggleIcon.setAttribute("aria-label", game.i18n.localize(PF2E_I18N.TOGGLE_DAMAGE_BUTTONS));

        const updateIcon = () => {
            const areButtonsHidden = damageButtons[0]?.classList.contains(PF2E_CLASSES.HIDDEN_DAMAGE_BUTTONS);
            this._setToggleIcon(toggleIcon, areButtonsHidden);
        };

        updateIcon();

        toggleIcon.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const areButtonsHidden = damageButtons[0]?.classList.contains(PF2E_CLASSES.HIDDEN_DAMAGE_BUTTONS);
            this._setButtonsHidden(damageButtons, !areButtonsHidden);
            updateIcon();
        }, { signal });

        const deleteButton = messageMetadata.querySelector(PF2E_SELECTORS.MESSAGE_DELETE);
        if (deleteButton) {
            messageMetadata.insertBefore(toggleIcon, deleteButton.nextSibling);
        } else {
            messageMetadata.appendChild(toggleIcon);
        }
    }
}
