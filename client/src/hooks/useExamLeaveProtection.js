import { useBlocker } from "react-router-dom";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_BEFORE_UNLOAD_MESSAGE =
  "Do you really want to leave this page? If you leave, the task will be auto-submitted.";

function useExamLeaveProtection({
  isEnabled,
  beforeUnloadMessage = DEFAULT_BEFORE_UNLOAD_MESSAGE,
  onBeforeUnload,
} = {}) {
  const blocker = useBlocker(Boolean(isEnabled));
  const blockerRef = useRef(null);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [hasBlockedNavigation, setHasBlockedNavigation] = useState(false);

  useEffect(() => {
    if (blocker.state === "blocked") {
      blockerRef.current = blocker;
      setIsWarningOpen(true);
      setHasBlockedNavigation(true);
    }
  }, [blocker]);

  const hideWarning = useCallback(() => {
    setIsWarningOpen(false);
  }, []);

  const cancelNavigation = useCallback(() => {
    const activeBlocker = blockerRef.current;
    if (activeBlocker?.state === "blocked") {
      activeBlocker.reset();
    } else if (blocker.state === "blocked") {
      blocker.reset();
    }

    blockerRef.current = null;
    setIsWarningOpen(false);
    setHasBlockedNavigation(false);
  }, [blocker]);

  const proceedNavigation = useCallback(() => {
    const activeBlocker = blockerRef.current;
    if (activeBlocker?.state === "blocked") {
      activeBlocker.proceed();
    } else if (blocker.state === "blocked") {
      blocker.proceed();
    }

    blockerRef.current = null;
    setIsWarningOpen(false);
    setHasBlockedNavigation(false);
  }, [blocker]);

  useEffect(() => {
    const hasPendingBlockedNavigation =
      blocker.state === "blocked" || blockerRef.current?.state === "blocked";
    if (!isEnabled && !hasPendingBlockedNavigation) {
      blockerRef.current = null;
      setIsWarningOpen(false);
      setHasBlockedNavigation(false);
    }
  }, [blocker.state, isEnabled]);

  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    const handleBeforeUnload = (event) => {
      try {
        if (typeof onBeforeUnload === "function") {
          onBeforeUnload();
        }
      } catch {
        // Ignore pre-unload callback errors.
      }

      event.preventDefault();
      event.returnValue = beforeUnloadMessage;
      return beforeUnloadMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [beforeUnloadMessage, isEnabled, onBeforeUnload]);

  return {
    isWarningOpen,
    hasBlockedNavigation,
    hideWarning,
    cancelNavigation,
    proceedNavigation,
  };
}

export default useExamLeaveProtection;
