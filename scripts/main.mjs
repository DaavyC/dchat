import { MODULE_ID, MessageClassifier, getChatSection, getElement, rememberMessageElement, registerMessageCleanupHook } from "./js/core.js";
import { CleanerChat, HideDamageTraits, TraitFilter, CollapsibleFormula, CompactChat, AutocompleteWhisper, HideChatInitiative, HidePrivateMessages, HideDamageButtons } from "./js/features.js";
import { ChatTabsManager, SettingsManager, ChatLogManager } from "./js/data/ui.js";

const FEATURES = [
    { class: CleanerChat, setting: "cleanerChat", css: "dchat-cleaner-chat" },
    { class: HideDamageTraits, setting: "hideDamageTraits", css: "dchat-hide-damage-traits" },
    { class: TraitFilter, setting: "traitFilter", css: "dchat-trait-filter" },
    { class: CollapsibleFormula, setting: "collapsibleFormula", css: "dchat-collapsible-formula" },
    { class: CompactChat, setting: "compactChat", css: "dchat-compact-chat" },
    { class: AutocompleteWhisper, setting: "autocompleteWhisper" },
    { class: HideChatInitiative, setting: "hideChatInitiative" },
    { class: HidePrivateMessages, setting: "hidePrivateMessages" },
    { class: HideDamageButtons, setting: "hideDamageButtons" }
];

// Applies enabled features to a chat message.
function processFeatures(message, html) {
    const element = rememberMessageElement(message, html);
    if (!element) return;

    element.setAttribute("data-dchat-type", MessageClassifier.classify(message));

    for (const f of FEATURES) {
        if (game.settings.get(MODULE_ID, f.setting)) {
            if (f.css) element.classList.add(f.css);
            f.class.processMessage?.(message, html);
        }
    }
}

Hooks.once("init", () => {
    FEATURES.forEach(f => f.class.init());
    SettingsManager.init();
    ChatLogManager.init();
    ChatTabsManager.init();
    registerMessageCleanupHook();
});

Hooks.on("renderChatLog", (app, html) => {
    ChatTabsManager.inject(getElement(html));
});

Hooks.on("renderSidebar", (app, html) => {
    const chatSection = getChatSection(html);
    if (chatSection) ChatTabsManager.inject(chatSection);
});

Hooks.on("renderChatMessageHTML", processFeatures);

Hooks.on("createChatMessage", (message) => {
    if (game.settings.get(MODULE_ID, "hidePrivateMessages") && HidePrivateMessages.shouldHideMessage(message)) return;
    ChatTabsManager.addNotification(MessageClassifier.classify(message));
});
