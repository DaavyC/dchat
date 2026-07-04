import {
    CHAT_CLASSES,
    CHAT_DATA,
    CHAT_I18N,
    CHAT_SELECTORS,
    CHAT_TAB_CONFIG,
    FEATURE_CLASSES,
    MESSAGE_TYPES,
    SETTING_KEYS
} from "./config.js";
import { isSettingEnabled, registerModuleSettings } from "./settings.js";
import {
    classifyMessage,
    cleanupDeletedMessage,
    getDocument,
    getElement,
    isPinnedMessage,
    rememberMessageElement
} from "./utils.js";
import { AutocompleteWhisper } from "./features/autocomplete-whisper.js";
import { CollapsibleFormula } from "./features/cleaner-chat.js";
import { HidePrivateMessages } from "./features/hide-private-messages.js";
import { ChatPins, setPinRefreshHandler } from "./features/pins.js";
import { HideDamageButtons, TraitFilter } from "./features/pf2e-only.js";

export { ChatPins } from "./features/pins.js";

export class ChatClearControls {
    static _observers = new WeakMap();

    static observeChatLog(renderedHtml) {
        this._observeChatLog(getElement(renderedHtml));
    }

    static scheduleRefresh(element = null) {
        const refresh = () => this.refresh(element);
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(refresh);
        else refresh();
    }

    static refresh(element = null) {
        const container = getElement(element);
        if (container) {
            this.injectClearButton(container);
            return;
        }

        ChatTabsManager._getTrackedContainers().forEach(trackedContainer => {
            this.injectClearButton(trackedContainer);
        });
    }

    static _observeChatLog(element) {
        if (!element) return;

        this._observers.get(element)?.disconnect();
        this.injectClearButton(element);

        const observer = new MutationObserver(() => {
            this.injectClearButton(element);
        });

        observer.observe(element, { childList: true, subtree: true });
        this._observers.set(element, observer);
    }

    static _createScopedClearButton(documentRef) {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = CHAT_CLASSES.SCOPED_CLEAR;

        const tooltip = game.i18n.localize(CHAT_I18N.CLEAR_TOOLTIP);
        button.dataset.tooltip = tooltip;
        button.title = tooltip;
        button.setAttribute("aria-label", tooltip);

        button.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await this.scopedClearChatLog(event.shiftKey);
        });

        return button;
    }

    static injectClearButton(renderedHtml) {
        const element = getElement(renderedHtml);
        if (!element) return;

        const toolbar = ChatTabsManager._ensureModuleToolbar(element);
        if (!toolbar) return;

        const scopedButtons = Array.from(toolbar.querySelectorAll(CHAT_SELECTORS.SCOPED_CLEAR));
        if (!game.user?.isGM) {
            ChatPins.removeManagerButtons(toolbar);
            scopedButtons.forEach(button => button.remove());
            return;
        }

        const documentRef = getDocument(element);
        const scopedButton = scopedButtons.shift() ?? null;
        scopedButtons.forEach(button => button.remove());

        const clearButton = scopedButton ?? this._createScopedClearButton(documentRef);
        this._getFoundryClearButton(element)?.remove();

        ChatPins.injectManagerButton(toolbar, documentRef);
        if (!toolbar.contains(clearButton)) {
            toolbar.appendChild(clearButton);
        }
    }

    static async scopedClearChatLog(clearAll = false) {
        if (!game.user?.isGM) return;

        const tabLabel = this._getClearLabel(clearAll);
        const messages = this._getMessagesToClear(clearAll);

        if (!messages.length) {
            return ui.notifications.info(game.i18n.format(CHAT_I18N.CLEAR_NO_MESSAGES, { label: tabLabel }));
        }

        if (!await this._confirmClear(tabLabel, messages.length)) return;

        const messageIds = messages.map(message => message.id);
        await this._deleteInBatches(messageIds);

        ui.notifications.info(game.i18n.format(CHAT_I18N.CLEAR_SUCCESS, { label: tabLabel, count: messageIds.length }));
    }

    static _getFoundryClearButton(element) {
        const controls = element.querySelector(CHAT_SELECTORS.CONTROLS);
        return controls?.querySelector(CHAT_SELECTORS.FOUNDRY_CLEAR_BUTTON)
            ?? controls?.querySelector(CHAT_SELECTORS.FOUNDRY_CLEAR_ICON)?.closest("button")
            ?? null;
    }

    static _getClearLabel(clearAll) {
        if (clearAll) return game.i18n.localize(CHAT_I18N.TABS_ALL);

        const currentTab = CHAT_TAB_CONFIG.find(tab => tab.id === ChatTabsManager.activeTab);
        return game.i18n.localize(currentTab?.label ?? CHAT_I18N.TABS_CHAT);
    }

    static _getMessagesToClear(clearAll) {
        const messages = clearAll
            ? game.messages.contents
            : game.messages.filter(message => classifyMessage(message) === ChatTabsManager.activeTab);

        return messages.filter(message => !isPinnedMessage(message));
    }

    static _confirmClear(tabLabel, messageCount) {
        return foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.format(CHAT_I18N.CLEAR_TITLE, { label: tabLabel }) },
            content: `<p>${game.i18n.format(CHAT_I18N.CLEAR_CONFIRM, { count: messageCount, label: tabLabel })}</p>`,
            yes: { default: true },
            no: { default: false },
        });
    }

    static async _deleteInBatches(messageIds) {
        for (let batchStartIndex = 0; batchStartIndex < messageIds.length; batchStartIndex += 100) {
            await ChatMessage.deleteDocuments(messageIds.slice(batchStartIndex, batchStartIndex + 100));
        }
    }
}


export class ChatTabsManager {
    static _localizedLabels = null;
    static _chatContainers = new Set();
    static activeTab = MESSAGE_TYPES.CHAT;
    static unreadTabs = new Set();

    static getLocalizedLabels() {
        if (!this._localizedLabels) {
            this._localizedLabels = CHAT_TAB_CONFIG.map(tab => ({
                id: tab.id,
                icon: tab.icon,
                label: game.i18n.localize(tab.label)
            }));
        }
        return this._localizedLabels;
    }

    static resetLocalizedLabels() {
        this._localizedLabels = null;
    }

    static scheduleRefresh(element = null) {
        const refresh = () => this.refresh(element);
        if (typeof requestAnimationFrame === "function") requestAnimationFrame(refresh);
        else refresh();
    }

    static _pruneContainers() {
        for (const element of Array.from(this._chatContainers)) {
            if (!element?.isConnected) this._chatContainers.delete(element);
        }
    }

    static _trackContainer(element) {
        if (!element) return;
        this._pruneContainers();
        this._chatContainers.add(element);
    }

    static _getTrackedContainers() {
        this._pruneContainers();
        return Array.from(this._chatContainers);
    }

    static refresh(element = null) {
        const container = getElement(element);
        if (container) {
            this.inject(container);
            return;
        }

        for (const trackedContainer of this._getTrackedContainers()) {
            this.inject(trackedContainer);
        }
    }

    static _ensureModuleToolbar(element) {
        const messageLog = this._getMessageList(element);
        if (!messageLog) return null;

        const anchor = this._getToolbarAnchor(element, messageLog);
        const targetParent = anchor?.parentElement;
        if (!targetParent) return null;

        const toolbar = this._getOrCreateToolbar(element);
        if (toolbar.parentElement !== targetParent || toolbar.nextElementSibling !== anchor) {
            targetParent.insertBefore(toolbar, anchor);
        }

        return toolbar;
    }

    static inject(element) {
        if (!element) return;
        this._trackContainer(element);

        const messageLog = this._getMessageList(element);
        if (!messageLog) return;

        const toolbar = this._ensureModuleToolbar(element);
        if (!toolbar) return;

        toolbar.querySelectorAll(CHAT_SELECTORS.TAB_BAR).forEach(tabBar => tabBar.remove());
        toolbar.prepend(this._buildTabBar(getDocument(element)));
        this._applyFilterClass(element, messageLog, this.activeTab);
        this.classifyExistingMessages(element);
        ChatPins.refresh(element);
        this._bindTabBar(element);

        ChatClearControls.refresh(element);
    }

    static switch(tabId) {
        if (this.activeTab === tabId) return;

        this.activeTab = tabId;
        this.unreadTabs.delete(tabId);

        for (const container of this._getTrackedContainers()) {
            const messageList = this._getMessageList(container);
            if (!messageList) continue;

            this._applyFilterClass(container, messageList, tabId);
            this._syncTabButtons(container, tabId);
            this._scrollToBottom(messageList);
        }
    }

    static addNotification(tabId) {
        if (tabId === this.activeTab) return;
        this.unreadTabs.add(tabId);

        for (const container of this._getTrackedContainers()) {
            container.querySelectorAll(`.${CHAT_CLASSES.TAB_BUTTON}[data-daavy-chat-tab="${tabId}"]`).forEach(button => {
                this._ensurePip(button);
            });
        }
    }

    static classifyExistingMessages(container) {
        container.querySelectorAll(CHAT_SELECTORS.MESSAGE_ID).forEach(messageElement => {
            const message = game.messages.get(messageElement.dataset.messageId);
            if (message) {
                messageElement.setAttribute(`data-${CHAT_DATA.TYPE}`, classifyMessage(message));
            }
        });
    }

    static _getMessageList(container) {
        return container.querySelector(CHAT_SELECTORS.MESSAGE_LIST);
    }

    static _getToolbarAnchor(element, messageLog) {
        return element.querySelector(CHAT_SELECTORS.CONTROLS)
            ?? element.querySelector(CHAT_SELECTORS.FORM)
            ?? messageLog;
    }

    static _getOrCreateToolbar(element) {
        const existing = element.querySelector(`:scope > .${CHAT_CLASSES.MODULE_TOOLBAR}`)
            ?? element.querySelector(`.${CHAT_CLASSES.MODULE_TOOLBAR}`);
        if (existing) return existing;

        const toolbar = getDocument(element).createElement("div");
        toolbar.className = CHAT_CLASSES.MODULE_TOOLBAR;
        return toolbar;
    }

    static _buildTabBar(documentRef) {
        const tabBar = documentRef.createElement("div");
        tabBar.className = CHAT_CLASSES.TAB_BAR;
        tabBar.append(...this.getLocalizedLabels().map(tabConfig => this._buildTabButton(documentRef, tabConfig)));
        return tabBar;
    }

    static _buildTabButton(documentRef, tabConfig) {
        const isActive = tabConfig.id === this.activeTab;
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = `ui-control icon fas ${tabConfig.icon} ${CHAT_CLASSES.TAB_BUTTON}${isActive ? ` ${CHAT_CLASSES.ACTIVE}` : ""}`;
        button.dataset[CHAT_DATA.TAB] = tabConfig.id;
        button.dataset.tooltip = tabConfig.label;
        button.setAttribute("aria-label", tabConfig.label);
        button.setAttribute("aria-pressed", String(isActive));

        if (this.unreadTabs.has(tabConfig.id)) this._ensurePip(button);
        return button;
    }

    static _bindTabBar(element) {
        element.querySelector(CHAT_SELECTORS.TAB_BAR)?.addEventListener("click", (event) => {
            const button = event.target.closest(CHAT_SELECTORS.TAB_DATA);
            if (button) this.switch(button.dataset[CHAT_DATA.TAB]);
        });
    }

    static _applyFilterClass(container, messageList, tabId) {
        const filterClasses = Object.values(MESSAGE_TYPES).map(tab => `${CHAT_CLASSES.FILTER_PREFIX}-${tab}`);
        for (const element of [container, messageList]) {
            element.classList.remove(...filterClasses);
            element.classList.add(`${CHAT_CLASSES.FILTER_PREFIX}-${tabId}`);
        }
    }

    static _syncTabButtons(container, tabId) {
        container.querySelectorAll(CHAT_SELECTORS.TAB_BUTTON).forEach((button) => {
            const isActive = button.dataset[CHAT_DATA.TAB] === tabId;
            button.classList.toggle(CHAT_CLASSES.ACTIVE, isActive);
            button.setAttribute("aria-pressed", String(isActive));
            if (isActive) button.querySelector(CHAT_SELECTORS.PIP)?.remove();
        });
    }

    static _ensurePip(button) {
        if (button.querySelector(CHAT_SELECTORS.PIP)) return;

        const pip = getDocument(button).createElement("span");
        pip.className = CHAT_CLASSES.PIP;
        button.appendChild(pip);
    }

    static _scrollToBottom(messageList) {
        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });
    }
}

const messageFeatures = [
    { setting: SETTING_KEYS.CLEANER_CHAT, css: FEATURE_CLASSES.CLEANER_CHAT },
    { setting: SETTING_KEYS.HIDE_DAMAGE_TRAITS, css: FEATURE_CLASSES.HIDE_DAMAGE_TRAITS },
    { handler: TraitFilter, setting: SETTING_KEYS.TRAIT_FILTER, css: FEATURE_CLASSES.TRAIT_FILTER },
    { handler: CollapsibleFormula, setting: SETTING_KEYS.COLLAPSIBLE_FORMULA, css: FEATURE_CLASSES.COLLAPSIBLE_FORMULA },
    { setting: SETTING_KEYS.COMPACT_CHAT, css: FEATURE_CLASSES.COMPACT_CHAT },
    { handler: HidePrivateMessages, setting: SETTING_KEYS.HIDE_PRIVATE_MESSAGES },
    { handler: HideDamageButtons, setting: SETTING_KEYS.HIDE_DAMAGE_BUTTONS }
];

export function initializeFeatures() {
    registerModuleSettings();
    setPinRefreshHandler(scheduleChatUiRefresh);
    AutocompleteWhisper.init();
}

export function processFeatures(message, renderedHtml) {
    const element = rememberMessageElement(message, renderedHtml);
    if (!element) return;

    element.setAttribute(`data-${CHAT_DATA.TYPE}`, classifyMessage(message));
    ChatPins.processMessage(message, element);

    for (const feature of messageFeatures) {
        if (!isSettingEnabled(feature.setting)) continue;

        if (feature.css) element.classList.add(feature.css);
        feature.handler?.processMessage?.(message, renderedHtml);
    }
}

export function refreshChatUi(element = null) {
    ChatTabsManager.refresh(element);
    ChatClearControls.refresh(element);
}

export function scheduleChatUiRefresh() {
    ChatTabsManager.scheduleRefresh();
    ChatClearControls.scheduleRefresh();
}

export function addChatNotification(message) {
    if (isSettingEnabled(SETTING_KEYS.HIDE_PRIVATE_MESSAGES) && HidePrivateMessages.shouldHideMessage(message)) return;
    ChatTabsManager.addNotification(classifyMessage(message));
}

export function cleanupMessage(message) {
    cleanupDeletedMessage(message);
}
