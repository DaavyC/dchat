import { registerBooleanSetting } from "./settings.js";

export class CompactChat {
    // Registers the compact chat setting.
    static init() {
        registerBooleanSetting("compactChat", {
            name: "DCHAT.Settings.compactChat.Name",
            hint: "DCHAT.Settings.compactChat.Hint"
        });
    }
}
