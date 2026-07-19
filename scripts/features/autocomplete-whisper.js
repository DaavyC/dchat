import { SETTINGS } from "../constants.js";
import { createAbortController, getDocument, getElement } from "../utils.js";
import { isSettingEnabled } from "../settings.js";

const AUTOCOMPLETE_WHISPER = {
    HOST_SELECTOR: "#chat-notifications, #chat-form, form.chat-form",
    EDITOR_SELECTOR: "prose-mirror[name='message'], prose-mirror, .editor-content[contenteditable='true'], [contenteditable='true']",
    MESSAGE_EDITOR_SELECTOR: "prose-mirror[name='message'], prose-mirror",
    EDITABLE_SELECTOR: ".editor-content[contenteditable='true'], [contenteditable='true']",
    MAX_RESULTS: 6,
    CARET_NAVIGATION_KEYS: ["ArrowLeft", "ArrowRight", "Home", "End"],
    PREFIX_PATTERN: /^(\/w|\/whisper)\s+/i,
    HOST_CLASS: "daavy-chat-whisper-autocomplete-host",
    POPUP_CLASS: "daavy-chat-whisper-autocomplete",
    POPUP_ID_PREFIX: "daavy-chat-whisper",
    OPTION_CLASS: "daavy-chat-whisper-option",
    ACTIVE_OPTION_CLASS: "active",
    STATUS_CLASS: "daavy-chat-whisper-status",
    ACTIVE_STATUS_CLASS: "is-active",
    NAME_CLASS: "daavy-chat-whisper-name",
    INDEX_DATA: "daavyChatWhisperIndex",
    INDEX_SELECTOR: "[data-daavy-chat-whisper-index]",
    EDITABLE_ARIA_ATTRIBUTES: [
        "aria-activedescendant",
        "aria-autocomplete",
        "aria-haspopup",
        "aria-controls",
        "aria-expanded"
    ]
};

export class AutocompleteWhisper {
    static _trackedHosts = new Set();
    static _states = new WeakMap();
    static _boundFocusDocuments = new WeakSet();

    static init() {
        this._bindFocusListener(globalThis.document);
        requestAnimationFrame(() => this.refresh());
    }

    static _bindFocusListener(documentRef) {
        if (!documentRef || this._boundFocusDocuments.has(documentRef)) return;

        this._boundFocusDocuments.add(documentRef);
        documentRef.addEventListener("focusin", (event) => {
            const target = event.target;
            const editor = target?.matches?.(AUTOCOMPLETE_WHISPER.EDITOR_SELECTOR)
                ? target
                : target?.closest?.(AUTOCOMPLETE_WHISPER.EDITOR_SELECTOR);
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

        for (const candidate of Object.values(elements ?? {})) this._attach(candidate);

        const rootElement = getElement(element);
        if (rootElement) this._attach(rootElement);

        const currentHost = globalThis.document?.querySelector?.(AUTOCOMPLETE_WHISPER.HOST_SELECTOR);
        if (currentHost) this._attach(currentHost);

        for (const host of this._trackedHosts) this._attach(host);
    }

    static _attach(rootElement) {
        const host = resolveHost(rootElement, AUTOCOMPLETE_WHISPER.HOST_SELECTOR);
        if (!host) return false;

        this._trackedHosts.add(host);
        this._bindFocusListener(getDocument(host));

        if (!isSettingEnabled(SETTINGS.AUTOCOMPLETE_WHISPER.key)) {
            this._teardown(host);
            return false;
        }

        const editor = resolveEditor(host);
        const editable = resolveEditable(editor);
        if (!editor || !editable) {
            this._teardown(host);
            return false;
        }

        if (this._states.has(host)) {
            const state = this._states.get(host);
            if (state.editor?.isConnected
                && state.editable?.isConnected
                && state.editor === editor
                && state.editable === editable) {
                this._updateSuggestions(host);
                return true;
            }

            this._teardown(host);
        }

        const state = {
            controller: createAbortController(host),
            host,
            editor,
            editable,
            popup: createPopup(host),
            suggestions: [],
            activeIndex: 0,
            match: null
        };
        this._states.set(host, state);
        host.classList.add(AUTOCOMPLETE_WHISPER.HOST_CLASS);
        prepareEditable(editable, state.popup.id);
        const refresh = () => this._updateSuggestions(state.host);
        this._bindEditableEvents(state, refresh);
        this._bindEditorEvents(state, refresh);
        this._bindPopupEvents(state);

        this._updateSuggestions(host);
        return true;
    }

    static _bindEditableEvents(state, refresh) {
        const { editable, host, controller } = state;
        const signal = controller.signal;

        editable.addEventListener("input", refresh, { signal });
        editable.addEventListener("click", refresh, { signal });
        editable.addEventListener("focus", refresh, { signal });
        editable.addEventListener("keydown", (event) => this._onKeydown(host, event), { signal });
        editable.addEventListener("keyup", (event) => {
            if (AUTOCOMPLETE_WHISPER.CARET_NAVIGATION_KEYS.includes(event.key)) refresh();
        }, { signal });
        editable.addEventListener("blur", () => {
            requestAnimationFrame(() => hidePopup(state));
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
            const option = event.target.closest(AUTOCOMPLETE_WHISPER.INDEX_SELECTOR);
            if (!option) return;
            const index = Number(option.dataset[AUTOCOMPLETE_WHISPER.INDEX_DATA]);
            this._applySuggestion(host, index, { persist: event.shiftKey });
        }, { signal });
    }

    static _teardown(host) {
        const state = this._states.get(host);
        if (state) {
            state.controller.abort();
            clearEditableState(state.editable);
            state.popup?.remove();
            this._states.delete(host);
        }

        host?.classList?.remove(AUTOCOMPLETE_WHISPER.HOST_CLASS);
    }

    static _updateSuggestions(host) {
        const state = this._states.get(host);
        if (!state) return;

        state.match = getMatchState(state.editable);
        if (!state.match) {
            hidePopup(state);
            return;
        }

        state.suggestions = getSuggestions(state.match, game.users.contents, AUTOCOMPLETE_WHISPER.MAX_RESULTS);
        state.activeIndex = Math.min(state.activeIndex, Math.max(state.suggestions.length - 1, 0));

        if (!state.suggestions.length) {
            hidePopup(state);
            return;
        }

        renderPopup(state);
    }

    static _onKeydown(host, event) {
        const state = this._states.get(host);
        if (!state || state.popup.hidden || !state.suggestions.length) return;
        if (event.key === "Enter" && !event.shiftKey && state.match?.caretAfterTarget) {
            hidePopup(state);
            return;
        }

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();
                state.activeIndex = (state.activeIndex + 1) % state.suggestions.length;
                renderPopup(state);
                break;
            case "ArrowUp":
                event.preventDefault();
                state.activeIndex = (state.activeIndex - 1 + state.suggestions.length) % state.suggestions.length;
                renderPopup(state);
                break;
            case "Enter":
            case "Tab":
                event.preventDefault();
                this._applySuggestion(host, state.activeIndex, { persist: event.shiftKey });
                break;
            case "Escape":
                event.preventDefault();
                hidePopup(state);
                break;
        }
    }

    static _applySuggestion(host, index, { persist = false } = {}) {
        const state = this._states.get(host);
        if (!state) return;

        const suggestion = state.suggestions[index];
        const match = state.match ?? getMatchState(state.editable);
        if (!suggestion || !match) return;

        const editorText = getEditorText(state.editable);
        const textAfterMatch = editorText.slice(match.targetEnd);
        const selectedNames = match.selectedNames.filter(name => name.toLocaleLowerCase() !== suggestion.name.toLocaleLowerCase());
        const recipients = [...selectedNames, suggestion.name];
        const replacement = `[${recipients.join(", ")}]`;
        const hasSpacer = /^\s/.test(textAfterMatch);
        replaceEditorRange(
            state,
            match.targetStart,
            match.targetEnd,
            `${replacement}${hasSpacer ? "" : " "}`,
            replacement.length + 1,
        );
        persist ? this._updateSuggestions(host) : hidePopup(state);
    }
}

function replaceEditorRange(state, startOffset, endOffset, replacement, caretOffset = replacement.length) {
    const editable = state.editable;
    const documentRef = getDocument(editable);
    const selection = documentRef.getSelection?.();
    const range = createTextRange(editable, startOffset, endOffset);
    if (!selection || !range) return;

    editable.focus();
    selection.removeAllRanges();
    selection.addRange(range);

    if (!insertText(documentRef, editable, range, replacement)) {
        dispatchInput(editable, replacement);
    }

    restoreCaret(editable, selection, startOffset, caretOffset);
}

function createTextRange(rootElement, start, end) {
    const documentRef = getDocument(rootElement);
    const range = documentRef.createRange();
    const startPoint = locateTextBoundary(rootElement, start);
    const endPoint = locateTextBoundary(rootElement, end);
    if (!startPoint || !endPoint) return null;

    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    return range;
}

function insertText(documentRef, editable, range, replacement) {
    if (typeof documentRef.execCommand === "function" && documentRef.execCommand("insertText", false, replacement)) {
        return true;
    }

    range.deleteContents();
    range.insertNode(documentRef.createTextNode(replacement));
    return false;
}

function dispatchInput(editable, replacement) {
    const documentWindow = editable.ownerDocument?.defaultView;
    const InputEventCtor = documentWindow?.InputEvent ?? documentWindow?.Event ?? Event;
    editable.dispatchEvent(new InputEventCtor("input", { bubbles: true, data: replacement, inputType: "insertText" }));
}

function restoreCaret(editable, selection, startOffset, caretOffset) {
    const caretPosition = Math.max(startOffset, startOffset + caretOffset);
    const caretRange = createTextRange(editable, caretPosition, caretPosition);
    if (!caretRange) return;

    selection.removeAllRanges();
    selection.addRange(caretRange);
}

function locateTextBoundary(rootElement, targetOffset) {
    const documentRef = getDocument(rootElement);
    const view = documentRef.defaultView ?? globalThis;
    const nodeFilter = view.NodeFilter ?? NodeFilter;
    const walker = documentRef.createTreeWalker(rootElement, nodeFilter.SHOW_TEXT);
    let currentTextNode = walker.nextNode();
    let traversed = 0;
    let lastText = null;

    while (currentTextNode) {
        const length = currentTextNode.textContent?.length ?? 0;
        if (targetOffset <= traversed + length) {
            return {
                node: currentTextNode,
                offset: Math.max(0, targetOffset - traversed)
            };
        }

        traversed += length;
        lastText = currentTextNode;
        currentTextNode = walker.nextNode();
    }

    return lastText
        ? { node: lastText, offset: lastText.textContent?.length ?? 0 }
        : { node: rootElement, offset: 0 };
}

function getEditorText(editable) {
    return (editable?.textContent ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\u200b/g, "");
}

function getCaretOffset(editable) {
    const documentRef = getDocument(editable);
    const selection = documentRef.getSelection?.();
    if (!selection?.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) return null;

    return getRangeOffset(editable, range.startContainer, range.startOffset);
}

export function getMatchState(editable) {
    const editorText = getEditorText(editable);
    const caret = getCaretOffset(editable) ?? editorText.length;
    const prefix = editorText.match(AUTOCOMPLETE_WHISPER.PREFIX_PATTERN);
    if (!prefix) return null;

    const targetStart = prefix[0].length;
    if (caret < targetStart) return null;

    const remainder = editorText.slice(targetStart);
    return remainder.startsWith("[")
        ? getBracketedMatch(editorText, targetStart, remainder, caret)
        : getPlainMatch(editorText, targetStart, remainder, caret);
}

function getRangeOffset(editable, container, offset) {
    const range = editable.ownerDocument.createRange();
    range.selectNodeContents(editable);
    range.setEnd(container, offset);
    return range.toString().length;
}

function getPlainMatch(editorText, targetStart, remainder, caret) {
    const firstSpace = remainder.indexOf(" ");
    const targetEnd = firstSpace === -1 ? editorText.length : targetStart + firstSpace;
    if (caret > targetEnd) return null;

    return {
        query: editorText.slice(targetStart, Math.min(caret, targetEnd)).trim(),
        targetStart,
        targetEnd,
        selectedNames: []
    };
}

function getBracketedMatch(editorText, targetStart, remainder, caret) {
    const closeIndex = remainder.indexOf("]");
    const targetEnd = closeIndex === -1 ? editorText.length : targetStart + closeIndex + 1;

    const innerStart = targetStart + 1;
    const innerEnd = closeIndex === -1 ? targetEnd : targetEnd - 1;
    const inside = editorText.slice(innerStart, innerEnd);
    const segments = inside.split(",");
    if (caret > targetEnd) {
        if (editorText.slice(targetEnd, caret).trim() || editorText.slice(caret).trim()) return null;

        return {
            query: "",
            targetStart,
            targetEnd,
            selectedNames: segments.map(segment => segment.trim()).filter(Boolean),
            caretAfterTarget: true
        };
    }

    const caretInside = Math.max(0, Math.min(caret - innerStart, inside.length));
    const currentIndex = inside.slice(0, caretInside).split(",").length - 1;
    const currentSegment = segments[currentIndex];

    return {
        query: currentSegment.trim(),
        targetStart,
        targetEnd,
        selectedNames: segments
            .filter((_segment, index) => index !== currentIndex)
            .map(segment => segment.trim())
            .filter(Boolean)
    };
}

function resolveHost(rootElement, hostSelector) {
    if (!rootElement) return null;
    if (typeof rootElement.matches === "function" && rootElement.matches(hostSelector)) return rootElement;

    const closestHost = rootElement.closest?.(hostSelector);
    return closestHost ?? rootElement.querySelector?.(hostSelector) ?? null;
}

function resolveEditor(host) {
    return host.querySelector(AUTOCOMPLETE_WHISPER.MESSAGE_EDITOR_SELECTOR)
        ?? host.querySelector(AUTOCOMPLETE_WHISPER.EDITABLE_SELECTOR);
}

function resolveEditable(editor) {
    if (!editor) return null;
    if (editor.matches?.("[contenteditable='true']")) return editor;
    return editor.querySelector?.(AUTOCOMPLETE_WHISPER.EDITABLE_SELECTOR) ?? null;
}

function createPopup(host) {
    const existing = host.querySelector(`.${AUTOCOMPLETE_WHISPER.POPUP_CLASS}`);
    if (existing) return existing;

    const documentRef = getDocument(host);
    const popup = documentRef.createElement("div");
    popup.className = AUTOCOMPLETE_WHISPER.POPUP_CLASS;
    popup.id = `${AUTOCOMPLETE_WHISPER.POPUP_ID_PREFIX}-${foundry.utils.randomID()}`;
    popup.hidden = true;
    popup.setAttribute("role", "listbox");
    host.appendChild(popup);
    return popup;
}

function prepareEditable(editable, popupId) {
    editable.setAttribute("aria-autocomplete", "list");
    editable.setAttribute("aria-haspopup", "listbox");
    editable.setAttribute("aria-controls", popupId);
    editable.setAttribute("aria-expanded", "false");
}

function clearEditableState(editable) {
    AUTOCOMPLETE_WHISPER.EDITABLE_ARIA_ATTRIBUTES.forEach(attribute => editable.removeAttribute(attribute));
}

function renderPopup(state) {
    const documentRef = getDocument(state.popup);
    const options = state.suggestions.map((suggestion, index) => createSuggestionOption(documentRef, state, suggestion, index));
    state.popup.replaceChildren(...options);
    state.popup.hidden = false;
    updateActiveDescendant(state);
}

function hidePopup(state) {
    state.popup.hidden = true;
    state.popup.replaceChildren();
    state.editable.setAttribute("aria-expanded", "false");
    state.editable.removeAttribute("aria-activedescendant");
    state.suggestions = [];
    state.activeIndex = 0;
    state.match = null;
}

function createSuggestionOption(documentRef, state, suggestion, index) {
    const isActive = index === state.activeIndex;
    const option = documentRef.createElement("div");
    option.className = `${AUTOCOMPLETE_WHISPER.OPTION_CLASS}${isActive ? ` ${AUTOCOMPLETE_WHISPER.ACTIVE_OPTION_CLASS}` : ""}`;
    option.id = `${state.popup.id}-option-${index}`;
    option.dataset[AUTOCOMPLETE_WHISPER.INDEX_DATA] = String(index);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(isActive));

    const status = documentRef.createElement("span");
    status.className = `${AUTOCOMPLETE_WHISPER.STATUS_CLASS}${suggestion.active ? ` ${AUTOCOMPLETE_WHISPER.ACTIVE_STATUS_CLASS}` : ""}`;

    const name = documentRef.createElement("span");
    name.className = AUTOCOMPLETE_WHISPER.NAME_CLASS;
    name.textContent = suggestion.name;

    option.append(status, name);
    return option;
}

function updateActiveDescendant(state) {
    const activeOption = state.popup.querySelector(`.${AUTOCOMPLETE_WHISPER.OPTION_CLASS}.${AUTOCOMPLETE_WHISPER.ACTIVE_OPTION_CLASS}`);
    state.editable.setAttribute("aria-expanded", "true");

    if (activeOption?.id) {
        state.editable.setAttribute("aria-activedescendant", activeOption.id);
    } else {
        state.editable.removeAttribute("aria-activedescendant");
    }

    activeOption?.scrollIntoView?.({ block: "nearest" });
}

export function getSuggestions(match, users, maxResults) {
    const normalize = name => (name ?? "").trim().toLocaleLowerCase();
    const normalizedQuery = normalize(match.query);
    const selectedNames = new Set(match.selectedNames.map(normalize));
    const seen = new Set();

    return users
        .filter(user => {
            const name = user?.name?.trim() ?? "";
            const normalizedName = normalize(name);
            if (!name || seen.has(normalizedName) || selectedNames.has(normalizedName)) return false;

            seen.add(normalizedName);
            return !normalizedQuery || normalizedName.includes(normalizedQuery);
        })
        .sort((firstUser, secondUser) => {
            if (firstUser.active !== secondUser.active) return firstUser.active ? -1 : 1;
            return firstUser.name.trim().localeCompare(secondUser.name.trim(), game.i18n.lang, { sensitivity: "base" });
        })
        .slice(0, maxResults)
        .map(user => ({
            name: user.name.trim(),
            active: !!user.active
        }));
}
