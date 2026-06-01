import { PRIVATE_MESSAGE_DATA, SETTING_KEYS } from "../config.js";
import { getElement, isCurrentUserAuthor } from "../utils.js";
import { isSettingEnabled } from "../settings.js";

export class HidePrivateMessages {
    static _notifyPatched = false;

    static onReady() {
        this._patchChatLogNotify();
    }

    static _patchChatLogNotify() {
        if (this._notifyPatched) return;

        const ChatLogClass = globalThis.foundry?.applications?.sidebar?.tabs?.ChatLog;
        const originalNotify = ChatLogClass?.prototype?.notify;
        if (typeof originalNotify !== "function") return;

        const featureClass = this;
        ChatLogClass.prototype.notify = function (message, options) {
            if (isSettingEnabled(SETTING_KEYS.HIDE_PRIVATE_MESSAGES) && featureClass.shouldHideMessage(message)) return;
            return originalNotify.call(this, message, options);
        };

        this._notifyPatched = true;
    }

    static isAuthor(message) {
        return isCurrentUserAuthor(message);
    }

    static shouldHideMessage(message) {
        if (!message) return false;

        const isPrivateRoll = !!((message.isRoll || message.rolls?.length) && (message.blind || message.whisper?.length));
        return isPrivateRoll && !this.isAuthor(message) && message.isContentVisible === false;
    }

    static processMessage(message, renderedHtml) {
        const messageElement = getElement(renderedHtml);
        if (!messageElement || !this.shouldHideMessage(message)) return;

        messageElement.hidden = true;
        messageElement.setAttribute("aria-hidden", "true");
        messageElement.dataset[PRIVATE_MESSAGE_DATA.HIDDEN] = "true";
    }
}
