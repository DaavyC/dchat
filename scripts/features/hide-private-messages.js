import { SETTINGS } from "../constants.js";
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
