import {
    MODULE_ID,
    RESET_DIALOG,
    SETTING_DEFINITIONS,
    SETTING_GROUPS,
    SETTINGS_CLASSES,
    SETTINGS_I18N,
    SETTINGS_SELECTOR_FACTORIES,
    SETTINGS_SELECTORS
} from "./config.js";
import { getDocument, getElement } from "./utils.js";

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
    game.settings.registerMenu(MODULE_ID, RESET_DIALOG.MENU_KEY, {
        name: `${RESET_DIALOG.I18N_PREFIX}.Name`,
        hint: `${RESET_DIALOG.I18N_PREFIX}.Hint`,
        icon: RESET_DIALOG.MENU_ICON,
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

export class ResetSettingsDialog extends (globalThis.FormApplication ?? class {}) {
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
            action: RESET_DIALOG.YES_ACTION,
            icon: RESET_DIALOG.YES_ICON,
            label: localizeReset("Yes")
        },
        no: {
            action: RESET_DIALOG.NO_ACTION,
            icon: RESET_DIALOG.NO_ICON,
            label: localizeReset("No")
        }
    };
}

function localizeReset(key) {
    return game.i18n.localize(`${RESET_DIALOG.I18N_PREFIX}.Confirm.${key}`);
}

function getSettingDefault(options) {
    return options.default ?? false;
}
