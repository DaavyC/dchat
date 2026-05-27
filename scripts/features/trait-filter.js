import { getElement, isHookDebugEnabled, registerCleanup } from "../core.js";
import { TRAITS_TO_HIDE } from "../data/traits.js";
import { registerBooleanSetting } from "./settings.js";

export class TraitFilter {
    static TRAITS_TO_HIDE = TRAITS_TO_HIDE;

    // Registers the trait filter setting.
    static init() {
        registerBooleanSetting("traitFilter", {
            name: "DCHAT.Settings.traitFilter.Name",
            hint: "DCHAT.Settings.traitFilter.Hint"
        });
    }

    // Filters hidden traits and limits visible tags.
    static processMessage(message, html) {
        const el = getElement(html);
        if (!el) return;

        const allTags = el.querySelectorAll('.tags .tag:is([data-trait], [data-slug]):not(.tag_transparent)[data-tooltip]');
        for (const tag of allTags) {
            const tooltip = tag.dataset.tooltip;
            if (!tooltip) continue;

            if (isHookDebugEnabled()) {
                console.log("DCHAT TraitFilter: tooltip =", tooltip, "toLowerCase =", tooltip.toLowerCase());
            }

            const tooltipLower = tooltip.toLowerCase();
            const shouldHide = this.TRAITS_TO_HIDE.some(trait => tooltipLower.endsWith(trait));

            if (shouldHide) {
                tag.style.display = "none";
                tag.classList.add("dchat-filtered");
            }
        }

        this.applyTraitLimit(el);
    }

    // Collapses long trait lists.
    static applyTraitLimit(el) {
        el.querySelectorAll(".tags").forEach(container => {
            if (container.dataset.dchatLimited) return;
            container.dataset.dchatLimited = "true";

            const allTags = Array.from(container.querySelectorAll("span.tag:is([data-trait], [data-slug]):not(.tag_transparent)"))
                .filter(tag => !tag.classList.contains("dchat-filtered"));

            if (allTags.length <= 3) return;

            allTags.forEach((tag, index) => {
                tag.classList.add("dchat-clickable");
                if (index >= 3) tag.classList.add("dchat-hidden");
            });

            const signal = registerCleanup(el, () => {
                container.classList.remove("dchat-expanded");
            });

            container.addEventListener("click", (event) => {
                const clickableTag = event.target.closest("span.tag.dchat-clickable");
                if (!clickableTag || clickableTag.classList.contains("dchat-filtered")) return;

                event.preventDefault();
                event.stopPropagation();
                container.classList.toggle("dchat-expanded");
            }, { signal, capture: true });
        });
    }
}
