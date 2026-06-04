import { HOOK_NAMES, MESSAGE_TYPES } from "./config.js";
import { SettingsLayout } from "./settings.js";
import { getChatSection, getElement } from "./utils.js";
import { AutocompleteWhisper } from "./features/autocomplete-whisper.js";
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
    Hooks.once(HOOK_NAMES.INIT, () => {
        initializeFeatures();
    });

    Hooks.once(HOOK_NAMES.READY, () => {
        AutocompleteWhisper.onReady();
        HidePrivateMessages.onReady();
    });

    Hooks.once(HOOK_NAMES.I18N_INIT, () => {
        ChatTabsManager.resetLocalizedLabels();
    });

    Hooks.on(HOOK_NAMES.RENDER_SETTINGS_CONFIG, (_application, renderedHtml) => {
        SettingsLayout.groupSettings(renderedHtml);
    });

    Hooks.on(HOOK_NAMES.RENDER_CHAT_INPUT, (application, elements) => {
        refreshChatUi(application?.element);
        AutocompleteWhisper.onRenderChatInput(application, elements);
    });

    Hooks.on(HOOK_NAMES.RENDER_CHAT_LOG, (_application, renderedHtml) => {
        const element = getElement(renderedHtml);
        ChatTabsManager.inject(element);
        ChatClearControls.observeChatLog(element);
        AutocompleteWhisper.onRenderChatLog(element);
    });

    Hooks.on(HOOK_NAMES.RENDER_SIDEBAR, (_application, renderedHtml) => {
        const chatSection = getChatSection(renderedHtml);
        if (chatSection) ChatTabsManager.inject(chatSection);
        AutocompleteWhisper.onRenderSidebar(renderedHtml);
    });

    Hooks.on(HOOK_NAMES.CHANGE_SIDEBAR_TAB, (application) => {
        if (application?.tabName !== MESSAGE_TYPES.CHAT) return;

        refreshChatUi(application?.element);
        AutocompleteWhisper.onChangeSidebarTab(application);
    });

    Hooks.on(HOOK_NAMES.OPEN_DETACHED_WINDOW, () => {
        scheduleChatUiRefresh();
        AutocompleteWhisper.onDetachedWindowChange();
    });

    Hooks.on(HOOK_NAMES.CLOSE_DETACHED_WINDOW, () => {
        scheduleChatUiRefresh();
        AutocompleteWhisper.onDetachedWindowChange();
    });

    Hooks.on(HOOK_NAMES.RENDER_CHAT_MESSAGE_HTML, processFeatures);
    Hooks.on(HOOK_NAMES.CREATE_CHAT_MESSAGE, addChatNotification);

    Hooks.on(HOOK_NAMES.PRE_CREATE_CHAT_MESSAGE, (message, creationData) => {
        return HideChatInitiative.preCreateChatMessage(message, creationData);
    });

    Hooks.on(HOOK_NAMES.DELETE_CHAT_MESSAGE, cleanupMessage);
}
