import { useEffect } from "react";

function isEditableTarget(target) {
  if (!target || typeof target.closest !== "function") {
    return false;
  }

  return Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

function useExamCopyBlocker(isEnabled) {
  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    const handleCopy = (event) => {
      event.preventDefault();
    };

    const handleKeyDown = (event) => {
      if (event.defaultPrevented) {
        return;
      }

      const isCopyShortcut =
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        String(event.key || "").toLowerCase() === "c";

      if (isCopyShortcut) {
        event.preventDefault();
      }
    };

    const handleContextMenu = (event) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
    };

    document.addEventListener("copy", handleCopy, true);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      document.removeEventListener("copy", handleCopy, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [isEnabled]);
}

export default useExamCopyBlocker;
