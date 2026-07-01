import { SETTING_KEYS } from "../config.js";
import { expandObject, getProperty } from "../utils.js";
import { isSettingEnabled } from "../settings.js";

export class HideChatInitiative {
    static preCreateChatMessage(message, creationData) {
        if (!isSettingEnabled(SETTING_KEYS.HIDE_CHAT_INITIATIVE)) return;

        const messageData = creationData ? expandObject(creationData) : message.toObject();
        if (getProperty(messageData, "flags.core.initiativeRoll") !== true) return;

        return false;
    }
}
