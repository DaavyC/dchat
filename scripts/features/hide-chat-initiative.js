import { SETTING_KEYS } from "../config.js";
import { isSettingEnabled } from "../settings.js";

export class HideChatInitiative {
    static preCreateChatMessage(message, creationData) {
        if (!isSettingEnabled(SETTING_KEYS.HIDE_CHAT_INITIATIVE)) return;

        const messageData = creationData ? foundry.utils.expandObject(creationData) : message.toObject();
        if (foundry.utils.getProperty(messageData, "flags.core.initiativeRoll") !== true) return;

        return false;
    }
}
