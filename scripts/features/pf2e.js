import {
    PF2E_CLASSES,
    PF2E_DATA,
    PF2E_TRAITS_TO_HIDE,
    PF2E_VISIBLE_TRAIT_LIMIT
} from "../constants.js";
import { getDocument, isCurrentUserAuthor } from "../utils.js";

export class TraitFilter {
    static processMessage(_message, messageElement) {
        const traitTags = messageElement.querySelectorAll('.tags .tag:is([data-trait], [data-slug]):not(.tag_transparent)[data-tooltip]');
        for (const tag of traitTags) {
            const tooltip = tag.dataset.tooltip;
            if (!tooltip) continue;

            const tooltipLower = tooltip.toLowerCase();
            const shouldHide = PF2E_TRAITS_TO_HIDE.some(trait => tooltipLower.endsWith(trait));

            if (shouldHide) {
                tag.classList.add(PF2E_CLASSES.FILTERED_TRAIT);
            }
        }

        this._applyTraitLimit(messageElement);
    }

    static _applyTraitLimit(messageElement) {
        messageElement.querySelectorAll(".tags").forEach(container => {
            if (container.dataset[PF2E_DATA.TRAITS_LIMITED]) return;
            container.dataset[PF2E_DATA.TRAITS_LIMITED] = "true";

            const visibleTraitTags = container.querySelectorAll(`span.tag:is([data-trait], [data-slug]):not(.tag_transparent):not(.${PF2E_CLASSES.FILTERED_TRAIT})`);

            if (visibleTraitTags.length <= PF2E_VISIBLE_TRAIT_LIMIT) return;

            visibleTraitTags.forEach((tag, index) => {
                tag.classList.add(PF2E_CLASSES.CLICKABLE_TRAIT);
                if (index >= PF2E_VISIBLE_TRAIT_LIMIT) tag.classList.add("daavy-chat-hidden");
            });

            container.addEventListener("click", (event) => {
                const clickableTag = event.target.closest("span.tag.daavy-chat-clickable");
                if (!clickableTag || clickableTag.classList.contains(PF2E_CLASSES.FILTERED_TRAIT)) return;

                event.preventDefault();
                event.stopPropagation();
                container.classList.toggle("daavy-chat-expanded");
            }, { capture: true });
        });
    }
}

export class HideDamageButtons {
    static processMessage(message, messageElement) {
        if (messageElement.dataset[PF2E_DATA.DAMAGE_BUTTONS_PROCESSED]) return;

        const damageButtons = messageElement.querySelectorAll("button.success[data-action='strike-damage'], button.critical-success[data-action='strike-damage']");
        if (!damageButtons.length) return;
        messageElement.dataset[PF2E_DATA.DAMAGE_BUTTONS_PROCESSED] = "true";

        const messageMetadata = messageElement.querySelector(".message-metadata");
        const canToggle = isCurrentUserAuthor(message) || !!game.user?.isGM;
        this._setButtonsHidden(damageButtons, true);

        damageButtons.forEach(button => {
            button.addEventListener("click", () => {
                this._setButtonsHidden(damageButtons, true);
                const toggleIcon = messageElement.querySelector(`.${PF2E_CLASSES.TOGGLE_DAMAGE_BUTTONS}`);
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
        icon.className = areButtonsHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        toggleIcon.replaceChildren(icon);
        toggleIcon.title = areButtonsHidden
            ? game.i18n.localize("daavy-chat.HideDamageButtons.Show")
            : game.i18n.localize("daavy-chat.HideDamageButtons.Hide");
    }

    static _addVisibilityToggle(messageMetadata, damageButtons) {
        if (messageMetadata.querySelector(`.${PF2E_CLASSES.TOGGLE_DAMAGE_BUTTONS}`)) return;

        const documentRef = getDocument(messageMetadata);
        const toggleIcon = documentRef.createElement("a");
        toggleIcon.className = PF2E_CLASSES.TOGGLE_DAMAGE_BUTTONS;
        toggleIcon.setAttribute("aria-label", game.i18n.localize("daavy-chat.HideDamageButtons.ToggleLabel"));

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

        const deleteButton = messageMetadata.querySelector(".message-delete");
        messageMetadata.insertBefore(toggleIcon, deleteButton?.nextSibling ?? null);
    }
}
