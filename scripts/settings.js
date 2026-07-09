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
            .filter(row => this._isUngroupedSettingRow(row));
        if (!rows.length) return;

        const fieldset = this._createGroupFieldset(documentRef, groupKey);
        rows[0].replaceWith(fieldset);

        for (const row of rows) {
            row.remove();
            row.classList.add(SETTINGS_CLASSES.ROW);
            fieldset.appendChild(row);
        }
    }

    static _createGroupFieldset(documentRef, groupKey) {
        const fieldset = documentRef.createElement("fieldset");
        fieldset.className = SETTINGS_CLASSES.GROUP;

        const legend = documentRef.createElement("legend");
        legend.textContent = game.i18n.localize(`${SETTINGS_GROUP_PREFIX}.${groupKey}`);
        legend.className = SETTINGS_CLASSES.GROUP_TITLE;
        fieldset.appendChild(legend);

        return fieldset;
    }

    static _findSettingRow(container, key) {
        const settingId = `${MODULE_ID}.${key}`;
        return container.querySelector(`[data-setting-id="${settingId}"]`)?.closest(".form-group")
            ?? container.querySelector(`[id$="${settingId}"]`)?.closest(".form-group")
            ?? null;
    }

    static _isUngroupedSettingRow(row) {
        return row && !row.closest(`.${SETTINGS_CLASSES.GROUP}`);
    }
}

export function registerModuleSettings() {
    for (const setting of Object.values(SETTINGS)) {
        registerBooleanSetting(setting);
    }
}

function registerBooleanSetting({ key, ...options }) {
    game.settings.register(MODULE_ID, key, {
        scope: "client",
        config: true,
        default: options.default ?? false,
        type: Boolean,
        ...options
    });
}

export function isSettingEnabled(key) {
    return game.settings.get(MODULE_ID, key);
}
