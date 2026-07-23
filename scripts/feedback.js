import {
    FEEDBACK_ACTIONS_CLASS,
    MODULE_ID,
    SETTINGS_CLASSES
} from "./constants.js";
import { getDocument, getElement, i18nKey } from "./utils.js";

const { DialogV2 } = foundry.applications.api;

async function showFeedbackForm() {
    new DialogV2({
        id: "daavy-chat-feedback",
        window: {
            title: i18nKey("Feedback.MenuLabel"),
            icon: "fa-solid fa-comment-dots",
        },
        position: { width: 500 },
        form: { closeOnSubmit: false },
        content: await renderTemplate(`modules/${MODULE_ID}/templates/feedback.hbs`),
        buttons: [
            {
                action: "cancel",
                class: "daavy-chat-feedback-cancel",
                icon: "fa-solid fa-xmark",
                label: i18nKey("Feedback.Cancel"),
                callback: (_event, _button, dialog) => dialog.close()
            },
            {
                action: "submit",
                class: "daavy-chat-feedback-send",
                default: true,
                icon: "fa-solid fa-paper-plane",
                label: i18nKey("Feedback.Send"),
                callback: async (_event, button, dialog) => {
                    const formData = new FormData(button.form);
                    const category = String(formData.get("category") ?? "").trim();
                    const message = String(formData.get("message") ?? "").trim();
                    if (!["Bug", "Suggestion"].includes(category) || !message || message.length > 3000) {
                        ui.notifications.warn(game.i18n.localize(i18nKey("Feedback.Invalid")));
                        return;
                    }
                    if (!game.user?.isGM) return;

                    try {
                        const module = game.modules.get(MODULE_ID);
                        const response = await fetch("https://feedback.daavyc.workers.dev", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                message,
                                category,
                                moduleName: module?.title ?? MODULE_ID,
                                moduleVersion: module?.version ?? "",
                                foundryVersion: game.version ?? "",
                                systemId: game.system?.id ?? "",
                                systemVersion: game.system?.version ?? "",
                            }),
                        });
                        if (!response.ok) throw new Error(`Feedback request failed with status ${response.status}.`);

                        ui.notifications.info(game.i18n.localize(i18nKey("Feedback.Success")));
                        await dialog.close();
                    } catch (error) {
                        console.error(`${MODULE_ID} | Unable to send feedback.`, error);
                        ui.notifications.error(game.i18n.localize(i18nKey("Feedback.Error")));
                    }
                },
            }
        ]
    }).render({ force: true });
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
        ["daavy-chat-donate-action", "fa-solid fa-heart", "Donate.Label", () => documentRef.defaultView.open("https://ko-fi.com/daavy", "_blank", "noopener,noreferrer")],
        ["daavy-chat-discord-action", "fa-brands fa-discord", "Discord.Label", () => documentRef.defaultView.open("https://discord.gg/ZmFZxdGrta", "_blank", "noopener,noreferrer")],
        ["daavy-chat-feedback-action", "fa-solid fa-comment-dots", "Feedback.MenuLabel", showFeedbackForm]
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
