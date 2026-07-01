import {
    MODULE_ID,
    SETTING_DEFINITIONS,
    SETTING_GROUPS
} from "./config.js";
import { getDocument, getElement } from "./utils.js";

const SETTINGS_CLASSES = {
    ROW: "daavy-chat-settings-row",
    GROUP: "daavy-chat-settings-group",
    GROUP_TITLE: "daavy-chat-settings-group-title"
};
const SETTINGS_GROUP_PREFIX = "daavy-chat.Settings.Groups";
const RESET_DIALOG_PREFIX = "daavy-chat.Settings.Reset";

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
    registerResetMenu();

    for (const [key, options] of Object.entries(SETTING_DEFINITIONS)) {
        registerBooleanSetting(key, options);
    }
}

function registerResetMenu() {
    game.settings.registerMenu(MODULE_ID, "resetSettings", {
        name: `${RESET_DIALOG_PREFIX}.Name`,
        hint: `${RESET_DIALOG_PREFIX}.Hint`,
        icon: "fas fa-layer-group",
        type: ResetSettingsDialog,
        restricted: true
    });
}

function registerBooleanSetting(key, options) {
    game.settings.register(MODULE_ID, key, {
        scope: "client",
        config: true,
        default: getSettingDefault(options),
        type: Boolean,
        ...options
    });
}

export function isSettingEnabled(key) {
    return game.settings.get(MODULE_ID, key);
}

async function resetSettingsToDefaults(app) {
    await Promise.all(Object.entries(SETTING_DEFINITIONS).map(([key, options]) => (
        game.settings.set(MODULE_ID, key, getSettingDefault(options))
    )));
    app?.render?.(true);
}

async function confirmResetSettings(app = game.settings.sheet) {
    const confirmed = await showResetConfirmation();
    if (!confirmed) return;

    await resetSettingsToDefaults(app);
}

class ResetSettingsDialog extends (globalThis.FormApplication ?? class {}) {
    render() {
        return confirmResetSettings(game.settings.sheet);
    }
}

async function showResetConfirmation() {
    const options = getResetDialogOptions();
    const DialogV2 = globalThis.foundry?.applications?.api?.DialogV2;
    if (DialogV2) return DialogV2.confirm(options);

    return new Promise(resolve => {
        globalThis.Dialog.confirm({
            title: options.window.title,
            content: options.content,
            yes: () => resolve(true),
            no: () => resolve(false),
            defaultYes: false
        });
    });
}

function getResetDialogOptions() {
    return {
        window: { title: localizeReset("Title") },
        content: `<p>${localizeReset("Content")}</p>`,
        yes: {
            action: "yes",
            icon: "fa-solid fa-check",
            label: localizeReset("Yes")
        },
        no: {
            action: "no",
            icon: "fa-solid fa-xmark",
            label: localizeReset("No")
        }
    };
}

function localizeReset(key) {
    return game.i18n.localize(`${RESET_DIALOG_PREFIX}.Confirm.${key}`);
}

function getSettingDefault(options) {
    return options.default ?? false;
}
