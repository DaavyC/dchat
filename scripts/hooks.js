import { MESSAGE_TYPES } from "./config.js";
import { getChatSection, getElement } from "./utils.js";
import {
    AutocompleteWhisper,
    ChatLogManager,
    ChatTabsManager,
    HideChatInitiative,
    HidePrivateMessages,
    SettingsManager,
    addChatNotification,
    cleanupMessage,
    initializeFeatures,
    processFeatures,
    refreshChatManagers,
    scheduleChatRefreshes
} from "./main.js";

export function registerDchatHooks() {
    Hooks.once("init", () => {
        initializeFeatures();
    });

    Hooks.once("ready", () => {
        AutocompleteWhisper.onReady();
        HidePrivateMessages.onReady();
    });

    Hooks.once("i18nInit", () => {
        ChatTabsManager.resetLocalizedLabels();
    });

    Hooks.on("renderSettingsConfig", (application, renderedHtml) => {
        SettingsManager.groupSettings(renderedHtml);
    });

    Hooks.on("renderChatInput", (application, elements) => {
        refreshChatManagers(application?.element);
        AutocompleteWhisper.onRenderChatInput(application, elements);
    });

    Hooks.on("renderChatLog", (application, renderedHtml) => {
        const element = getElement(renderedHtml);
        ChatTabsManager.inject(element);
        ChatLogManager.observeChatLog(element);
        AutocompleteWhisper.onRenderChatLog(element);
    });

    Hooks.on("renderSidebar", (application, renderedHtml) => {
        const chatSection = getChatSection(renderedHtml);
        if (chatSection) ChatTabsManager.inject(chatSection);
        AutocompleteWhisper.onRenderSidebar(renderedHtml);
    });

    Hooks.on("changeSidebarTab", (application) => {
        if (application?.tabName !== MESSAGE_TYPES.CHAT) return;

        refreshChatManagers(application?.element);
        AutocompleteWhisper.onChangeSidebarTab(application);
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
    Hooks.on("createChatMessage", addChatNotification);

    Hooks.on("preCreateChatMessage", (message, creationData) => {
        return HideChatInitiative.preCreateChatMessage(message, creationData);
    });

    Hooks.on("deleteChatMessage", cleanupMessage);
}
