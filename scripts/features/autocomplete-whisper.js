import { createAbortController, getChatSection, getDocument, getElement } from "../core.js";
import { isSettingEnabled, registerBooleanSetting } from "./settings.js";
import { replaceEditorRange } from "./autocomplete-whisper/editor.js";
import { getEditorText, getMatchState } from "./autocomplete-whisper/match.js";
import {
    clearEditableState,
    createPopup,
    hidePopup,
    prepareEditable,
    renderPopup,
    resolveEditable,
    resolveEditor,
    resolveHost
} from "./autocomplete-whisper/popup.js";
import { getSuggestions, normalizeName } from "./autocomplete-whisper/suggestions.js";

export class AutocompleteWhisper {
    static HOST_SELECTOR = "#chat-notifications, #chat-form, form.chat-form";
    static EDITOR_SELECTOR = "prose-mirror[name='message'], prose-mirror, .editor-content[contenteditable='true'], [contenteditable='true']";
    static MAX_RESULTS = 6;
    static _trackedHosts = new Set();
    static _states = new WeakMap();
    static _boundFocusDocuments = new WeakSet();
    static _bootstrapWatcher = null;
    static _bootstrapAttempts = 0;

    static init() {
        registerBooleanSetting("autocompleteWhisper", {
            name: "DCHAT.Settings.autocompleteWhisper.Name",
            hint: "DCHAT.Settings.autocompleteWhisper.Hint"
        });

        this._scheduleStartupRefreshes();
        this._startBootstrapWatcher();
        this._bindGlobalFocusListener();
    }

    static onReady() {
        this._bindGlobalFocusListener();
        this._scheduleStartupRefreshes();
    }

    static onRenderChatInput(app, elements) {
        this.refresh(app?.element, elements);
    }

    static onRenderChatLog(html) {
        this.refresh(getElement(html));
    }

    static onRenderSidebar(html) {
        this.refresh(getChatSection(html));
    }

    static onChangeSidebarTab(app) {
        if (app?.tabName === "chat") this.refresh(app?.element);
    }

    static onDetachedWindowChange() {
        this._scheduleStartupRefreshes();
    }

    static _scheduleRefresh() {
        requestAnimationFrame(() => {
            this._bindGlobalFocusListener();
            this.refresh();
        });
    }

    static _scheduleStartupRefreshes() {
        for (const delay of [0, 150, 500, 1200, 2500, 5000]) {
            globalThis.setTimeout(() => this._scheduleRefresh(), delay);
        }
    }

    static _startBootstrapWatcher() {
        if (this._bootstrapWatcher) return;

        this._bootstrapAttempts = 0;
        this._bootstrapWatcher = globalThis.setInterval(() => {
            this._bootstrapAttempts += 1;
            if (this.refresh() || this._bootstrapAttempts >= 20) {
                globalThis.clearInterval(this._bootstrapWatcher);
                this._bootstrapWatcher = null;
            }
        }, 500);
    }

    static _bindGlobalFocusListener() {
        this._bindFocusListener(globalThis.document);
    }

    static _bindFocusListener(doc) {
        if (!doc || this._boundFocusDocuments.has(doc)) return;

        this._boundFocusDocuments.add(doc);
        doc.addEventListener("focusin", (event) => {
            const target = event.target;
            const editor = target?.matches?.(this.EDITOR_SELECTOR)
                ? target
                : target?.closest?.(this.EDITOR_SELECTOR);
            if (!editor) return;

            this._attach(editor);
        }, true);
    }

    static _pruneHosts() {
        for (const host of Array.from(this._trackedHosts)) {
            if (host?.isConnected) continue;
            this._teardown(host);
            this._trackedHosts.delete(host);
        }
    }

    static refresh(element = null, elements = null) {
        this._pruneHosts();

        let attached = false;
        if (elements) attached = this._attachFromElements(elements) || attached;

        const root = getElement(element);
        if (root) attached = this._attach(root) || attached;

        const currentHost = globalThis.document?.querySelector?.(this.HOST_SELECTOR);
        if (currentHost) attached = this._attach(currentHost) || attached;

        for (const host of Array.from(this._trackedHosts)) {
            attached = this._attach(host) || attached;
        }

        return attached;
    }

    static _attachFromElements(elements) {
        let attached = false;
        for (const element of Object.values(elements ?? {})) {
            attached = this._attach(element) || attached;
        }
        return attached;
    }

    static _attach(root) {
        const host = this._resolveHost(root);
        if (!host) return false;

        this._trackedHosts.add(host);
        this._bindFocusListener(getDocument(host));

        if (!isSettingEnabled("autocompleteWhisper")) {
            this._teardown(host);
            return false;
        }

        const editor = this._resolveEditor(host);
        const editable = this._resolveEditable(editor);
        if (!this._canAttach(host, editor, editable)) return false;

        if (this._states.has(host)) {
            if (this._canReuseState(host, editor, editable)) {
                this._updateSuggestions(host);
                return true;
            }

            this._teardown(host);
        }

        const state = this._createState(host, editor, editable);
        this._states.set(host, state);
        host.classList.add("dchat-whisper-autocomplete-host");
        prepareEditable(editable, state.popup.id);
        this._bindStateEvents(state);

        this._updateSuggestions(host);
        return true;
    }

    static _canAttach(host, editor, editable) {
        if (editor && editable) return true;

        this._teardown(host);
        return false;
    }

    static _canReuseState(host, editor, editable) {
        const state = this._states.get(host);
        return !!state?.editor?.isConnected
            && !!state?.editable?.isConnected
            && state.editor === editor
            && state.editable === editable;
    }

    static _createState(host, editor, editable) {
        const popup = this._createPopup(host);

        return {
            controller: createAbortController(host),
            host,
            editor,
            editable,
            popup,
            popupId: popup.id,
            suggestions: [],
            activeIndex: 0,
            match: null
        };
    }

    static _bindStateEvents(state) {
        const refresh = () => this._updateSuggestions(state.host);
        this._bindEditableEvents(state, refresh);
        this._bindEditorEvents(state, refresh);
        this._bindPopupEvents(state);
    }

    static _bindEditableEvents(state, refresh) {
        const { editable, host, controller } = state;
        const signal = controller.signal;

        editable.addEventListener("input", refresh, { signal });
        editable.addEventListener("click", refresh, { signal });
        editable.addEventListener("focus", refresh, { signal });
        editable.addEventListener("keydown", (event) => this._onKeydown(host, event), { signal });
        editable.addEventListener("keyup", (event) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) refresh();
        }, { signal });
        editable.addEventListener("blur", () => {
            requestAnimationFrame(() => this._hidePopup(host));
        }, { signal });
    }

    static _bindEditorEvents(state, refresh) {
        const { editor, editable, controller } = state;
        if (editor === editable) return;

        editor.addEventListener("input", refresh, { signal: controller.signal });
        editor.addEventListener("change", refresh, { signal: controller.signal });
    }

    static _bindPopupEvents(state) {
        const { popup, host, controller } = state;
        const signal = controller.signal;

        popup.addEventListener("mousedown", (event) => {
            event.preventDefault();
        }, { signal });
        popup.addEventListener("click", (event) => {
            const option = event.target.closest("[data-dchat-whisper-index]");
            if (!option) return;
            const index = Number(option.dataset.dchatWhisperIndex);
            this._applySuggestion(host, index, { persist: event.shiftKey });
        }, { signal });
    }

    static _resolveHost(root) {
        return resolveHost(root, this.HOST_SELECTOR);
    }

    static _resolveEditor(host) {
        return resolveEditor(host);
    }

    static _resolveEditable(editor) {
        return resolveEditable(editor);
    }

    static _createPopup(host) {
        return createPopup(host);
    }

    static _teardown(host) {
        const state = this._states.get(host);
        if (state) {
            state.controller.abort();
            clearEditableState(state.editable);
            state.popup?.remove();
            this._states.delete(host);
        }

        host?.classList?.remove("dchat-whisper-autocomplete-host");
    }

    static _getEditorText(editable) {
        return getEditorText(editable);
    }

    static _getMatchState(editable) {
        return getMatchState(editable);
    }

    static _normalizeName(name) {
        return normalizeName(name);
    }

    static _getSuggestions(match) {
        return getSuggestions(match, game.users.contents, this.MAX_RESULTS);
    }

    static _updateSuggestions(host) {
        const state = this._states.get(host);
        if (!state) return;

        state.match = this._getMatchState(state.editable);
        if (!state.match) {
            this._hidePopup(host);
            return;
        }

        state.suggestions = this._getSuggestions(state.match);
        state.activeIndex = Math.min(state.activeIndex, Math.max(state.suggestions.length - 1, 0));

        if (!state.suggestions.length) {
            this._hidePopup(host);
            return;
        }

        this._renderPopup(host);
    }

    static _renderPopup(host) {
        const state = this._states.get(host);
        if (!state) return;
        renderPopup(state);
    }

    static _hidePopup(host) {
        const state = this._states.get(host);
        if (!state) return;
        hidePopup(state);
    }

    static _onKeydown(host, event) {
        const state = this._states.get(host);
        if (!state || state.popup.hidden || !state.suggestions.length) return;

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                state.activeIndex = (state.activeIndex + 1) % state.suggestions.length;
                this._renderPopup(host);
                break;
            case "ArrowUp":
                event.preventDefault();
                state.activeIndex = (state.activeIndex - 1 + state.suggestions.length) % state.suggestions.length;
                this._renderPopup(host);
                break;
            case "Enter":
            case "Tab":
                event.preventDefault();
                this._applySuggestion(host, state.activeIndex, { persist: event.shiftKey });
                break;
            case "Escape":
                event.preventDefault();
                this._hidePopup(host);
                break;
        }
    }

    static _applySuggestion(host, index, { persist = false } = {}) {
        const state = this._states.get(host);
        if (!state) return;

        const suggestion = state.suggestions[index];
        const match = state.match ?? this._getMatchState(state.editable);
        if (!suggestion || !match) return;

        const value = this._getEditorText(state.editable);
        const after = value.slice(match.targetEnd);
        const selectedNames = match.selectedNames.filter(name => name.toLocaleLowerCase() !== suggestion.name.toLocaleLowerCase());
        const recipients = [...selectedNames, suggestion.name];

        if (persist) {
            const replacement = `[${recipients.join(", ")}, ]`;
            this._replaceEditorRange(state, match.targetStart, match.targetEnd, replacement, replacement.length - 1);
            this._updateSuggestions(host);
            return;
        }

        const replacement = `[${recipients.join(", ")}]`;
        const spacer = /^\s/.test(after) ? "" : " ";
        this._replaceEditorRange(state, match.targetStart, match.targetEnd, `${replacement}${spacer}`);
        this._hidePopup(host);
    }

    static _replaceEditorRange(state, from, to, replacement, caretOffset = replacement.length) {
        replaceEditorRange(state, from, to, replacement, caretOffset);
    }
}
