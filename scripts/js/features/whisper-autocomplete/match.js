export const PREFIX_PATTERN = /^(\/w|\/whisper)\s+/i;

export function getEditorText(editable) {
    return (editable?.textContent ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\u200b/g, "");
}

export function getSelectionOffsets(editable) {
    const doc = editable?.ownerDocument ?? globalThis.document;
    const selection = doc.getSelection?.();
    if (!selection?.rangeCount) return null;

    const range = selection.getRangeAt(0);
    if (!editable.contains(range.startContainer) || !editable.contains(range.endContainer)) return null;

    return {
        start: getRangeOffset(editable, range.startContainer, range.startOffset),
        end: getRangeOffset(editable, range.endContainer, range.endOffset)
    };
}

export function getMatchState(editable) {
    const value = getEditorText(editable);
    const selection = getSelectionOffsets(editable);
    const caret = selection?.start ?? value.length;
    const prefix = value.match(PREFIX_PATTERN);
    if (!prefix) return null;

    const targetStart = prefix[0].length;
    if (caret < targetStart) return null;

    const remainder = value.slice(targetStart);
    return remainder.startsWith("[")
        ? getBracketedMatch(value, targetStart, remainder, caret)
        : getPlainMatch(value, targetStart, remainder, caret);
}

function getRangeOffset(editable, container, offset) {
    const range = editable.ownerDocument.createRange();
    range.selectNodeContents(editable);
    range.setEnd(container, offset);
    return range.toString().length;
}

function getPlainMatch(value, targetStart, remainder, caret) {
    const firstSpace = remainder.indexOf(" ");
    const targetEnd = firstSpace === -1 ? value.length : targetStart + firstSpace;
    if (caret > targetEnd) return null;

    return {
        query: value.slice(targetStart, Math.min(caret, targetEnd)).trim(),
        replaceFrom: targetStart,
        replaceTo: targetEnd,
        targetStart,
        targetEnd,
        isBracketed: false,
        selectedNames: []
    };
}

function getBracketedMatch(value, targetStart, remainder, caret) {
    const closeIndex = remainder.indexOf("]");
    const targetEnd = closeIndex === -1 ? value.length : targetStart + closeIndex + 1;
    if (caret > targetEnd) return null;

    const innerStart = targetStart + 1;
    const innerEnd = closeIndex === -1 ? targetEnd : targetEnd - 1;
    const inside = value.slice(innerStart, innerEnd);
    const segments = splitRecipientSegments(inside);
    const caretInside = Math.max(0, Math.min(caret - innerStart, inside.length));
    const currentIndex = findCurrentSegmentIndex(segments, caretInside);
    const currentSegment = segments[currentIndex];
    const trimmed = trimRecipientSegment(currentSegment);

    return {
        query: currentSegment.text.slice(trimmed.leadingWhitespace, trimmed.trimmedEnd),
        replaceFrom: innerStart + currentSegment.start + trimmed.leadingWhitespace,
        replaceTo: innerStart + currentSegment.start + trimmed.trimmedEnd,
        targetStart,
        targetEnd,
        isBracketed: true,
        selectedNames: getSelectedNames(segments, currentIndex)
    };
}

function splitRecipientSegments(value) {
    const segments = [];
    let segmentStart = 0;

    for (let index = 0; index <= value.length; index += 1) {
        const atEnd = index === value.length;
        if (!atEnd && value[index] !== ",") continue;

        segments.push({
            start: segmentStart,
            end: index,
            text: value.slice(segmentStart, index)
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
