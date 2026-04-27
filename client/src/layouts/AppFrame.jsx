import { useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import RouteLoaderScreen from "../components/layout/RouteLoaderScreen";
import { getRandomLoadingMessage } from "../lib/loadingMessages";

const TRANSITION_DURATION_MS = 450;

function AppFrame() {
  const location = useLocation();
  const initialMessage = getRandomLoadingMessage();
  const latestMessageRef = useRef(initialMessage);
  const previousPathRef = useRef(location.pathname);
  const hideTimeoutRef = useRef(null);
  const shouldSkipLoader =
    (location.pathname.startsWith("/student/") || location.pathname.startsWith("/teacher")) &&
    !location.pathname.startsWith("/student/auth") &&
    !location.pathname.startsWith("/student/forgot-password");
  const [loaderState, setLoaderState] = useState({
    visible: true,
    message: initialMessage,
  });

  useLayoutEffect(() => {
    if (shouldSkipLoader) {
      previousPathRef.current = location.pathname;

      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }

      setLoaderState((current) =>
        current.visible ? { ...current, visible: false } : current
      );
      return;
    }

    const hasRouteChanged = previousPathRef.current !== location.pathname;
    const nextMessage = hasRouteChanged
      ? getRandomLoadingMessage(latestMessageRef.current)
      : latestMessageRef.current;

    previousPathRef.current = location.pathname;
    latestMessageRef.current = nextMessage;

    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaderState({
      visible: true,
      message: nextMessage,
    });

    hideTimeoutRef.current = window.setTimeout(() => {
      setLoaderState((current) => ({
        ...current,
        visible: false,
      }));
    }, TRANSITION_DURATION_MS);

    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [location.pathname, shouldSkipLoader]);

  if (loaderState.visible && !shouldSkipLoader) {
    return <RouteLoaderScreen message={loaderState.message} />;
  }

  return <Outlet />;
}

export default AppFrame;
