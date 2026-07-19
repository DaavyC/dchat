import { MESSAGE_TYPES } from "./constants.js";
import { injectFeedbackButton } from "./feedback.js";
import { SettingsLayout } from "./settings.js";
import { classifyMessage, getChatSection, getElement, isCurrentUserAuthor } from "./utils.js";
import { AutocompleteWhisper } from "./features/autocomplete-whisper.js";
import { HideChatFormatting } from "./features/cleaner-chat.js";
import { HideChatInitiative } from "./features/hide-chat-initiative.js";
import { HidePrivateMessages } from "./features/hide-private-messages.js";
import {
    ChatClearControls,
    ChatPins,
    ChatTabsManager,
    addChatNotification,
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
        ChatPins.onReady();
        HidePrivateMessages.onReady();
        ChatTabsManager.initializeWhisperTarget();
    });

    Hooks.on("renderSettingsConfig", (_application, renderedHtml) => {
        SettingsLayout.groupSettings(renderedHtml);
        injectFeedbackButton(renderedHtml);
    });

    Hooks.on("renderChatInput", (application, elements) => {
        refreshChatUi(application?.element);
        AutocompleteWhisper.refresh(application?.element, elements);
        HideChatFormatting.onRenderChatInput(application, elements);
    });

    Hooks.on("renderChatLog", (_application, renderedHtml) => {
        const element = getElement(renderedHtml);
        ChatTabsManager.inject(element);
        ChatClearControls.observeChatLog(element);
        HideChatFormatting.observe(element);
        AutocompleteWhisper.refresh(element);
    });

    Hooks.on("renderSidebar", (_application, renderedHtml) => {
        const chatSection = getChatSection(renderedHtml);
        if (chatSection) ChatTabsManager.inject(chatSection);
        HideChatFormatting.observe(chatSection);
        AutocompleteWhisper.refresh(chatSection);
    });

    Hooks.on("changeSidebarTab", (application) => {
        if (application?.tabName !== MESSAGE_TYPES.CHAT) return;

        refreshChatUi(application?.element);
        HideChatFormatting.refresh(application?.element);
        AutocompleteWhisper.refresh(application?.element);
    });

    const refreshDetachedChat = () => {
        scheduleChatUiRefresh();
        AutocompleteWhisper.refresh();
    };

    Hooks.on("openDetachedWindow", refreshDetachedChat);
    Hooks.on("closeDetachedWindow", refreshDetachedChat);

    Hooks.on("renderChatMessageHTML", processFeatures);
    Hooks.on("createChatMessage", (message) => {
        addChatNotification(message);
        ChatTabsManager.onCreateWhisperMessage(message);
        if (isCurrentUserAuthor(message)) ChatTabsManager.switch(classifyMessage(message));
    });
    Hooks.on("updateChatMessage", scheduleChatUiRefresh);
    Hooks.on("preDeleteChatMessage", ChatPins.preDeleteMessage);
    Hooks.on("chatInput", ChatTabsManager.onWhisperChatInput.bind(ChatTabsManager));
    Hooks.on("chatMessage", ChatTabsManager.onWhisperChatMessage.bind(ChatTabsManager));

    Hooks.on("preCreateChatMessage", HideChatInitiative.preCreateChatMessage);
    Hooks.on("preCreateChatMessage", ChatTabsManager.preCreateWhisperMessage.bind(ChatTabsManager));
}
