import { getDocument } from "../../core.js";
import { randomId, removeAttributes } from "../settings.js";

export const EDITABLE_ARIA_ATTRIBUTES = [
    "aria-activedescendant",
    "aria-autocomplete",
    "aria-haspopup",
    "aria-controls",
    "aria-expanded"
];

export function resolveHost(root, hostSelector) {
    if (!root) return null;
    if (typeof root.matches === "function" && root.matches(hostSelector)) return root;

    const closestHost = root.closest?.(hostSelector);
    return closestHost ?? root.querySelector?.(hostSelector) ?? null;
}

export function resolveEditor(host) {
    return host.querySelector("prose-mirror[name='message'], prose-mirror")
        ?? host.querySelector(".editor-content[contenteditable='true'], [contenteditable='true']")
        ?? null;
}

export function resolveEditable(editor) {
    if (!editor) return null;
    if (editor.matches?.("[contenteditable='true']")) return editor;
    return editor.querySelector?.(".editor-content[contenteditable='true'], [contenteditable='true']") ?? null;
}

export function createPopup(host) {
    const existing = host.querySelector(".dchat-whisper-autocomplete");
    if (existing) return existing;

    const doc = getDocument(host);
    const popup = doc.createElement("div");
    popup.className = "dchat-whisper-autocomplete";
    popup.id = `dchat-whisper-${randomId()}`;
    popup.hidden = true;
    popup.setAttribute("role", "listbox");
    host.appendChild(popup);
    return popup;
}

export function prepareEditable(editable, popupId) {
    editable.setAttribute("aria-autocomplete", "list");
    editable.setAttribute("aria-haspopup", "listbox");
    editable.setAttribute("aria-controls", popupId);
    editable.setAttribute("aria-expanded", "false");
}

export function clearEditableState(editable) {
    removeAttributes(editable, ...EDITABLE_ARIA_ATTRIBUTES);
}

export function renderPopup(state) {
    const doc = getDocument(state.popup);
    const options = state.suggestions.map((suggestion, index) => createSuggestionOption(doc, state, suggestion, index));
    state.popup.replaceChildren(...options);
    state.popup.hidden = false;
    state.popup.classList.add("visible");
    updateActiveDescendant(state);
}

export function hidePopup(state) {
    state.popup.hidden = true;
    state.popup.classList.remove("visible");
    state.popup.replaceChildren();
    state.editable.setAttribute("aria-expanded", "false");
    removeAttributes(state.editable, "aria-activedescendant");
    state.suggestions = [];
    state.activeIndex = 0;
    state.match = null;
}

function createSuggestionOption(doc, state, suggestion, index) {
    const isActive = index === state.activeIndex;
    const option = doc.createElement("div");
    option.className = `dchat-whisper-option${isActive ? " active" : ""}`;
    option.id = `${state.popupId}-option-${index}`;
    option.dataset.dchatWhisperIndex = String(index);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(isActive));

    const status = doc.createElement("span");
    status.className = `dchat-whisper-status${suggestion.active ? " is-active" : ""}`;

    const name = doc.createElement("span");
    name.className = "dchat-whisper-name";
    name.textContent = suggestion.name;

    option.append(status, name);
    return option;
}

function updateActiveDescendant(state) {
    const activeOption = state.popup.querySelector(".dchat-whisper-option.active");
    state.editable.setAttribute("aria-expanded", "true");

    if (activeOption?.id) {
        state.editable.setAttribute("aria-activedescendant", activeOption.id);
    } else {
        state.editable.removeAttribute("aria-activedescendant");
    }

    activeOption?.scrollIntoView?.({ block: "nearest" });
}
