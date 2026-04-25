import { useCallback } from "react";

function getNodeElement(node) {
  if (!node) {
    return null;
  }

  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
}

function unwrapHighlightNode(node) {
  const parent = node?.parentNode;
  if (!parent) {
    return;
  }

  while (node.firstChild) {
    parent.insertBefore(node.firstChild, node);
  }

  parent.removeChild(node);
  parent.normalize();
}

function normalizeSelectedText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveRootElement(containerRefOrElement) {
  if (!containerRefOrElement) {
    return null;
  }

  if (containerRefOrElement.current) {
    return containerRefOrElement.current;
  }

  return containerRefOrElement;
}

function useTextHighlighting({
  dataAttribute = "data-exam-highlight",
  highlightClassName = "bg-yellow-300/80 text-slate-900",
} = {}) {
  const clearHighlights = useCallback(
    (containerRefOrElement) => {
      const rootElement = resolveRootElement(containerRefOrElement);
      if (!rootElement) {
        return;
      }

      const highlightedNodes = rootElement.querySelectorAll(`[${dataAttribute}='true']`);
      highlightedNodes.forEach((node) => unwrapHighlightNode(node));
    },
    [dataAttribute],
  );

  const toggleSelectionHighlight = useCallback(
    (containerRefOrElement) => {
      const rootElement = resolveRootElement(containerRefOrElement);
      if (!rootElement) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        return;
      }

      const selectedText = selection.toString();
      if (!selectedText || !selectedText.trim()) {
        selection.removeAllRanges();
        return;
      }

      const range = selection.getRangeAt(0);
      if (!rootElement.contains(range.commonAncestorContainer)) {
        return;
      }

      const startElement = getNodeElement(selection.anchorNode);
      const endElement = getNodeElement(selection.focusNode);
      if (
        startElement?.closest?.("input, textarea, [contenteditable='true']") ||
        endElement?.closest?.("input, textarea, [contenteditable='true']")
      ) {
        return;
      }

      const startHighlight = startElement?.closest?.(`[${dataAttribute}='true']`);
      const endHighlight = endElement?.closest?.(`[${dataAttribute}='true']`);

      if (startHighlight && startHighlight === endHighlight) {
        const normalizedSelected = normalizeSelectedText(selectedText);
        const normalizedHighlight = normalizeSelectedText(startHighlight.textContent);

        if (normalizedSelected && normalizedSelected === normalizedHighlight) {
          unwrapHighlightNode(startHighlight);
          selection.removeAllRanges();
          return;
        }
      }

      const marker = document.createElement("mark");
      marker.setAttribute(dataAttribute, "true");
      marker.className = highlightClassName;

      try {
        range.surroundContents(marker);
      } catch {
        // Ignore invalid multi-node selections that cannot be wrapped safely.
      }

      selection.removeAllRanges();
    },
    [dataAttribute, highlightClassName],
  );

  return {
    clearHighlights,
    toggleSelectionHighlight,
  };
}

export default useTextHighlighting;
