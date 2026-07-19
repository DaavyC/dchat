import {
    CHAT_CLASSES,
    CHAT_SELECTORS,
    CHAT_TAB_CONFIG,
    MESSAGE_TYPES,
    MODULE_ID
} from "../constants.js";
import {
    classifyMessage,
    getDocument,
    getElement,
    isPinnedMessage
} from "../utils.js";

let refreshPinsUi = () => {};
const i18nKey = key => `daavy-chat.${key}`;
const TEMPLATE_PATH = `modules/${MODULE_ID}/templates/main.hbs`;

export function setPinRefreshHandler(handler) {
    refreshPinsUi = typeof handler === "function" ? handler : refreshPinsUi;
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

        refreshPinsUi();
    }

    static getPinnedMessages() {
        return (game.messages.contents ?? []).filter(isPinnedMessage);
    }

    static createManagerButton(documentRef) {
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = CHAT_CLASSES.PIN_MANAGER;

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

        return renderTemplate(TEMPLATE_PATH, {
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
        toggle.className = CHAT_CLASSES.PIN_TOGGLE;
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
        messageElement.classList.toggle(CHAT_CLASSES.PINNED, pinned);

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

    static async _handlePinResponse(response) {
        if (response.requesterId !== game.user?.id) return;

        if (response.status === "approved") {
            await game.messages.get(response.messageId)?.setFlag(MODULE_ID, "pinned", true);
        }

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
            content: await renderTemplate(TEMPLATE_PATH, {
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

