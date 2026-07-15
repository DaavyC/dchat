import {
    MODULE_ID,
    SETTINGS,
    SETTING_GROUPS
} from "./config.js";
import { getDocument, getElement } from "./utils.js";

const SETTINGS_CLASSES = {
    ROW: "daavy-chat-settings-row",
    GROUP: "daavy-chat-settings-group",
    GROUP_TITLE: "daavy-chat-settings-group-title"
};
const SETTINGS_GROUP_PREFIX = "daavy-chat.Settings.Groups";

export class SettingsLayout {
    static groupSettings(renderedHtml) {
        const container = getElement(renderedHtml);
        if (!container) return;

        const documentRef = getDocument(container);

        for (const [groupKey, settingKeys] of Object.entries(SETTING_GROUPS)) {
            this._groupSettingRows(container, documentRef, groupKey, settingKeys);
        }
    }

    static _groupSettingRows(container, documentRef, groupKey, settingKeys) {
        const rows = settingKeys
            .map(key => this._findSettingRow(container, key))
            .filter(row => row && !row.closest(`.${SETTINGS_CLASSES.GROUP}`));
        if (!rows.length) return;

        const group = this._createGroup(documentRef, groupKey);
        rows[0].replaceWith(group);

        for (const row of rows) {
            row.remove();
            row.classList.add(SETTINGS_CLASSES.ROW);
            group.appendChild(row);
        }
    }

    static _createGroup(documentRef, groupKey) {
        const group = documentRef.createElement("div");
        group.className = SETTINGS_CLASSES.GROUP;
        group.setAttribute("role", "group");

        const title = documentRef.createElement("h3");
        title.id = `${MODULE_ID}-settings-group-${groupKey}`;
        title.textContent = game.i18n.localize(`${SETTINGS_GROUP_PREFIX}.${groupKey}`);
        title.className = SETTINGS_CLASSES.GROUP_TITLE;
        group.setAttribute("aria-labelledby", title.id);
        group.appendChild(title);

        return group;
    }

    static _findSettingRow(container, key) {
        const settingId = `${MODULE_ID}.${key}`;
        return container.querySelector(`[data-setting-id="${settingId}"]`)?.closest(".form-group")
            ?? container.querySelector(`[id$="${settingId}"]`)?.closest(".form-group")
            ?? null;
    }

}

export function registerModuleSettings() {
    for (const { key, ...options } of Object.values(SETTINGS)) {
        game.settings.register(MODULE_ID, key, {
            scope: "client",
            config: true,
            default: options.default ?? false,
            type: Boolean,
            ...options
        });
    }
}

export function isSettingEnabled(key) {
    return game.settings.get(MODULE_ID, key);
}
