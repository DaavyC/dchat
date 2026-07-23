import {
    FEEDBACK_ACTIONS_CLASS,
    MODULE_ID,
    SETTINGS_CLASSES
} from "./constants.js";
import { getDocument, getElement, i18nKey } from "./utils.js";

const FEEDBACK_ENDPOINT = "https://feedback.daavyc.workers.dev";
const FEEDBACK_TEMPLATE = `modules/${MODULE_ID}/templates/feedback.hbs`;
const DONATE_URL = "https://ko-fi.com/daavy";
const DISCORD_URL = "https://discord.gg/ZmFZxdGrta";
const MAX_MESSAGE_LENGTH = 3000;
const CATEGORIES = ["Bug", "Suggestion"];

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class FeedbackForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "daavy-chat-feedback",
        tag: "form",
        window: {
            title: i18nKey("Feedback.MenuLabel"),
            icon: "fa-solid fa-comment-dots",
            contentClasses: ["standard-form"],
        },
        position: {
            width: 500,
        },
        form: {
            closeOnSubmit: false,
            handler: FeedbackForm.#onSubmit,
        },
    };

    static PARTS = {
        form: {
            template: FEEDBACK_TEMPLATE,
            root: true,
        },
    };

    #submitting = false;

    static async #onSubmit(_event, form, formData) {
        if (this.#submitting) return;

        const category = String(formData.object.category ?? "").trim();
        const message = String(formData.object.message ?? "").trim();
        if (!CATEGORIES.includes(category) || !message || message.length > MAX_MESSAGE_LENGTH) {
            ui.notifications.warn(game.i18n.localize(i18nKey("Feedback.Invalid")));
            return;
        }

        if (!game.user?.isGM) return;

        const submitButton = form.querySelector('button[type="submit"]');
        this.#submitting = true;
        if (submitButton) submitButton.disabled = true;

        try {
            const response = await fetch(FEEDBACK_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(this.#buildPayload(category, message)),
            });

            if (!response.ok) throw new Error(`Feedback request failed with status ${response.status}.`);

            ui.notifications.info(game.i18n.localize(i18nKey("Feedback.Success")));
            await this.close();
        } catch (error) {
            console.error(`${MODULE_ID} | Unable to send feedback.`, error);
            ui.notifications.error(game.i18n.localize(i18nKey("Feedback.Error")));
        } finally {
            this.#submitting = false;
            if (submitButton) submitButton.disabled = false;
        }
    }

    #buildPayload(category, message) {
        const module = game.modules.get(MODULE_ID);

        return {
            message,
            category,
            moduleName: module?.title ?? MODULE_ID,
            moduleVersion: module?.version ?? "",
            foundryVersion: game.version ?? "",
            systemId: game.system?.id ?? "",
            systemVersion: game.system?.version ?? "",
        };
    }
}

export function injectFeedbackButton(renderedHtml) {
    const container = getElement(renderedHtml);
    if (!container || !game.user?.isGM || container.querySelector(`.${FEEDBACK_ACTIONS_CLASS}`)) return;

    const groups = container.querySelectorAll(`.${SETTINGS_CLASSES.GROUP}`);
    const firstGroup = groups[0];
    if (!firstGroup) return;

    const documentRef = getDocument(container);
    const actions = documentRef.createElement("div");
    actions.className = FEEDBACK_ACTIONS_CLASS;

    const buttons = [
        ["daavy-chat-donate-action", "fa-solid fa-heart", "Donate.Label", () => documentRef.defaultView.open(DONATE_URL, "_blank", "noopener,noreferrer")],
        ["daavy-chat-discord-action", "fa-brands fa-discord", "Discord.Label", () => documentRef.defaultView.open(DISCORD_URL, "_blank", "noopener,noreferrer")],
        ["daavy-chat-feedback-action", "fa-solid fa-comment-dots", "Feedback.MenuLabel", () => new FeedbackForm().render({ force: true })]
    ].map(([className, icon, labelKey, onClick]) => {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = className;
        button.innerHTML = `<i class="${icon}"></i> ${game.i18n.localize(i18nKey(labelKey))}`;
        button.addEventListener("click", onClick);
        return button;
    });
    buttons[2].title = game.i18n.localize(i18nKey("Feedback.MenuHint"));

    actions.append(...buttons);
    firstGroup.before(actions);
}
