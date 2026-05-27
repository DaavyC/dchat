import { getDocument } from "../../core.js";

export function replaceEditorRange(state, from, to, replacement, caretOffset = replacement.length) {
    const editable = state.editable;
    const doc = getDocument(editable);
    const selection = doc.getSelection?.();
    const range = createTextRange(editable, from, to);
    if (!selection || !range) return;

    editable.focus();
    selection.removeAllRanges();
    selection.addRange(range);

    if (!insertText(doc, editable, range, replacement)) {
        dispatchInput(editable, replacement);
    }

    restoreCaret(editable, selection, from, caretOffset);
}

export function createTextRange(root, start, end) {
    const doc = getDocument(root);
    const range = doc.createRange();
    const startPoint = locateTextBoundary(root, start);
    const endPoint = locateTextBoundary(root, end);
    if (!startPoint || !endPoint) return null;

    range.setStart(startPoint.node, startPoint.offset);
    range.setEnd(endPoint.node, endPoint.offset);
    return range;
}

function insertText(doc, editable, range, replacement) {
    if (typeof doc.execCommand === "function" && doc.execCommand("insertText", false, replacement)) {
        return true;
    }

    range.deleteContents();
    range.insertNode(doc.createTextNode(replacement));
    return false;
}

function dispatchInput(editable, replacement) {
    const View = editable.ownerDocument?.defaultView;
    const InputEventCtor = View?.InputEvent ?? View?.Event ?? Event;
    editable.dispatchEvent(new InputEventCtor("input", { bubbles: true, data: replacement, inputType: "insertText" }));
}

function restoreCaret(editable, selection, from, caretOffset) {
    const caretPosition = Math.max(from, from + caretOffset);
    const caretRange = createTextRange(editable, caretPosition, caretPosition);
    if (!caretRange) return;

    selection.removeAllRanges();
    selection.addRange(caretRange);
}

function locateTextBoundary(root, targetOffset) {
    const doc = getDocument(root);
    const view = doc.defaultView ?? globalThis;
    const nodeFilter = view.NodeFilter ?? NodeFilter;
    const walker = doc.createTreeWalker(root, nodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    let traversed = 0;
    let lastText = null;

    while (current) {
        const length = current.textContent?.length ?? 0;
        if (targetOffset <= traversed + length) {
            return {
                node: current,
                offset: Math.max(0, targetOffset - traversed)
            };
        }

        traversed += length;
        lastText = current;
        current = walker.nextNode();
    }

    return lastText
        ? { node: lastText, offset: lastText.textContent?.length ?? 0 }
        : { node: root, offset: 0 };
}
