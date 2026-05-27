import { MessageClassifier, cleanupDeletedMessage, getChatSection, getElement, rememberMessageElement } from "./scripts/core.js";
import { CleanerChat, HideDamageTraits, TraitFilter, CollapsibleFormula, CompactChat, AutocompleteWhisper, HideChatInitiative, HidePrivateMessages, HideDamageButtons } from "./scripts/features.js";
import { ChatTabsManager, SettingsManager, ChatLogManager } from "./scripts/data/ui.js";
import { isSettingEnabled } from "./scripts/features/settings.js";

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
        if (isSettingEnabled(f.setting)) {
            if (f.css) element.classList.add(f.css);
            f.class.processMessage?.(message, html);
        }
    }
}

Hooks.once("init", () => {
    FEATURES.forEach(f => f.class.init());
});

Hooks.once("ready", () => {
    AutocompleteWhisper.onReady();
    HidePrivateMessages.onReady();
});

Hooks.once("i18nInit", () => {
    ChatTabsManager.resetLocalizedLabels();
});

Hooks.on("renderSettingsConfig", (app, html) => {
    SettingsManager.groupSettings(html);
});

Hooks.on("renderChatInput", (app, elements) => {
    refreshChatManagers(app?.element);
    AutocompleteWhisper.onRenderChatInput(app, elements);
});

Hooks.on("renderChatLog", (app, html) => {
    const element = getElement(html);
    ChatTabsManager.inject(element);
    ChatLogManager.observeChatLog(element);
    AutocompleteWhisper.onRenderChatLog(element);
});

Hooks.on("renderSidebar", (app, html) => {
    const chatSection = getChatSection(html);
    if (chatSection) ChatTabsManager.inject(chatSection);
    AutocompleteWhisper.onRenderSidebar(html);
});

Hooks.on("changeSidebarTab", (app) => {
    if (app?.tabName !== "chat") return;

    refreshChatManagers(app?.element);
    AutocompleteWhisper.onChangeSidebarTab(app);
});

Hooks.on("openDetachedWindow", () => {
    scheduleChatRefreshes();
    AutocompleteWhisper.onDetachedWindowChange();
});

Hooks.on("closeDetachedWindow", () => {
    scheduleChatRefreshes();
    AutocompleteWhisper.onDetachedWindowChange();
});

Hooks.on("renderChatMessageHTML", processFeatures);

Hooks.on("createChatMessage", (message) => {
    if (isSettingEnabled("hidePrivateMessages") && HidePrivateMessages.shouldHideMessage(message)) return;
    ChatTabsManager.addNotification(MessageClassifier.classify(message));
});

Hooks.on("preCreateChatMessage", (message, data) => {
    return HideChatInitiative.preCreateChatMessage(message, data);
});

Hooks.on("deleteChatMessage", (message) => {
    cleanupDeletedMessage(message);
});

function refreshChatManagers(element = null) {
    ChatTabsManager.refresh(element);
    ChatLogManager.refresh(element);
}

function scheduleChatRefreshes() {
    ChatTabsManager.scheduleRefresh();
    ChatLogManager.scheduleRefresh();
}
