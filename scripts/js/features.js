import { getElement, registerCleanup } from "./core.js";
import { TRAITS_TO_HIDE } from "./data/traits.js";

// ——— Cleaner Chat ———
export class CleanerChat {
    static SELECTORS = {
        AVATARS: "header img, .message-header img, .message-portrait, [class*='portrait']",
        USERS: "header span.user, .message-header span.user"
    };

    static init() {
        game.settings.register("dchat", "cleanerChat", {
            name: "DCHAT.Settings.cleanerChat.Name",
            hint: "DCHAT.Settings.cleanerChat.Hint",
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
    }

    static processMessage(message, html) {
        const el = getElement(html);
        if (!el) return;

        el.querySelectorAll(this.SELECTORS.AVATARS).forEach(t => t.style.display = "none");
        el.querySelectorAll(this.SELECTORS.USERS).forEach(t => t.style.display = "none");
    }
}

// ——— Hide Damage Traits ———
export class HideDamageTraits {
    static SELECTORS = {
        TRAITS: '.flavor-text .tags[data-tooltip-class="pf2e"]',
        HR: '.flavor-text > hr:first-of-type'
    };

    static init() {
        game.settings.register("dchat", "hideDamageTraits", {
            name: "DCHAT.Settings.hideDamageTraits.Name",
            hint: "DCHAT.Settings.hideDamageTraits.Hint",
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
    }

    static processMessage(message, html) {
        const el = getElement(html);
        if (!el || !el.querySelector(".damage-roll")) return;

        el.querySelectorAll(this.SELECTORS.TRAITS).forEach(trait => trait.style.display = "none");

        const hr = el.querySelector(this.SELECTORS.HR);
        if (hr) hr.style.display = "none";
    }
}

// ——— Trait Filter ———
export class TraitFilter {
    static TRAITS_TO_HIDE = TRAITS_TO_HIDE;

    static init() {
        game.settings.register("dchat", "traitFilter", {
            name: "DCHAT.Settings.traitFilter.Name",
            hint: "DCHAT.Settings.traitFilter.Hint",
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
    }

    static processMessage(message, html) {
        const el = getElement(html);
        if (!el) return;

        const allTags = el.querySelectorAll('.tags .tag:is([data-trait], [data-slug]):not(.tag_transparent)[data-tooltip]');
        for (const tag of allTags) {
            const tooltip = tag.dataset.tooltip;
            if (!tooltip) continue;

            if (CONFIG?.debug?.hooks) {
                console.log("DCHAT TraitFilter: tooltip =", tooltip, "toLowerCase =", tooltip.toLowerCase());
            }

            const tooltipLower = tooltip.toLowerCase();

            let shouldHide = false;
            for (const trait of this.TRAITS_TO_HIDE) {
                if (tooltipLower.endsWith(trait)) {
                    shouldHide = true;
                    break;
                }
            }

            if (shouldHide) {
                tag.style.display = 'none';
                tag.classList.add('dchat-filtered');
            }
        }

        this.applyTraitLimit(el);
    }

    static applyTraitLimit(el) {
        el.querySelectorAll('.tags').forEach(container => {
            if (container.dataset.dchatLimited) return;
            container.dataset.dchatLimited = "true";

            const allTags = Array.from(container.querySelectorAll('span.tag:is([data-trait], [data-slug]):not(.tag_transparent)'))
                .filter(tag => !tag.classList.contains('dchat-filtered'));

            if (allTags.length <= 3) return;

            allTags.forEach((tag, index) => {
                tag.classList.add('dchat-clickable');
                if (index >= 3) tag.classList.add('dchat-hidden');
            });

            const signal = registerCleanup(el, () => {
                container.classList.remove('dchat-expanded');
            });

            container.addEventListener('click', (event) => {
                const clickableTag = event.target.closest('span.tag.dchat-clickable');
                if (!clickableTag || clickableTag.classList.contains('dchat-filtered')) return;

                event.preventDefault();
                event.stopPropagation();
                container.classList.toggle('dchat-expanded');
            }, { signal, capture: true });
        });
    }
}

// ——— Collapsible Formula ———
export class CollapsibleFormula {
    static init() {
        game.settings.register("dchat", "collapsibleFormula", {
            name: "DCHAT.Settings.CollapsibleFormula.Name",
            hint: "DCHAT.Settings.CollapsibleFormula.Hint",
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
    }

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

// ——— Compact Chat ——— 
export class CompactChat {
    static init() {
        game.settings.register("dchat", "compactChat", {
            name: "DCHAT.Settings.compactChat.Name",
            hint: "DCHAT.Settings.compactChat.Hint",
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
    }

    static processMessage(message, html) {
    }
}

// ——— Hide Damage Buttons ———
export class HideDamageButtons {
    static init() {
        game.settings.register("dchat", "hideDamageButtons", {
            name: "DCHAT.Settings.HideDamageButtons.Name",
            hint: "DCHAT.Settings.HideDamageButtons.Hint",
            scope: "client",
            config: true,
            default: false,
            type: Boolean
        });
    }

    static processMessage(message, html) {
        const el = getElement(html);
        if (!el || el.dataset.dchatButtonsProcessed) return;
        el.dataset.dchatButtonsProcessed = "true";

        const damageButtons = el.querySelectorAll("button.success[data-action='strike-damage'], button.critical-success[data-action='strike-damage']");
        if (!damageButtons.length) return;

        const metadata = el.querySelector(".message-metadata");
        const isAuthor = message.author?.id === game.user.id;
        const isGM = game.user.isGM;
        const canToggle = isAuthor || isGM;

        if (!isAuthor && !isGM) {
            damageButtons.forEach(btn => btn.classList.add('dchat-buttons-hidden'));
        }

        const signal = registerCleanup(el, () => {
            damageButtons.forEach(btn => {
                btn.onclick = null;
            });
        });

        damageButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                damageButtons.forEach(b => b.classList.add('dchat-buttons-hidden'));
                const toggleIcon = el.querySelector(".dchat-toggle-buttons");
                if (toggleIcon) {
                    toggleIcon.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
                    toggleIcon.title = game.i18n.localize("DCHAT.HideDamageButtons.Show");
                }
            }, { signal });
        });

        if (canToggle && metadata) this.addToggleIcon(metadata, damageButtons, signal);
    }

    static addToggleIcon(metadata, damageButtons, signal) {
        if (metadata.querySelector(".dchat-toggle-buttons")) return;

        const toggleIcon = document.createElement("a");
        toggleIcon.className = "dchat-toggle-buttons";
        toggleIcon.setAttribute('aria-label', game.i18n.localize("DCHAT.HideDamageButtons.ToggleLabel"));

        const updateIcon = () => {
            const hidden = damageButtons[0]?.classList.contains('dchat-buttons-hidden');
            toggleIcon.innerHTML = hidden ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
            toggleIcon.title = hidden
                ? game.i18n.localize("DCHAT.HideDamageButtons.Show")
                : game.i18n.localize("DCHAT.HideDamageButtons.Hide");
        };

        updateIcon();

        toggleIcon.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const hidden = damageButtons[0]?.classList.contains('dchat-buttons-hidden');
            damageButtons.forEach(btn => btn.classList.toggle('dchat-buttons-hidden', !hidden));
            updateIcon();
        }, { signal });

        const deleteBtn = metadata.querySelector('.message-delete');
        if (deleteBtn) {
            metadata.insertBefore(toggleIcon, deleteBtn.nextSibling);
        } else {
            metadata.appendChild(toggleIcon);
        }
    }
}
