import { MessageClassifier, getDocument, getElement } from "../../core.js";
import { ChatLogManager } from "./chat-log-manager.js";

export class ChatTabsManager {
    static TAB_CONFIG = [
        { id: MessageClassifier.TABS.CHAT, label: "DCHAT.Tabs.Chat", icon: "fa-comments" },
        { id: MessageClassifier.TABS.GAME, label: "DCHAT.Tabs.Game", icon: "fa-dice-d20" },
        { id: MessageClassifier.TABS.WHISPER, label: "DCHAT.Tabs.Whispers", icon: "fa-lock" },
    ];

    static _localizedLabels = null;
    static _chatContainers = new Set();
    static activeTab = MessageClassifier.TABS.CHAT;
    static unreadTabs = new Set();

    static getLocalizedLabels() {
        if (!this._localizedLabels) {
            this._localizedLabels = this.TAB_CONFIG.map(tab => ({
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
        requestAnimationFrame(() => this.refresh(element));
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

        for (const tracked of this._getTrackedContainers()) {
            this.inject(tracked);
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

        toolbar.querySelectorAll(".dchat-tab-bar").forEach(tabBar => tabBar.remove());
        toolbar.prepend(this._buildTabBar(getDocument(element)));
        this._applyFilterClass(element, messageLog, this.activeTab);
        this.classifyExistingMessages(element);
        this._bindTabBar(element);

        ChatLogManager.refresh(element);
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
            container.querySelectorAll(`.dchat-tab[data-dchat-tab="${tabId}"]`).forEach(btn => {
                this._ensurePip(btn);
            });
        }
    }

    static classifyExistingMessages(container) {
        container.querySelectorAll("[data-message-id]").forEach(msgEl => {
            const message = game.messages.get(msgEl.dataset.messageId);
            if (message) {
                msgEl.setAttribute("data-dchat-type", MessageClassifier.classify(message));
            }
        });
    }

    static _getMessageList(container) {
        return container.querySelector("#chat-log, .chat-log, ol.chat-messages, [class*='chat-log']");
    }

    static _getToolbarAnchor(element, messageLog) {
        return element.querySelector("#chat-controls")
            ?? element.querySelector("#chat-form, form.chat-form")
            ?? messageLog;
    }

    static _getOrCreateToolbar(element) {
        const existing = element.querySelector(":scope > .dchat-module-toolbar")
            ?? element.querySelector(".dchat-module-toolbar");
        if (existing) return existing;

        const toolbar = getDocument(element).createElement("div");
        toolbar.className = "dchat-module-toolbar";
        return toolbar;
    }

    static _buildTabBar(doc) {
        const tabBar = doc.createElement("div");
        tabBar.className = "dchat-tab-bar split-button";
        tabBar.append(...this.getLocalizedLabels().map(tab => this._buildTabButton(doc, tab)));
        return tabBar;
    }

    static _buildTabButton(doc, tab) {
        const isActive = tab.id === this.activeTab;
        const button = doc.createElement("button");
        button.type = "button";
        button.className = `ui-control icon fas ${tab.icon} dchat-tab${isActive ? " active" : ""}`;
        button.dataset.dchatTab = tab.id;
        button.dataset.tooltip = tab.label;
        button.setAttribute("aria-label", tab.label);
        button.setAttribute("aria-pressed", String(isActive));

        if (this.unreadTabs.has(tab.id)) this._ensurePip(button);
        return button;
    }

    static _bindTabBar(element) {
        element.querySelector(".dchat-tab-bar")?.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-dchat-tab]");
            if (btn) this.switch(btn.dataset.dchatTab);
        });
    }

    static _applyFilterClass(container, messageList, tabId) {
        const filterClasses = Object.values(MessageClassifier.TABS).map(tab => `dchat-filter-${tab}`);
        for (const element of [container, messageList]) {
            element.classList.remove(...filterClasses);
            element.classList.add(`dchat-filter-${tabId}`);
        }
    }

    static _syncTabButtons(container, tabId) {
        container.querySelectorAll(".dchat-tab-bar .dchat-tab").forEach((button) => {
            const isActive = button.dataset.dchatTab === tabId;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
            if (isActive) button.querySelector(".dchat-pip")?.remove();
        });
    }

    static _ensurePip(button) {
        if (button.querySelector(".dchat-pip")) return;

        const pip = getDocument(button).createElement("span");
        pip.className = "dchat-pip";
        button.appendChild(pip);
    }

    static _scrollToBottom(messageList) {
        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });
    }
}
