import { MESSAGE_TYPES } from "./config.js";
import { SettingsLayout } from "./settings.js";
import { getChatSection, getElement } from "./utils.js";
import { AutocompleteWhisper } from "./features/autocomplete-whisper.js";
import { HideChatFormatting } from "./features/cleaner-chat.js";
import { HideChatInitiative } from "./features/hide-chat-initiative.js";
import { HidePrivateMessages } from "./features/hide-private-messages.js";
import {
    ChatClearControls,
    ChatTabsManager,
    addChatNotification,
    cleanupMessage,
    initializeFeatures,
    processFeatures,
    refreshChatUi,
    scheduleChatUiRefresh
} from "./main.js";

export function registerDaavyChatHooks() {
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

    Hooks.on("renderSettingsConfig", (_application, renderedHtml) => {
        SettingsLayout.groupSettings(renderedHtml);
    });

    Hooks.on("renderChatInput", (application, elements) => {
        refreshChatUi(application?.element);
        AutocompleteWhisper.onRenderChatInput(application, elements);
        HideChatFormatting.onRenderChatInput(application, elements);
    });

    Hooks.on("renderChatLog", (_application, renderedHtml) => {
        const element = getElement(renderedHtml);
        ChatTabsManager.inject(element);
        ChatClearControls.observeChatLog(element);
        HideChatFormatting.observe(element);
        AutocompleteWhisper.onRenderChatLog(element);
    });

    Hooks.on("renderSidebar", (_application, renderedHtml) => {
        const chatSection = getChatSection(renderedHtml);
        if (chatSection) ChatTabsManager.inject(chatSection);
        HideChatFormatting.observe(chatSection);
        AutocompleteWhisper.onRenderSidebar(renderedHtml);
    });

    Hooks.on("changeSidebarTab", (application) => {
        if (application?.tabName !== MESSAGE_TYPES.CHAT) return;

        refreshChatUi(application?.element);
        HideChatFormatting.refresh(application?.element);
        AutocompleteWhisper.onChangeSidebarTab(application);
    });

    Hooks.on("openDetachedWindow", () => {
        scheduleChatUiRefresh();
        AutocompleteWhisper.onDetachedWindowChange();
    });

    Hooks.on("closeDetachedWindow", () => {
        scheduleChatUiRefresh();
        AutocompleteWhisper.onDetachedWindowChange();
    });

    Hooks.on("renderChatMessageHTML", processFeatures);
    Hooks.on("createChatMessage", addChatNotification);

    Hooks.on("preCreateChatMessage", (message, creationData) => {
        return HideChatInitiative.preCreateChatMessage(message, creationData);
    });

    Hooks.on("deleteChatMessage", cleanupMessage);
}
