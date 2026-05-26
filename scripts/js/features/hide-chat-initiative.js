import { MODULE_ID } from "../core.js";
import { expandObject, getProperty, registerBooleanSetting } from "./settings.js";

export class HideChatInitiative {
    // Registers the initiative hiding setting.
    static init() {
        registerBooleanSetting("hideChatInitiative", {
            name: "DCHAT.Settings.hideChatInitiative.Name",
            hint: "DCHAT.Settings.hideChatInitiative.Hint",
            scope: "world"
        });

        Hooks.on("preCreateChatMessage", (message, data) => {
            if (!game.settings.get(MODULE_ID, "hideChatInitiative")) return;

            const source = data ? expandObject(data) : message.toObject();
            if (!this.isInitiativeMessage(source)) return;

            return false;
        });
    }

    // Checks if a chat message is an initiative roll.
    static isInitiativeMessage(messageData) {
        return getProperty(messageData, "flags.core.initiativeRoll") === true;
    }
}
