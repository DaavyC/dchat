import { MODULE_ID, getDocument, getElement } from "../../core.js";

export class SettingsManager {
    static MODULE_ID = MODULE_ID;

    static GROUPS = {
        "Settings": ["cleanerChat", "collapsibleFormula", "compactChat", "autocompleteWhisper", "hideChatInitiative", "hidePrivateMessages"],
        "PF2eOnly": ["hideDamageTraits", "traitFilter", "hideDamageButtons"]
    };

    static groupSettings(html) {
        const container = getElement(html);
        if (!container) return;

        const doc = getDocument(container);

        for (const [groupKey, settingKeys] of Object.entries(this.GROUPS)) {
            this._groupSettingRows(container, doc, groupKey, settingKeys);
        }
    }

    static _groupSettingRows(container, doc, groupKey, settingKeys) {
        const rows = settingKeys
            .map(key => this._findSettingRow(container, key))
            .filter(Boolean);
        if (!rows.length) return;

        const fieldset = this._createGroupFieldset(doc, groupKey);
        rows[0].replaceWith(fieldset);

        for (const row of rows) {
            row.remove();
            row.classList.add("dchat-settings-row");
            fieldset.appendChild(row);
        }
    }

    static _createGroupFieldset(doc, groupKey) {
        const fieldset = doc.createElement("fieldset");
        fieldset.className = "dchat-settings-group";

        const legend = doc.createElement("legend");
        legend.textContent = game.i18n.localize(`DCHAT.Settings.Groups.${groupKey}`);
        legend.className = "dchat-settings-group-title";
        fieldset.appendChild(legend);

        return fieldset;
    }

    static _findSettingRow(container, key) {
        const settingId = `${this.MODULE_ID}.${key}`;
        return container.querySelector(`[data-setting-id="${settingId}"]`)?.closest(".form-group")
            ?? container.querySelector(`[id$="${settingId}"]`)?.closest(".form-group")
            ?? null;
    }
}
