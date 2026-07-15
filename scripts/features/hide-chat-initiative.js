import { SETTINGS } from "../config.js";
import { isSettingEnabled } from "../settings.js";

export class HideChatInitiative {
    static preCreateChatMessage(message, creationData) {
        if (!isSettingEnabled(SETTINGS.HIDE_CHAT_INITIATIVE.key)) return;

        const messageData = creationData ? foundry.utils.expandObject(creationData) : message.toObject();
        if (foundry.utils.getProperty(messageData, "flags.core.initiativeRoll") !== true) return;

        return false;
    }
}
