import {
    MODULE_ID,
    SETTING_DEFINITIONS,
    SETTING_GROUPS,
    SETTINGS_CLASSES,
    SETTINGS_I18N,
    SETTINGS_SELECTOR_FACTORIES,
    SETTINGS_SELECTORS
} from "./config.js";
import { getDocument, getElement } from "./utils.js";

export class SettingsManager {
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
            .filter(Boolean);
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
        legend.textContent = game.i18n.localize(`${SETTINGS_I18N.GROUP_PREFIX}.${groupKey}`);
        legend.className = SETTINGS_CLASSES.GROUP_TITLE;
        fieldset.appendChild(legend);

        return fieldset;
    }

    static _findSettingRow(container, key) {
        const settingId = `${MODULE_ID}.${key}`;
        return container.querySelector(SETTINGS_SELECTOR_FACTORIES.ROW(settingId))?.closest(SETTINGS_SELECTORS.FORM_GROUP)
            ?? container.querySelector(SETTINGS_SELECTOR_FACTORIES.INPUT(settingId))?.closest(SETTINGS_SELECTORS.FORM_GROUP)
            ?? null;
    }
}

export function registerModuleSettings() {
    for (const [key, options] of Object.entries(SETTING_DEFINITIONS)) {
        registerBooleanSetting(key, options);
    }
}

function registerBooleanSetting(key, options) {
    game.settings.register(MODULE_ID, key, {
        scope: "client",
        config: true,
        default: false,
        type: Boolean,
        ...options
    });
}

export function isSettingEnabled(key) {
    return game.settings.get(MODULE_ID, key);
}
