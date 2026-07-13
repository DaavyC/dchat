import { PF2E_TRAITS_TO_HIDE } from "../config.js";
import { getDocument, getElement, isCurrentUserAuthor } from "../utils.js";

const PF2E_SELECTORS = {
    TRAIT_TAGS: '.tags .tag:is([data-trait], [data-slug]):not(.tag_transparent)[data-tooltip]',
    TRAIT_CONTAINERS: ".tags",
    VISIBLE_TRAIT_TAGS: "span.tag:is([data-trait], [data-slug]):not(.tag_transparent)",
    CLICKABLE_TRAIT_TAG: "span.tag.daavy-chat-clickable",
    DAMAGE_BUTTONS: "button.success[data-action='strike-damage'], button.critical-success[data-action='strike-damage']",
    MESSAGE_METADATA: ".message-metadata",
    MESSAGE_DELETE: ".message-delete",
    TOGGLE_DAMAGE_BUTTONS: ".daavy-chat-toggle-buttons"
};

const PF2E_CLASSES = {
    FILTERED_TRAIT: "daavy-chat-filtered",
    CLICKABLE_TRAIT: "daavy-chat-clickable",
    HIDDEN_TRAIT: "daavy-chat-hidden",
    EXPANDED_TRAITS: "daavy-chat-expanded",
    HIDDEN_DAMAGE_BUTTONS: "daavy-chat-buttons-hidden",
    TOGGLE_DAMAGE_BUTTONS: "daavy-chat-toggle-buttons"
};

const PF2E_DATA = {
    TRAITS_LIMITED: "daavyChatLimited",
    DAMAGE_BUTTONS_PROCESSED: "daavyChatButtonsProcessed"
};

const VISIBLE_TRAIT_LIMIT = 3;

const PF2E_I18N = {
    SHOW_DAMAGE_BUTTONS: "daavy-chat.HideDamageButtons.Show",
    HIDE_DAMAGE_BUTTONS: "daavy-chat.HideDamageButtons.Hide",
    TOGGLE_DAMAGE_BUTTONS: "daavy-chat.HideDamageButtons.ToggleLabel"
};

const PF2E_ICONS = {
    DAMAGE_BUTTONS_HIDDEN: "fa-solid fa-eye-slash",
    DAMAGE_BUTTONS_VISIBLE: "fa-solid fa-eye"
};

export class TraitFilter {
    static processMessage(_message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement) return;

        const traitTags = messageElement.querySelectorAll(PF2E_SELECTORS.TRAIT_TAGS);
        for (const tag of traitTags) {
            const tooltip = tag.dataset.tooltip;
            if (!tooltip) continue;

            const tooltipLower = tooltip.toLowerCase();
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

            if (visibleTraitTags.length <= VISIBLE_TRAIT_LIMIT) return;

            visibleTraitTags.forEach((tag, index) => {
                tag.classList.add(PF2E_CLASSES.CLICKABLE_TRAIT);
                if (index >= VISIBLE_TRAIT_LIMIT) tag.classList.add(PF2E_CLASSES.HIDDEN_TRAIT);
            });

            container.addEventListener("click", (event) => {
                const clickableTag = event.target.closest(PF2E_SELECTORS.CLICKABLE_TRAIT_TAG);
                if (!clickableTag || clickableTag.classList.contains(PF2E_CLASSES.FILTERED_TRAIT)) return;

                event.preventDefault();
                event.stopPropagation();
                container.classList.toggle(PF2E_CLASSES.EXPANDED_TRAITS);
            }, { capture: true });
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

        damageButtons.forEach(button => {
            button.addEventListener("click", () => {
                this._setButtonsHidden(damageButtons, true);
                const toggleIcon = messageElement.querySelector(PF2E_SELECTORS.TOGGLE_DAMAGE_BUTTONS);
                if (toggleIcon) this._setToggleIcon(toggleIcon, true);
            });
        });

        if (canToggle && messageMetadata) this._addVisibilityToggle(messageMetadata, damageButtons);
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

    static _addVisibilityToggle(messageMetadata, damageButtons) {
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
        });

        const deleteButton = messageMetadata.querySelector(PF2E_SELECTORS.MESSAGE_DELETE);
        if (deleteButton) {
            messageMetadata.insertBefore(toggleIcon, deleteButton.nextSibling);
        } else {
            messageMetadata.appendChild(toggleIcon);
        }
    }
}
