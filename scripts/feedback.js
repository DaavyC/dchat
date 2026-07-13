import { MODULE_ID } from "./config.js";

const FEEDBACK_ENDPOINT = "https://feedback.daavyc.workers.dev";
const FEEDBACK_TEMPLATE = `modules/${MODULE_ID}/templates/feedback.hbs`;
const MAX_MESSAGE_LENGTH = 3000;
const I18N_PREFIX = "daavy-chat.Feedback";
const CATEGORIES = ["Bug", "Suggestion"];

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class FeedbackForm extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "daavy-chat-feedback",
        tag: "form",
        window: {
            title: `${I18N_PREFIX}.MenuLabel`,
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
            ui.notifications.warn(game.i18n.localize(`${I18N_PREFIX}.Invalid`));
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

            ui.notifications.info(game.i18n.localize(`${I18N_PREFIX}.Success`));
            await this.close();
        } catch (error) {
            console.error(`${MODULE_ID} | Unable to send feedback.`, error);
            ui.notifications.error(game.i18n.localize(`${I18N_PREFIX}.Error`));
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

export function registerFeedbackMenu() {
    game.settings.registerMenu(MODULE_ID, "feedback", {
        name: `${I18N_PREFIX}.MenuName`,
        label: `${I18N_PREFIX}.MenuLabel`,
        hint: `${I18N_PREFIX}.MenuHint`,
        icon: "fa-solid fa-comment-dots",
        type: FeedbackForm,
        restricted: true,
    });
}
