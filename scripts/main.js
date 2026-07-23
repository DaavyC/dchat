import {
    CHAT_CLASSES,
    CHAT_DATA,
    CHAT_SELECTORS,
    CHAT_TAB_CONFIG,
    FEATURE_CLASSES,
    MESSAGE_TYPES,
    MODULE_ID,
    SETTINGS
} from "./constants.js";
import { isSettingEnabled, registerModuleSettings } from "./settings.js";
import {
    classifyMessage,
    getDocument,
    getElement,
    i18nKey,
    isPinnedMessage
} from "./utils.js";
import { AutocompleteWhisper } from "./features/autocomplete-whisper.js";
import { CollapsibleFormula } from "./features/cleaner-chat.js";
import { HidePrivateMessages } from "./features/hide-private-messages.js";
import { ChatPins, setPinRefreshHandler } from "./features/pins.js";
import { HideDamageButtons, TraitFilter } from "./features/pf2e-only.js";
import "./hooks.js";

export class ChatClearControls {
    static _observers = new WeakMap();

    static observeChatLog(renderedHtml) {
        const element = getElement(renderedHtml);
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

        const tooltip = game.i18n.localize(i18nKey("Clear.Tooltip"));
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
        element.querySelector(CHAT_SELECTORS.CONTROLS)
            ?.querySelector(CHAT_SELECTORS.FOUNDRY_CLEAR_BUTTON)
            ?.remove();

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
            return ui.notifications.info(game.i18n.format(i18nKey("Clear.NoMessages"), { label: tabLabel }));
        }

        if (!await this._confirmClear(tabLabel, messages.length)) return;

        const messageIds = messages.map(message => message.id);
        await this._deleteInBatches(messageIds);

        ui.notifications.info(game.i18n.format(i18nKey("Clear.Success"), { label: tabLabel, count: messageIds.length }));
    }

    static _getClearLabel(clearAll) {
        if (clearAll) return game.i18n.localize(i18nKey("Tabs.All"));

        const currentTab = CHAT_TAB_CONFIG.find(tab => tab.id === ChatTabsManager.activeTab);
        return game.i18n.localize(currentTab?.label ?? i18nKey("Tabs.Chat"));
    }

    static _getMessagesToClear(clearAll) {
        const messages = clearAll
            ? game.messages.contents
            : game.messages.filter(message => classifyMessage(message) === ChatTabsManager.activeTab);

        return messages.filter(message => !isPinnedMessage(message));
    }

    static _confirmClear(tabLabel, messageCount) {
        return foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.format(i18nKey("Clear.Title"), { label: tabLabel }) },
            content: `<p>${game.i18n.format(i18nKey("Clear.Confirm"), { count: messageCount, label: tabLabel })}</p>`,
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
    static _chatContainers = new Set();
    static activeTab = MESSAGE_TYPES.CHAT;
    static unreadTabs = new Set();
    static whisperTargetIds = [];

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
        this._syncWhisperTarget(element);
        this._applyFilterClass(element, messageLog, this.activeTab);
        this.classifyExistingMessages(element);
        ChatPins.refresh(element);
        this._bindTabBar(element);

        ChatClearControls.injectClearButton(element);
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

    static setWhisperTarget(userIds = []) {
        this.whisperTargetIds = Array.from(new Set(userIds)).filter(userId => game.users.has(userId));

        for (const container of this._getTrackedContainers()) {
            this._syncWhisperTarget(container);
        }
    }

    static getWhisperTargetUsers() {
        return this.whisperTargetIds.map(userId => game.users.get(userId)).filter(Boolean);
    }

    static initializeWhisperTarget() {
        const message = game.messages?.contents.findLast(message => !message.isRoll
            && message.whisper?.includes(game.user.id)
            && message.author?.id !== game.user.id);
        this.setWhisperTarget(message ? [message.author.id] : []);
    }

    static onWhisperChatInput(event, options) {
        if (this.activeTab !== MESSAGE_TYPES.WHISPER
            || event.key !== "Enter"
            || event.shiftKey
            || event.isComposing) return;

        const text = event.target?.textContent?.trim() ?? "";
        if (!text || text.startsWith("/")) return;

        const recipients = this.getWhisperTargetUsers();
        if (recipients.length && this._canWhisper(recipients)) return;

        event.preventDefault();
        options.recordPending = false;
        this._notifyMissingWhisperRecipient(recipients);
        return false;
    }

    static onWhisperChatMessage(chatLog, message, chatData) {
        if (this.activeTab !== MESSAGE_TYPES.WHISPER) return;

        const [command, match] = chatLog.constructor.parse(message);
        if (command === "whisper" && this._isEmptyWhisperContent(match[3])) {
            const recipients = this._resolveWhisperRecipients(match[2]);
            if (!recipients.length || !this._canWhisper(recipients)) return;

            this.setWhisperTarget(recipients.map(user => user.id));
            return false;
        }

        if (command !== "none") return;

        const recipients = this.getWhisperTargetUsers();
        if (!recipients.length || !this._canWhisper(recipients)) {
            this._notifyMissingWhisperRecipient(recipients);
            return false;
        }

        const whisperData = {
            ...chatData,
            content: match[2].replace(/\n/g, "<br>"),
            whisper: recipients.map(user => user.id),
            sound: CONFIG.sounds.notification,
        };
        delete whisperData.speaker;

        void ChatMessage.implementation.create(whisperData).catch(error => {
            Hooks.onError(`${MODULE_ID} | ChatTabsManager.onWhisperChatMessage`, error, {
                log: "error",
                notify: "error",
            });
        });
        return false;
    }

    static preCreateWhisperMessage(message) {
        if (!message.whisper?.length) return;
        if (!message.isRoll && this._isEmptyWhisperContent(message.content)) {
            if (message.author?.id === game.user.id) {
                this.setWhisperTarget(message.whisper.filter(userId => userId !== game.user.id));
            }
            return false;
        }

        if (!message.sound) message.updateSource({ sound: CONFIG.sounds.notification });
    }

    static onCreateWhisperMessage(message) {
        if (message.isRoll || !message.whisper?.length) return;

        if (message.author?.id !== game.user.id
            && message.whisper.includes(game.user.id)
            && message.author?.id) {
            this.setWhisperTarget([message.author.id]);
        }
    }

    static _resolveWhisperRecipients(target) {
        const names = target.replace(/[[\]]/g, "").split(",").map(name => name.trim());
        const recipients = names.flatMap(name => ChatMessage.getWhisperRecipients(name));
        return Array.from(new Map(recipients.map(user => [user.id, user])).values());
    }

    static _isEmptyWhisperContent(content) {
        const template = globalThis.document.createElement("template");
        template.innerHTML = content ?? "";
        return !(template.content.textContent ?? "").replace(/[\u00a0\u200b]/g, "").trim();
    }

    static _canWhisper(recipients) {
        return recipients.every(user => user.isGM) || game.user.can("MESSAGE_WHISPER");
    }

    static _notifyMissingWhisperRecipient(recipients) {
        const key = recipients.length ? "ERROR.CantWhisper" : "daavy-chat.Whisper.NoRecipient";
        ui.notifications.warn(game.i18n.localize(key));
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
        tabBar.append(...CHAT_TAB_CONFIG.map(tabConfig => this._buildTabButton(documentRef, tabConfig)));
        return tabBar;
    }

    static _buildTabButton(documentRef, tabConfig) {
        const isActive = tabConfig.id === this.activeTab;
        const label = game.i18n.localize(tabConfig.label);
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = `ui-control icon fas ${tabConfig.icon} ${CHAT_CLASSES.TAB_BUTTON}${isActive ? ` ${CHAT_CLASSES.ACTIVE}` : ""}`;
        button.dataset[CHAT_DATA.TAB] = tabConfig.id;
        button.dataset.tooltip = label;
        button.setAttribute("aria-label", label);
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
        this._syncWhisperTarget(container);
    }

    static _syncWhisperTarget(container) {
        const tabBar = container.querySelector(CHAT_SELECTORS.TAB_BAR);
        const button = tabBar?.querySelector(`[data-daavy-chat-tab="${MESSAGE_TYPES.WHISPER}"]`);
        container.querySelector(CHAT_SELECTORS.WHISPER_TARGET)?.remove();
        if (!button) return;

        const label = game.i18n.localize(CHAT_TAB_CONFIG.find(tab => tab.id === MESSAGE_TYPES.WHISPER).label);
        button.dataset.tooltip = label;
        button.setAttribute("aria-label", label);

        if (!button.classList.contains(CHAT_CLASSES.ACTIVE)) return;

        const users = this.getWhisperTargetUsers();
        if (!users.length) return;

        const documentRef = getDocument(button);
        const target = documentRef.createElement("span");
        const targetLabel = game.i18n.localize(i18nKey("Whisper.To"));
        target.className = CHAT_CLASSES.WHISPER_TARGET;
        target.setAttribute("aria-live", "polite");
        target.append(`${targetLabel}\u00a0`);

        users.forEach((user, index) => {
            if (index) target.append(", ");

            const name = documentRef.createElement("span");
            name.style.color = user.color.css;
            name.textContent = user.name;
            target.append(name);
        });

        const description = `${targetLabel} ${users.map(user => user.name).join(", ")}`;
        tabBar.after(target);
        button.dataset.tooltip = `${label}. ${description}`;
        button.setAttribute("aria-label", `${label}. ${description}`);
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
    { setting: SETTINGS.CLEANER_CHAT.key, css: FEATURE_CLASSES.CLEANER_CHAT },
    { setting: SETTINGS.HIDE_DAMAGE_TRAITS.key, css: FEATURE_CLASSES.HIDE_DAMAGE_TRAITS },
    { handler: TraitFilter, setting: SETTINGS.TRAIT_FILTER.key, css: FEATURE_CLASSES.TRAIT_FILTER },
    { handler: CollapsibleFormula, setting: SETTINGS.COLLAPSIBLE_FORMULA.key, css: FEATURE_CLASSES.COLLAPSIBLE_FORMULA },
    { setting: SETTINGS.COMPACT_CHAT.key, css: FEATURE_CLASSES.COMPACT_CHAT },
    { handler: HidePrivateMessages, setting: SETTINGS.HIDE_PRIVATE_MESSAGES.key },
    { handler: HideDamageButtons, setting: SETTINGS.HIDE_DAMAGE_BUTTONS.key }
];

export function initializeFeatures() {
    registerModuleSettings();
    setPinRefreshHandler(scheduleChatUiRefresh);
    AutocompleteWhisper.init();
}

export function processFeatures(message, renderedHtml) {
    const element = getElement(renderedHtml);
    if (!element) return;

    element.setAttribute(`data-${CHAT_DATA.TYPE}`, classifyMessage(message));
    ChatPins.processMessage(message, element);

    for (const feature of messageFeatures) {
        if (!isSettingEnabled(feature.setting)) continue;

        if (feature.css) element.classList.add(feature.css);
        feature.handler?.processMessage?.(message, renderedHtml);
    }
}

export function scheduleChatUiRefresh() {
    requestAnimationFrame(() => ChatTabsManager.refresh());
}

export function addChatNotification(message) {
    if (isSettingEnabled(SETTINGS.HIDE_PRIVATE_MESSAGES.key) && HidePrivateMessages.shouldHideMessage(message)) return;
    ChatTabsManager.addNotification(classifyMessage(message));
}
