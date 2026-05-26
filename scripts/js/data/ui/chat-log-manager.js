import { MessageClassifier, getElement } from "../../core.js";
import { ChatTabsManager } from "./chat-tabs-manager.js";
import { registerChatRefreshHooks } from "./refresh-hooks.js";

export class ChatLogManager {
    static _observers = new WeakMap();
    static BATCH_SIZE = 100;

    static init() {
        Hooks.on("renderChatLog", (app, html) => {
            const element = getElement(html);
            this._observeAndReplace(element);
        });

        registerChatRefreshHooks(this);
    }

    static _scheduleRefresh(element = null) {
        requestAnimationFrame(() => this.refresh(element));
    }

    static refresh(element = null) {
        const container = getElement(element);
        if (container) {
            this.injectClearButton(container);
            return;
        }

        ChatTabsManager._getTrackedContainers().forEach(tracked => {
            this.injectClearButton(tracked);
        });
    }

    static _observeAndReplace(element) {
        if (!element) return;

        this._observers.get(element)?.disconnect();
        this.injectClearButton(element);

        const observer = new MutationObserver(() => {
            this.injectClearButton(element);
        });

        observer.observe(element, { childList: true, subtree: true });
        this._observers.set(element, observer);
    }

    static _createScopedClearButton(doc) {
        const button = doc.createElement("button");
        button.type = "button";
        button.className = "ui-control icon fas fa-trash dchat-scoped-clear";
        button.dataset.action = "scopedClear";

        const tooltip = game.i18n.localize("DCHAT.Clear.Tooltip");
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

    static injectClearButton(html) {
        const element = getElement(html);
        if (!element) return;

        const toolbar = ChatTabsManager._ensureModuleToolbar(element);
        if (!toolbar) return;

        const scopedButtons = Array.from(toolbar.querySelectorAll(".dchat-scoped-clear"));
        if (!game.user?.isGM) {
            scopedButtons.forEach(button => button.remove());
            return;
        }

        const doc = element.ownerDocument ?? globalThis.document;
        const scopedBtn = scopedButtons.shift() ?? null;
        scopedButtons.forEach(button => button.remove());

        const newBtn = scopedBtn ?? this._createScopedClearButton(doc);
        this._getFoundryClearButton(element)?.remove();

        if (!toolbar.contains(newBtn)) {
            toolbar.appendChild(newBtn);
        }
    }

    static async scopedClearChatLog(clearAll = false) {
        if (!game.user?.isGM) return;

        const tabLabel = this._getClearLabel(clearAll);
        const messages = this._getMessagesToClear(clearAll);

        if (!messages.length) {
            return ui.notifications.info(game.i18n.format("DCHAT.Clear.NoMessages", { label: tabLabel }));
        }

        if (!await this._confirmClear(tabLabel, messages.length)) return;

        const messageIds = messages.map(m => m.id);
        await this._deleteInBatches(messageIds);

        ui.notifications.info(game.i18n.format("DCHAT.Clear.Success", { label: tabLabel, count: messageIds.length }));
    }

    static _getFoundryClearButton(element) {
        const controls = element.querySelector("#chat-controls");
        return controls?.querySelector('button[data-action="flush"]')
            ?? controls?.querySelector(".fa-trash, .fa-trash-can")?.closest("button")
            ?? null;
    }

    static _getClearLabel(clearAll) {
        if (clearAll) return game.i18n.localize("DCHAT.Tabs.All");

        const currentTab = ChatTabsManager.TAB_CONFIG.find(tab => tab.id === ChatTabsManager.activeTab);
        return game.i18n.localize(currentTab?.label ?? "DCHAT.Tabs.Chat");
    }

    static _getMessagesToClear(clearAll) {
        if (clearAll) return game.messages.contents;
        return game.messages.filter(message => MessageClassifier.classify(message) === ChatTabsManager.activeTab);
    }

    static _confirmClear(tabLabel, count) {
        return foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.format("DCHAT.Clear.Title", { label: tabLabel }) },
            content: `<p>${game.i18n.format("DCHAT.Clear.Confirm", { count, label: tabLabel })}</p>`,
            yes: { default: true },
            no: { default: false },
        });
    }

    static async _deleteInBatches(messageIds) {
        for (let i = 0; i < messageIds.length; i += this.BATCH_SIZE) {
            await ChatMessage.deleteDocuments(messageIds.slice(i, i + this.BATCH_SIZE));
        }
    }
}
