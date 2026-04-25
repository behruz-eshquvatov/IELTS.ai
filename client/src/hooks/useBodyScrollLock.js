import { useEffect } from "react";

let activeLocks = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let previousHtmlOverflow = "";
let previousHtmlOverscrollBehavior = "";

function lockDocumentScroll() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const { body, documentElement } = document;
  if (!body || !documentElement) {
    return;
  }

  if (activeLocks === 0) {
    previousBodyOverflow = body.style.overflow;
    previousBodyPaddingRight = body.style.paddingRight;
    previousHtmlOverflow = documentElement.style.overflow;
    previousHtmlOverscrollBehavior = documentElement.style.overscrollBehavior;

    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
    documentElement.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
  }

  activeLocks += 1;
}

function unlockDocumentScroll() {
  if (typeof document === "undefined") {
    return;
  }

  activeLocks = Math.max(activeLocks - 1, 0);
  if (activeLocks > 0) {
    return;
  }

  const { body, documentElement } = document;
  if (!body || !documentElement) {
    return;
  }

  body.style.overflow = previousBodyOverflow;
  body.style.paddingRight = previousBodyPaddingRight;
  documentElement.style.overflow = previousHtmlOverflow;
  documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
}

function useBodyScrollLock(isLocked) {
  useEffect(() => {
    if (!isLocked) {
      return undefined;
    }

    lockDocumentScroll();
    return () => {
      unlockDocumentScroll();
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
