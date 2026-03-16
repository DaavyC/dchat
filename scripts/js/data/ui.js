import { MessageClassifier, getElement } from "../core.js";

// ——— Tabs ———
export class ChatTabsManager {
    static TAB_CONFIG = [
        { id: MessageClassifier.TABS.CHAT, label: "DCHAT.Tabs.Chat", icon: "fa-comments" },
        { id: MessageClassifier.TABS.GAME, label: "DCHAT.Tabs.Game", icon: "fa-dice-d20" },
        { id: MessageClassifier.TABS.WHISPER, label: "DCHAT.Tabs.Whispers", icon: "fa-lock" },
    ];

    static _localizedLabels = null;

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

    static _tabBarElement = null;

    static activeTab = MessageClassifier.TABS.CHAT;
    static unreadTabs = new Set();

    static init() {
        Hooks.once("i18nInit", () => {
            ChatTabsManager._localizedLabels = null;
        });
    }

    static inject(element) {
        if (!element || element.querySelector(".dchat-tab-bar")) return;

        const messageLog = this._getMessageList(element);
        if (!messageLog) return;

        const chatForm = element.querySelector("#chat-form, form.chat-form");
        const chatControls = element.querySelector("#chat-controls");
        const tabBarFragment = document.createRange().createContextualFragment(this._buildHTML());

        if (chatControls) {
            chatControls.prepend(tabBarFragment);
        } else if (chatForm) {
            chatForm.prepend(tabBarFragment);
        } else {
            messageLog.parentElement.insertBefore(tabBarFragment, messageLog.nextSibling);
        }

        element.classList.add(`dchat-filter-${this.activeTab}`);
        messageLog.classList.add(`dchat-filter-${this.activeTab}`);
        this.classifyExistingMessages(element);

        element.querySelector(".dchat-tab-bar")?.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-dchat-tab]");
            if (btn) this.switch(btn.dataset.dchatTab);
        });
    }

    static switch(tabId) {
        if (this.activeTab === tabId) return;

        this.activeTab = tabId;
        this.unreadTabs.delete(tabId);

        const container = this._getChatLogContainer();
        const messageList = container ? this._getMessageList(container) : null;
        if (!container || !messageList) return;

        [container, messageList].forEach(el => {
            el.classList.remove(...Object.values(MessageClassifier.TABS).map(t => `dchat-filter-${t}`));
            el.classList.add(`dchat-filter-${tabId}`);
        });

        document.querySelectorAll(".dchat-tab-bar .dchat-tab").forEach((btn) => {
            const isActive = btn.dataset.dchatTab === tabId;
            btn.classList.toggle("active", isActive);
            btn.setAttribute("aria-pressed", String(isActive));
            if (isActive) btn.querySelector(".dchat-pip")?.remove();
        });

        requestAnimationFrame(() => {
            messageList.scrollTop = messageList.scrollHeight;
        });
    }

    static addNotification(tabId) {
        if (tabId === this.activeTab) return;
        this.unreadTabs.add(tabId);

        document.querySelectorAll(`.dchat-tab[data-dchat-tab="${tabId}"]`).forEach(btn => {
            if (!btn.querySelector(".dchat-pip")) {
                btn.insertAdjacentHTML("beforeend", '<span class="dchat-pip"></span>');
            }
        });
    }

    static classifyExistingMessages(container) {
        container.querySelectorAll("[data-message-id]").forEach(msgEl => {
            const message = game.messages.get(msgEl.dataset.messageId);
            if (message) {
                msgEl.setAttribute("data-dchat-type", MessageClassifier.classify(message));
            }
        });
    }

    static _buildHTML() {
        const labels = this.getLocalizedLabels();
        const buttons = labels.map((tab) => {
            const isActive = tab.id === this.activeTab;
            const isActiveClass = isActive ? "active" : "";
            const hasPip = this.unreadTabs.has(tab.id) ? `<span class="dchat-pip"></span>` : "";

            return `
                <button type="button"
                        class="ui-control icon fas ${tab.icon} dchat-tab ${isActiveClass}"
                        data-dchat-tab="${tab.id}"
                        data-tooltip="${tab.label}"
                        aria-label="${tab.label}"
                        aria-pressed="${isActive}">
                    ${hasPip}
                </button>`;
        }).join("");

        return `<div class="dchat-tab-bar split-button">${buttons}</div>`;
    }

    static _getChatLogContainer() {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            const chatTab = sidebar.querySelector("#chat") ?? sidebar.querySelector("[data-tab='chat']");
            if (chatTab) return chatTab;
        }
        return document.querySelector(".app.chat-popout, .app.chat-log")
            ?? document.getElementById("chat-log")?.closest(".tab, .app, section");
    }

    static _getMessageList(container) {
        return container.querySelector("#chat-log, .chat-log, ol.chat-messages, [class*='chat-log']");
    }
}

// ——— Settings ———
export class SettingsManager {
    static MODULE_ID = "dchat";

    static GROUPS = {
        "Settings": ["cleanerChat", "collapsibleFormula", "compactChat"],
        "PF2eOnly": ["hideDamageTraits", "traitFilter", "hideDamageButtons"]
    };

    static init() {
        Hooks.on("renderSettingsConfig", (app, html) => this.groupSettings(html));
    }

    static groupSettings(html) {
        const container = getElement(html);
        if (!container) return;

        const doc = container.ownerDocument || document;

        for (const [groupKey, settingKeys] of Object.entries(this.GROUPS)) {
            const groupLabel = game.i18n.localize(`DCHAT.Settings.Groups.${groupKey}`);
            const fieldset = doc.createElement("fieldset");

            Object.assign(fieldset.style, {
                border: "1px solid var(--color-border-light-primary, #a1a1a1)",
                borderRadius: "5px",
                margin: "15px 0",
                padding: "10px",
                display: "block"
            });

            const legend = doc.createElement("legend");
            legend.textContent = groupLabel;
            Object.assign(legend.style, {
                padding: "0 5px",
                fontWeight: "bold",
                fontSize: "var(--font-size-14, 14px)",
                color: "var(--color-text-primary, #f0f0e0)"
            });
            fieldset.appendChild(legend);

            let firstSettingGroup = null;

            for (const key of settingKeys) {
                const settingId = `${this.MODULE_ID}.${key}`;
                const settingGroup = container.querySelector(`[data-setting-id="${settingId}"]`)?.closest(".form-group") ||
                    container.querySelector(`[id$="${settingId}"]`)?.closest(".form-group");

                if (settingGroup) {
                    if (!firstSettingGroup) {
                        firstSettingGroup = settingGroup;
                        settingGroup.replaceWith(fieldset);
                    } else {
                        settingGroup.remove();
                    }
                    fieldset.appendChild(settingGroup);
                    settingGroup.style.margin = "5px 0";
                    settingGroup.style.border = "none";
                }
            }
        }
    }
}

// ——— Chat Log ———
export class ChatLogManager {
    static init() {
        Hooks.on("renderChatLog", (app, html) => {
            const element = getElement(html);
            this._observeAndReplace(element);
        });
    }

    static _observeAndReplace(element) {
        if (!element) return;
        this.injectClearButton(element);

        const observer = new MutationObserver(() => {
            this.injectClearButton(element);
        });

        observer.observe(element, { childList: true, subtree: true });
    }

    static injectClearButton(html) {
        const element = getElement(html);
        if (!element) return;

        const clearBtn = element.querySelector('button[data-action="flush"]')
            ?? element.querySelector('.control-buttons .fa-trash, .control-buttons .fa-trash-can')?.closest("button");

        if (!clearBtn || clearBtn.dataset.action === "scopedClear") return;

        const newBtn = clearBtn.cloneNode(true);
        newBtn.removeAttribute("data-action");
        newBtn.dataset.action = "scopedClear";
        const tooltip = game.i18n.localize("DCHAT.Clear.Tooltip");
        newBtn.dataset.tooltip = tooltip;
        newBtn.title = tooltip;

        clearBtn.replaceWith(newBtn);
        newBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await this.scopedClearChatLog(event.shiftKey);
        });
    }

    static async scopedClearChatLog(clearAll = false) {
        const currentTabId = ChatTabsManager.activeTab;
        const currentTab = ChatTabsManager.TAB_CONFIG.find(t => t.id === currentTabId);

        const tabLabel = clearAll
            ? game.i18n.localize("DCHAT.Tabs.All")
            : game.i18n.localize(currentTab?.label ?? "DCHAT.Tabs.Chat");

        const messages = clearAll
            ? game.messages.contents
            : game.messages.filter(msg => MessageClassifier.classify(msg) === currentTabId);

        if (!messages.length) {
            return ui.notifications.info(game.i18n.format("DCHAT.Clear.NoMessages", { label: tabLabel }));
        }

        const confirmed = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.format("DCHAT.Clear.Title", { label: tabLabel }) },
            content: `<p>${game.i18n.format("DCHAT.Clear.Confirm", { count: messages.length, label: tabLabel })}</p>`,
            yes: { default: true },
            no: { default: false },
        });

        if (!confirmed) return;

        const messageIds = messages.map(m => m.id);
        const BATCH_SIZE = 100;
        for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
            await ChatMessage.deleteDocuments(messageIds.slice(i, i + BATCH_SIZE));
        }

        ui.notifications.info(game.i18n.format("DCHAT.Clear.Success", { label: tabLabel, count: messageIds.length }));
    }
}
