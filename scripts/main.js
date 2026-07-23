import {
    CHAT_CLASSES,
    CHAT_DATA,
    CHAT_SELECTORS,
    CHAT_TAB_CONFIG,
    MESSAGE_TYPES,
    MODULE_ID,
    PIN_TEMPLATE_PATH,
    PROSE_MIRROR_SELECTOR,
    SETTINGS
} from "./constants.js";
import { isSettingEnabled, registerModuleSettings } from "./settings.js";
import {
    classifyMessage,
    getDocument,
    getElement,
    i18nKey,
    isCurrentUserAuthor,
    isPinnedMessage
} from "./utils.js";
import { AutocompleteWhisper } from "./features/autocomplete-whisper.js";
import { HideDamageButtons, TraitFilter } from "./features/pf2e.js";
import "./hooks.js";

const HIDE_CHAT_FORMATTING_CLASS = "daavy-chat-hide-chat-formatting";
const SHOW_FORMULA_CLASS = "daavy-chat-show";
const ROLL_SELECTOR = ".dice-roll";
const ROLL_TITLE_SELECTOR = ".dice-roll h4";
const FORMULA_SELECTOR = ".dice-formula";

export class HideChatInitiative {
    static preCreateChatMessage(message, creationData) {
        if (!isSettingEnabled(SETTINGS.HIDE_CHAT_INITIATIVE.key)) return;

        const messageData = creationData ? foundry.utils.expandObject(creationData) : message.toObject();
        if (foundry.utils.getProperty(messageData, "flags.core.initiativeRoll") !== true) return;

        return false;
    }
}

export class HidePrivateMessages {
    static _notifyPatched = false;

    static onReady() {
        if (this._notifyPatched) return;

        const ChatLogClass = globalThis.foundry?.applications?.sidebar?.tabs?.ChatLog;
        const originalNotify = ChatLogClass?.prototype?.notify;
        if (typeof originalNotify !== "function") return;

        ChatLogClass.prototype.notify = function (message, options) {
            if (isSettingEnabled(SETTINGS.HIDE_PRIVATE_MESSAGES.key) && HidePrivateMessages.shouldHideMessage(message)) return;
            return originalNotify.call(this, message, options);
        };

        this._notifyPatched = true;
    }

    static shouldHideMessage(message) {
        if (!message) return false;

        const isRoll = Boolean(message.isRoll || message.rolls?.length);
        const isPrivate = Boolean(message.blind || message.whisper?.length);
        const isPrivateRoll = isRoll && isPrivate;
        return isPrivateRoll && !isCurrentUserAuthor(message) && message.isContentVisible === false;
    }

    static processMessage(message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement || !this.shouldHideMessage(message)) return;

        messageElement.hidden = true;
        messageElement.setAttribute("aria-hidden", "true");
    }
}

export class HideChatFormatting {
    static _observers = new WeakMap();

    static observe(renderedHtml) {
        const container = getElement(renderedHtml);
        if (!container) return;

        this.refresh(container);
        if (this._observers.has(container)) return;

        const observer = new MutationObserver(() => this.refresh(container));
        observer.observe(container, { childList: true, subtree: true });
        this._observers.set(container, observer);
    }

    static refresh(...renderedRoots) {
        const shouldHideFormatting = isSettingEnabled(SETTINGS.HIDE_CHAT_FORMATTING.key);

        renderedRoots
            .flatMap(getRenderedElements)
            .flatMap(findChatEditors)
            .forEach(editor => editor.classList.toggle(HIDE_CHAT_FORMATTING_CLASS, shouldHideFormatting));
    }
}

function getRenderedElements(renderedRoot) {
    const rootElement = getElement(renderedRoot);
    if (rootElement) return [rootElement];
    return Object.values(renderedRoot ?? {}).map(getElement).filter(Boolean);
}

function findChatEditors(rootElement) {
    const editors = Array.from(rootElement.querySelectorAll(PROSE_MIRROR_SELECTOR));
    if (rootElement.matches?.(PROSE_MIRROR_SELECTOR)) editors.unshift(rootElement);
    return editors;
}

class CollapsibleFormula {
    static processMessage(_message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement) return;

        messageElement.querySelectorAll(ROLL_SELECTOR).forEach(roll => {
            const title = roll.querySelector(ROLL_TITLE_SELECTOR);
            const formula = roll.querySelector(FORMULA_SELECTOR);
            if (title && formula) {
                title.addEventListener("click", (event) => {
                    event.stopPropagation();
                    formula.classList.toggle(SHOW_FORMULA_CLASS);
                });
            }
        });
    }
}

export class ChatPins {
    static pendingRequest = null;
    static _socketActive = false;

    static onReady() {
        if (this._socketActive || !game.socket?.on) return;
        game.socket.on(`module.${MODULE_ID}`, payload => this._handleSocket(payload));
        this._socketActive = true;
    }

    static processMessage(message, renderedHtml) {
        const element = getElement(renderedHtml);
        if (!element) return;

        const messageType = classifyMessage(message);
        const pinned = isPinnedMessage(message);
        const mode = this._getPinMode(message, messageType, pinned);
        this._setPinnedState(element, pinned, mode);
        if (!mode) return;
        this._injectToggle(message, element, pinned, mode);
    }

    static refresh(element) {
        const container = getElement(element);
        if (container) this._refreshContainer(container);
    }

    static preDeleteMessage(message) {
        if (!isPinnedMessage(message)) return;

        globalThis.ui?.notifications?.warn?.(game.i18n.localize(i18nKey("Pin.DeletePinned")));
        return false;
    }

    static async unpinMessages(messages = []) {
        for (const message of messages) {
            if (!isPinnedMessage(message)) continue;
            await this._setPinnedFlag(message, false);
        }
    }

    static getPinnedMessages() {
        return (game.messages.contents ?? []).filter(isPinnedMessage);
    }

    static createManagerButton(documentRef) {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = "ui-control icon fas fa-thumbtack daavy-chat-pin-manager";

        const tooltip = game.i18n.localize(i18nKey("Pin.Manager"));
        button.dataset.tooltip = tooltip;
        button.title = tooltip;
        button.setAttribute("aria-label", tooltip);

        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.showManager();
        });

        return button;
    }

    static injectManagerButton(toolbar, documentRef) {
        const buttons = Array.from(toolbar.querySelectorAll(CHAT_SELECTORS.PIN_MANAGER));
        const managerButton = buttons.shift() ?? this.createManagerButton(documentRef);
        buttons.forEach(button => button.remove());

        if (!toolbar.contains(managerButton)) toolbar.appendChild(managerButton);
    }

    static removeManagerButtons(toolbar) {
        toolbar.querySelectorAll(CHAT_SELECTORS.PIN_MANAGER).forEach(button => button.remove());
    }

    static async showManager(activeTab = null) {
        const dialog = new foundry.applications.api.DialogV2({
            window: { title: game.i18n.localize(i18nKey("Pin.Manager")) },
            content: await this._renderManagerContent(activeTab),
            buttons: [{ action: "close", label: "Close" }]
        });

        dialog.addEventListener?.("render", event => this._bindManagerContent(event.target), { once: true });
        dialog.render({ force: true });
    }

    static async _renderManagerContent(activeTab = null) {
        const pinnedMessages = this.getPinnedMessages();
        const selectedTab = this._getManagerActiveTab(pinnedMessages, activeTab);
        const activeMessages = pinnedMessages.filter(message => classifyMessage(message) === selectedTab);

        return renderTemplate(PIN_TEMPLATE_PATH, {
            pinManager: true,
            activeTab: selectedTab,
            managerLabel: game.i18n.localize(i18nKey("Pin.Manager")),
            unpinAllLabel: game.i18n.localize(i18nKey("Pin.ManagerUnpinAll")),
            unpinLabel: game.i18n.localize(i18nKey("Pin.Unpin")),
            emptyLabel: game.i18n.localize(i18nKey("Pin.ManagerEmpty")),
            tabs: CHAT_TAB_CONFIG.map(tab => ({
                id: tab.id,
                icon: tab.icon,
                label: game.i18n.localize(tab.label),
                active: tab.id === selectedTab,
                count: pinnedMessages.filter(message => classifyMessage(message) === tab.id).length
            })),
            messages: activeMessages.map(message => ({
                id: message.id,
                author: this._getMessageAuthor(message) || message.id,
                time: this._getMessageTime(message),
                preview: this._getTextPreview(message.content)
            }))
        });
    }

    static _getManagerActiveTab(pinnedMessages, activeTab = null) {
        if (CHAT_TAB_CONFIG.some(tab => tab.id === activeTab)) return activeTab;
        if (pinnedMessages.some(message => classifyMessage(message) === MESSAGE_TYPES.CHAT)) return MESSAGE_TYPES.CHAT;
        return CHAT_TAB_CONFIG.find(tab => pinnedMessages.some(message => classifyMessage(message) === tab.id))?.id ?? MESSAGE_TYPES.CHAT;
    }

    static _refreshContainer(container) {
        const messageList = container.querySelector(CHAT_SELECTORS.MESSAGE_LIST);
        if (!messageList) return;

        const messageElements = Array.from(messageList.querySelectorAll(CHAT_SELECTORS.MESSAGE_ID));
        const pinnedElements = messageElements.filter(messageElement => {
            const message = game.messages.get(messageElement.dataset.messageId);
            const pinned = isPinnedMessage(message);
            const mode = this._getPinMode(message, classifyMessage(message), pinned);
            this._setPinnedState(messageElement, pinned, mode);
            return pinned;
        });

        pinnedElements.reverse().forEach(messageElement => messageList.prepend(messageElement));
    }

    static _getPinMode(message, messageType, pinned) {
        if (game.user?.isGM && message?.setFlag) return "pin";
        if (!game.user?.isGM && messageType === MESSAGE_TYPES.WHISPER && !pinned && message?.id) return "request";
        return null;
    }

    static _injectToggle(message, messageElement, pinned, mode) {
        const metadata = messageElement.querySelector(CHAT_SELECTORS.MESSAGE_METADATA);
        if (!metadata || metadata.querySelector(CHAT_SELECTORS.PIN_TOGGLE)) return;

        const toggle = getDocument(metadata).createElement("a");
        toggle.className = "daavy-chat-pin-toggle";
        toggle.tabIndex = 0;
        toggle.setAttribute("role", "button");

        const togglePinned = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (mode === "pin") {
                await message.setFlag(MODULE_ID, "pinned", isPinnedMessage(message) ? null : true);
            } else {
                this.requestPin(message);
            }
        };
        toggle.addEventListener("click", togglePinned);
        toggle.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") togglePinned(event);
        });

        this._syncToggle(toggle, pinned, mode);

        const deleteButton = metadata.querySelector(CHAT_SELECTORS.MESSAGE_DELETE);
        metadata.insertBefore(toggle, deleteButton ?? metadata.firstChild);
    }

    static _bindManagerContent(dialog) {
        dialog?.element?.addEventListener("click", async (event) => {
            const content = event.target.closest(".daavy-chat-pin-manager-content");
            if (!content) return;

            const tabButton = event.target.closest("[data-daavy-chat-pin-tab]");
            if (tabButton) {
                await this._refreshManagerDialog(dialog, tabButton.dataset.daavyChatPinTab);
                return;
            }

            const activeTab = content.dataset.daavyChatPinActiveTab;
            if (event.target.closest(".daavy-chat-pin-manager-unpin-all")) {
                await this.unpinMessages(this.getPinnedMessages().filter(message => classifyMessage(message) === activeTab));
                await this._refreshManagerDialog(dialog, activeTab);
                return;
            }

            const unpinButton = event.target.closest("[data-daavy-chat-unpin]");
            if (!unpinButton) return;

            const message = game.messages.get(unpinButton.dataset.daavyChatUnpin);
            await this.unpinMessages(message ? [message] : []);
            await this._refreshManagerDialog(dialog, activeTab);
        });
    }

    static async _refreshManagerDialog(dialog, activeTab = null) {
        const contentContainer = dialog?.element?.querySelector(".dialog-content");
        if (!contentContainer) return;

        contentContainer.innerHTML = await this._renderManagerContent(activeTab);
    }

    static _setPinnedState(messageElement, pinned, mode = null) {
        messageElement.classList.toggle("daavy-chat-pinned", pinned);

        const toggle = messageElement.querySelector(CHAT_SELECTORS.PIN_TOGGLE);
        if (!toggle) return;
        if (!mode) toggle.remove();
        else this._syncToggle(toggle, pinned, mode);
    }

    static _syncToggle(toggle, pinned, mode = "pin") {
        const label = game.i18n.localize(mode === "request" ? i18nKey("Pin.Request") : (pinned ? i18nKey("Pin.Unpin") : i18nKey("Pin.Pin")));
        toggle.classList.toggle(CHAT_CLASSES.ACTIVE, pinned);
        toggle.dataset.tooltip = label;
        toggle.title = label;
        toggle.setAttribute("aria-label", label);
        toggle.innerHTML = `<i class="fas fa-thumbtack"></i>`;
    }

    static requestPin(message) {
        const targetGm = this._getPinRequestGm();
        if (!targetGm) {
            globalThis.ui?.notifications?.warn?.(game.i18n.localize(i18nKey("Pin.NoGm")));
            return;
        }

        game.socket?.emit?.(`module.${MODULE_ID}`, {
            type: "pinRequest",
            requestId: foundry.utils.randomID(),
            requesterId: game.user.id,
            requesterName: game.user.name,
            targetGmId: targetGm.id,
            messageId: message.id,
            messageContent: message.content,
            messageAuthor: this._getMessageAuthor(message),
            messageTo: this._getMessageRecipients(message),
            messageTime: this._getMessageTime(message)
        });
        globalThis.ui?.notifications?.info?.(game.i18n.localize(i18nKey("Pin.Sent")));
    }

    static async _handleSocket(payload) {
        if (!payload || typeof payload !== "object") return;
        if (payload.type === "pinRequest") return this._handlePinRequest(payload);
        if (payload.type === "pinResponse") return this._handlePinResponse(payload);
    }

    static _handlePinResponse(response) {
        if (response.requesterId !== game.user?.id) return;

        const notificationKey = {
            approved: i18nKey("Pin.Approved"),
            denied: i18nKey("Pin.Denied"),
            busy: i18nKey("Pin.Busy")
        }[response.status];
        if (!notificationKey) return;

        const notify = response.status === "busy" || response.status === "denied" ? "warn" : "info";
        globalThis.ui?.notifications?.[notify]?.(game.i18n.localize(notificationKey));
    }

    static async _handlePinRequest(request) {
        if (!game.user?.isGM || request.targetGmId !== game.user.id) return;

        if (this.pendingRequest) {
            this._sendPinResponse(request, "busy");
            return;
        }

        this.pendingRequest = request;
        await this._showPinRequestDialog(request);
    }

    static async _showPinRequestDialog(request) {
        const resolveRequest = async (status) => {
            if (this.pendingRequest?.requestId !== request.requestId) return;
            this.pendingRequest = null;
            if (status === "approved") {
                const message = game.messages.get(request.messageId);
                if (message) await this._setPinnedFlag(message, true);
            }
            this._sendPinResponse(request, status);
        };

        new foundry.applications.api.DialogV2({
            window: { title: game.i18n.localize(i18nKey("Pin.RequestTitle")) },
            modal: true,
            content: await renderTemplate(PIN_TEMPLATE_PATH, {
                pinRequest: true,
                requesterLabel: game.i18n.localize(i18nKey("Pin.Requester")),
                requesterName: request.requesterName,
                author: request.messageAuthor,
                to: request.messageTo,
                time: request.messageTime,
                messageContent: request.messageContent ?? ""
            }),
            buttons: [
                {
                    action: "approved",
                    icon: "fas fa-check",
                    label: game.i18n.localize(i18nKey("Pin.Accept")),
                    class: "daavy-chat-pin-accept",
                    default: true,
                    callback: () => resolveRequest("approved")
                },
                {
                    action: "denied",
                    icon: "fas fa-times",
                    label: game.i18n.localize(i18nKey("Pin.Deny")),
                    class: "daavy-chat-pin-deny",
                    callback: () => resolveRequest("denied")
                }
            ],
            close: () => resolveRequest("denied"),
            rejectClose: false
        }).render({ force: true });
    }

    static async _setPinnedFlag(message, pinned) {
        if (typeof message?.setFlag !== "function") return false;
        try {
            await message.setFlag(MODULE_ID, "pinned", pinned ? true : null);
            return true;
        } catch {
            return false;
        }
    }

    static _getMessageAuthor(message) {
        return message.speaker?.alias ?? game.users.get?.(message.user?.id ?? message.user)?.name ?? "";
    }

    static _getMessageRecipients(message) {
        if (!Array.isArray(message.whisper) || !game.users?.get) return "";
        return message.whisper
            .map(userId => game.users.get(userId)?.name)
            .filter(Boolean)
            .join(", ");
    }

    static _getMessageTime(message) {
        const timestamp = Number(message.timestamp ?? message._source?.timestamp);
        if (!timestamp) return "";
        return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    static _getTextPreview(content = "") {
        const documentRef = globalThis.document;
        if (!documentRef) return String(content).slice(0, 120);

        const preview = documentRef.createElement("div");
        preview.innerHTML = content;
        return (preview.textContent || "").trim().slice(0, 120);
    }

    static _sendPinResponse(request, status) {
        game.socket?.emit?.(`module.${MODULE_ID}`, {
            type: "pinResponse",
            requestId: request.requestId,
            requesterId: request.requesterId,
            messageId: request.messageId,
            status
        });
    }

    static _getPinRequestGm() {
        return game.users.contents.find(user => user.active && user.isGM) ?? null;
    }
}

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
        button.className = "ui-control icon fas fa-trash daavy-chat-scoped-clear";

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

        const scopedButtons = Array.from(toolbar.querySelectorAll(".daavy-chat-scoped-clear"));
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
            ?.querySelector('button[data-action="flush"]')
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

        if (!toolbar.querySelector(CHAT_SELECTORS.TAB_BAR)) {
            toolbar.prepend(this._buildTabBar(getDocument(element)));
        }
        this._syncWhisperTarget(element);
        this._applyFilterClass(element, this.activeTab);
        this.classifyExistingMessages(element);
        ChatPins.refresh(element);

        ChatClearControls.injectClearButton(element);
    }

    static switch(tabId) {
        if (this.activeTab === tabId) return;

        this.activeTab = tabId;
        this.unreadTabs.delete(tabId);

        for (const container of this._getTrackedContainers()) {
            const messageList = this._getMessageList(container);
            if (!messageList) continue;

            this._applyFilterClass(container, tabId);
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
            ?? element.querySelector("#chat-form, form.chat-form")
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
        tabBar.className = "daavy-chat-tab-bar split-button";
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
        button.addEventListener("click", () => this.switch(tabConfig.id));

        if (this.unreadTabs.has(tabConfig.id)) this._ensurePip(button);
        return button;
    }

    static _applyFilterClass(container, tabId) {
        const filterClasses = Object.values(MESSAGE_TYPES).map(tab => `${CHAT_CLASSES.FILTER_PREFIX}-${tab}`);
        container.classList.remove(...filterClasses);
        container.classList.add(`${CHAT_CLASSES.FILTER_PREFIX}-${tabId}`);
    }

    static _syncTabButtons(container, tabId) {
        container.querySelectorAll(".daavy-chat-tab-bar .daavy-chat-tab").forEach((button) => {
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
        container.querySelector(".daavy-chat-whisper-target")?.remove();
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
        target.className = "daavy-chat-whisper-target";
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
        pip.className = "daavy-chat-pip";
        button.appendChild(pip);
    }

    static _scrollToBottom(messageList) {
        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });
    }
}

const messageFeatures = [
    { setting: SETTINGS.CLEANER_CHAT.key, css: "daavy-chat-cleaner-chat" },
    { setting: SETTINGS.HIDE_DAMAGE_TRAITS.key, css: "daavy-chat-hide-damage-traits" },
    { handler: TraitFilter, setting: SETTINGS.TRAIT_FILTER.key, css: "daavy-chat-trait-filter" },
    { handler: CollapsibleFormula, setting: SETTINGS.COLLAPSIBLE_FORMULA.key, css: "daavy-chat-collapsible-formula" },
    { setting: SETTINGS.COMPACT_CHAT.key, css: "daavy-chat-compact-chat" },
    { handler: HidePrivateMessages, setting: SETTINGS.HIDE_PRIVATE_MESSAGES.key },
    { handler: HideDamageButtons, setting: SETTINGS.HIDE_DAMAGE_BUTTONS.key }
];

export function initializeFeatures() {
    registerModuleSettings();
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
