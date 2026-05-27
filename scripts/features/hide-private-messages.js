import { getElement, isCurrentUserAuthor } from "../core.js";
import { isSettingEnabled, registerBooleanSetting } from "./settings.js";

export class HidePrivateMessages {
    static _notifyPatched = false;

    // Registers private message hiding.
    static init() {
        registerBooleanSetting("hidePrivateMessages", {
            name: "DCHAT.Settings.HidePrivateMessages.Name",
            hint: "DCHAT.Settings.HidePrivateMessages.Hint",
            scope: "world",
            restricted: true,
        });
    }

    static onReady() {
        this._patchChatLogNotify();
    }

    // Patches chat notifications for hidden private rolls.
    static _patchChatLogNotify() {
        if (this._notifyPatched) return;

        const ChatLog = globalThis.foundry?.applications?.sidebar?.tabs?.ChatLog;
        const originalNotify = ChatLog?.prototype?.notify;
        if (typeof originalNotify !== "function") return;

        const self = this;
        ChatLog.prototype.notify = function (message, options) {
            if (isSettingEnabled("hidePrivateMessages") && self.shouldHideMessage(message)) return;
            return originalNotify.call(this, message, options);
        };

        this._notifyPatched = true;
    }

    // Checks if the current user authored a message.
    static isAuthor(message) {
        return isCurrentUserAuthor(message);
    }

    // Checks if a private roll should be hidden.
    static shouldHideMessage(message) {
        if (!message) return false;

        const isPrivateRoll = !!((message.isRoll || message.rolls?.length) && (message.blind || message.whisper?.length));
        return isPrivateRoll && !this.isAuthor(message) && message.isContentVisible === false;
    }

    // Hides private roll markup.
    static processMessage(message, html) {
        const el = getElement(html);
        if (!el || !this.shouldHideMessage(message)) return;

        el.hidden = true;
        el.setAttribute("aria-hidden", "true");
        el.dataset.dchatPrivateHidden = "true";
    }
}
