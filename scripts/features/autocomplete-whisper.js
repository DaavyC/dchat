import { AUTOCOMPLETE_WHISPER, MESSAGE_TYPES, SETTING_KEYS } from "../config.js";
import { createAbortController, getChatSection, getDocument, getElement, randomId, removeAttributes } from "../utils.js";
import { isSettingEnabled } from "../settings.js";

export class AutocompleteWhisper {
    static _trackedHosts = new Set();
    static _states = new WeakMap();
    static _boundFocusDocuments = new WeakSet();
    static _bootstrapWatcher = null;
    static _bootstrapAttempts = 0;

    static init() {
        this._scheduleStartupRefreshes();
        this._startBootstrapWatcher();
        this._bindGlobalFocusListener();
    }

    static onReady() {
        this._bindGlobalFocusListener();
        this._scheduleStartupRefreshes();
    }

    static onRenderChatInput(application, elements) {
        this.refresh(application?.element, elements);
    }

    static onRenderChatLog(renderedHtml) {
        this.refresh(getElement(renderedHtml));
    }

    static onRenderSidebar(renderedHtml) {
        this.refresh(getChatSection(renderedHtml));
    }

    static onChangeSidebarTab(application) {
        if (application?.tabName === MESSAGE_TYPES.CHAT) this.refresh(application?.element);
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
        for (const delayMs of AUTOCOMPLETE_WHISPER.STARTUP_REFRESH_DELAYS_MS) {
            globalThis.setTimeout(() => this._scheduleRefresh(), delayMs);
        }
    }

    static _startBootstrapWatcher() {
        if (this._bootstrapWatcher) return;

        this._bootstrapAttempts = 0;
        this._bootstrapWatcher = globalThis.setInterval(() => {
            this._bootstrapAttempts += 1;
            if (this.refresh() || this._bootstrapAttempts >= AUTOCOMPLETE_WHISPER.MAX_BOOTSTRAP_ATTEMPTS) {
                globalThis.clearInterval(this._bootstrapWatcher);
                this._bootstrapWatcher = null;
            }
        }, AUTOCOMPLETE_WHISPER.BOOTSTRAP_INTERVAL_MS);
    }

    static _bindGlobalFocusListener() {
        this._bindFocusListener(globalThis.document);
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

        let attached = false;
        if (elements) attached = this._attachFromElements(elements) || attached;

        const rootElement = getElement(element);
        if (rootElement) attached = this._attach(rootElement) || attached;

        const currentHost = globalThis.document?.querySelector?.(AUTOCOMPLETE_WHISPER.HOST_SELECTOR);
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

    static _attach(rootElement) {
        const host = resolveHost(rootElement, AUTOCOMPLETE_WHISPER.HOST_SELECTOR);
        if (!host) return false;

        this._trackedHosts.add(host);
        this._bindFocusListener(getDocument(host));

        if (!isSettingEnabled(SETTING_KEYS.AUTOCOMPLETE_WHISPER)) {
            this._teardown(host);
            return false;
        }

        const editor = resolveEditor(host);
        const editable = resolveEditable(editor);
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
        host.classList.add(AUTOCOMPLETE_WHISPER.HOST_CLASS);
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
        const popup = createPopup(host);

        return {
            controller: createAbortController(host),
            host,
            editor,
            editable,
            popup,
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
            if (AUTOCOMPLETE_WHISPER.CARET_NAVIGATION_KEYS.includes(event.key)) refresh();
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
            this._hidePopup(host);
            return;
        }

        state.suggestions = getSuggestions(state.match, game.users.contents, AUTOCOMPLETE_WHISPER.MAX_RESULTS);
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
        const match = state.match ?? getMatchState(state.editable);
        if (!suggestion || !match) return;

        const editorText = getEditorText(state.editable);
        const textAfterMatch = editorText.slice(match.targetEnd);
        const selectedNames = match.selectedNames.filter(name => name.toLocaleLowerCase() !== suggestion.name.toLocaleLowerCase());
        const recipients = [...selectedNames, suggestion.name];

        if (persist) {
            const replacement = `[${recipients.join(", ")}, ]`;
            replaceEditorRange(state, match.targetStart, match.targetEnd, replacement, replacement.length - 1);
            this._updateSuggestions(host);
            return;
        }

        const replacement = `[${recipients.join(", ")}]`;
        const spacer = /^\s/.test(textAfterMatch) ? "" : " ";
        replaceEditorRange(state, match.targetStart, match.targetEnd, `${replacement}${spacer}`);
        this._hidePopup(host);
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

function getSelectionOffsets(editable) {
    const documentRef = getDocument(editable);
    const selection = documentRef.getSelection?.();
    if (!selection?.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) return null;

    return {
        start: getRangeOffset(editable, range.startContainer, range.startOffset),
        end: getRangeOffset(editable, range.endContainer, range.endOffset)
    };
}

export function getMatchState(editable) {
    const editorText = getEditorText(editable);
    const selection = getSelectionOffsets(editable);
    const caret = selection?.start ?? editorText.length;
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
    if (caret > targetEnd) return null;

    const innerStart = targetStart + 1;
    const innerEnd = closeIndex === -1 ? targetEnd : targetEnd - 1;
    const inside = editorText.slice(innerStart, innerEnd);
    const segments = splitRecipientSegments(inside);
    const caretInside = Math.max(0, Math.min(caret - innerStart, inside.length));
    const currentIndex = findCurrentSegmentIndex(segments, caretInside);
    const currentSegment = segments[currentIndex];
    const trimmed = trimRecipientSegment(currentSegment);

    return {
        query: currentSegment.text.slice(trimmed.leadingWhitespace, trimmed.trimmedEnd),
        targetStart,
        targetEnd,
        selectedNames: getSelectedNames(segments, currentIndex)
    };
}

function splitRecipientSegments(recipientText) {
    const segments = [];
    let segmentStart = 0;

    for (let index = 0; index <= recipientText.length; index += 1) {
        const atEnd = index === recipientText.length;
        if (!atEnd && recipientText[index] !== ",") continue;

        segments.push({
            start: segmentStart,
            end: index,
            text: recipientText.slice(segmentStart, index)
        });
        segmentStart = index + 1;
    }

    return segments.length ? segments : [{ start: 0, end: 0, text: "" }];
}

function findCurrentSegmentIndex(segments, caretInside) {
    const index = segments.findIndex(segment => caretInside <= segment.end);
    return index === -1 ? segments.length - 1 : index;
}

function trimRecipientSegment(segment) {
    const leadingWhitespace = segment.text.match(/^\s*/)?.[0]?.length ?? 0;
    const trailingWhitespace = segment.text.match(/\s*$/)?.[0]?.length ?? 0;

    return {
        leadingWhitespace,
        trimmedEnd: Math.max(leadingWhitespace, segment.text.length - trailingWhitespace)
    };
}

function getSelectedNames(segments, currentIndex) {
    return segments
        .filter((segment, index) => index !== currentIndex)
        .map(segment => segment.text.trim())
        .filter(Boolean);
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
    popup.id = `${AUTOCOMPLETE_WHISPER.POPUP_ID_PREFIX}-${randomId()}`;
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
    removeAttributes(editable, ...AUTOCOMPLETE_WHISPER.EDITABLE_ARIA_ATTRIBUTES);
}

function renderPopup(state) {
    const documentRef = getDocument(state.popup);
    const options = state.suggestions.map((suggestion, index) => createSuggestionOption(documentRef, state, suggestion, index));
    state.popup.replaceChildren(...options);
    state.popup.hidden = false;
    state.popup.classList.add(AUTOCOMPLETE_WHISPER.VISIBLE_CLASS);
    updateActiveDescendant(state);
}

function hidePopup(state) {
    state.popup.hidden = true;
    state.popup.classList.remove(AUTOCOMPLETE_WHISPER.VISIBLE_CLASS);
    state.popup.replaceChildren();
    state.editable.setAttribute("aria-expanded", "false");
    removeAttributes(state.editable, "aria-activedescendant");
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
    const normalizedQuery = normalizeName(match.query);
    const selectedNames = new Set(match.selectedNames.map(normalizeName));

    return sortUsersByWhisperPriority(getUniqueCandidateUsers(users, selectedNames))
        .filter(user => matchesQuery(user, normalizedQuery))
        .slice(0, maxResults)
        .map(toSuggestion);
}

function normalizeName(name) {
    return (name ?? "").trim().toLocaleLowerCase();
}

function getDisplayName(user) {
    return user?.name?.trim() ?? "";
}

function getUniqueCandidateUsers(users, selectedNames) {
    const seen = new Set();

    return users.filter(user => {
        const name = getDisplayName(user);
        const normalizedName = normalizeName(name);
        if (!name || !normalizedName || seen.has(normalizedName) || selectedNames.has(normalizedName)) return false;

        seen.add(normalizedName);
        return true;
    });
}

function sortUsersByWhisperPriority(users) {
    return users.sort((firstUser, secondUser) => {
        const firstName = getDisplayName(firstUser);
        const secondName = getDisplayName(secondUser);
        if (firstUser.active !== secondUser.active) return firstUser.active ? -1 : 1;

        const rolePriority = getRolePriority(firstUser) - getRolePriority(secondUser);
        if (rolePriority !== 0) return rolePriority;

        return firstName.localeCompare(secondName, game.i18n.lang, { sensitivity: "base" });
    });
}

function getRolePriority(user) {
    const roles = globalThis.CONST?.USER_ROLES ?? {};
    const assistantRole = roles.ASSISTANT ?? AUTOCOMPLETE_WHISPER.DEFAULT_ASSISTANT_ROLE;
    const gmRole = roles.GAMEMASTER ?? AUTOCOMPLETE_WHISPER.DEFAULT_GM_ROLE;
    const role = Number(user?.role ?? 0);

    if (user?.isGM || role >= gmRole) return 0;
    if (role >= assistantRole) return 1;
    return 2;
}

function matchesQuery(user, normalizedQuery) {
    const normalizedName = normalizeName(getDisplayName(user));
    return !normalizedQuery || normalizedName.includes(normalizedQuery);
}

function toSuggestion(user) {
    return {
        id: user.id,
        name: getDisplayName(user),
        active: !!user.active
    };
}
