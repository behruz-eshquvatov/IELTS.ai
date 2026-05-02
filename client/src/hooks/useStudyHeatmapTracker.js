import { useEffect, useRef } from "react";
import {
  sendHeatmapDayKeepalive,
  upsertHeatmapDay,
} from "../services/studentService";

const STORAGE_KEY = "student:study-heatmap:tracker";
const THRESHOLDS_MINUTES = [30, 60, 120];
const TICK_INTERVAL_MS = 15000;
const MAX_DELTA_MS = 120000;

function getLocalDateKey(dateInput = new Date()) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeMinutes(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Number(parsed.toFixed(1));
}

function normalizeThresholds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item) => Number(item))
    .filter((item) => THRESHOLDS_MINUTES.includes(item));

  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function createDefaultTrackerState(dateKey = getLocalDateKey()) {
  return {
    date: dateKey,
    minutesSpent: 0,
    sentThresholds: [],
    visitSynced: false,
    lastSyncedMinutes: -1,
  };
}

function readTrackerState() {
  if (typeof window === "undefined") {
    return createDefaultTrackerState();
  }

  const rawState = window.localStorage.getItem(STORAGE_KEY);
  if (!rawState) {
    return createDefaultTrackerState();
  }

  try {
    const parsed = JSON.parse(rawState);
    const date = String(parsed?.date || "").trim() || getLocalDateKey();

    return {
      date,
      minutesSpent: normalizeMinutes(parsed?.minutesSpent, 0),
      sentThresholds: normalizeThresholds(parsed?.sentThresholds),
      visitSynced: Boolean(parsed?.visitSynced),
      lastSyncedMinutes: normalizeMinutes(parsed?.lastSyncedMinutes, -1),
    };
  } catch {
    return createDefaultTrackerState();
  }
}

function writeTrackerState(state) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function postHeatmapDay(date, minutesSpent) {
  return upsertHeatmapDay(date, normalizeMinutes(minutesSpent, 0));
}

export function useStudyHeatmapTracker(isTrackingActive = false) {
  const stateRef = useRef(createDefaultTrackerState());
  const lastVisibleAtRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !isTrackingActive) {
      return undefined;
    }

    let disposed = false;

    const syncState = async (state, options = {}) => {
      const { keepalive = false, force = false } = options;
      const safeMinutes = normalizeMinutes(state.minutesSpent, 0);

      if (!force && safeMinutes <= state.lastSyncedMinutes) {
        return;
      }

      if (keepalive) {
        sendHeatmapDayKeepalive(state.date, safeMinutes);
        state.lastSyncedMinutes = Math.max(state.lastSyncedMinutes, safeMinutes);
        writeTrackerState(state);
        return;
      }

      try {
        await postHeatmapDay(state.date, safeMinutes);
        state.lastSyncedMinutes = Math.max(state.lastSyncedMinutes, safeMinutes);
        writeTrackerState(state);
      } catch {
        // Keep local state; next flush will retry.
      }
    };

    const ensureVisit = async (state, options = {}) => {
      if (state.visitSynced) {
        return;
      }

      await syncState(state, { ...options, force: true });
      state.visitSynced = true;
      writeTrackerState(state);
    };

    const markThresholds = async (state) => {
      const newlyReached = THRESHOLDS_MINUTES.filter(
        (threshold) => state.minutesSpent >= threshold && !state.sentThresholds.includes(threshold),
      );

      if (!newlyReached.length) {
        return;
      }

      state.sentThresholds = [...state.sentThresholds, ...newlyReached];
      writeTrackerState(state);
      await syncState(state);
    };

    const switchToNewDayIfNeeded = async () => {
      const state = stateRef.current;
      const today = getLocalDateKey();

      if (today === state.date) {
        return;
      }

      await syncState(state, { force: true });

      const nextState = createDefaultTrackerState(today);
      stateRef.current = nextState;
      writeTrackerState(nextState);
      await ensureVisit(nextState);
    };

    const tick = async (options = {}) => {
      const { allowHidden = false } = options;
      if (disposed) {
        return;
      }

      await switchToNewDayIfNeeded();

      const now = Date.now();
      const deltaMs = Math.min(Math.max(now - lastVisibleAtRef.current, 0), MAX_DELTA_MS);
      lastVisibleAtRef.current = now;

      if (document.visibilityState !== "visible" && !allowHidden) {
        return;
      }

      const state = stateRef.current;
      state.minutesSpent = normalizeMinutes(state.minutesSpent + deltaMs / 60000, state.minutesSpent);
      writeTrackerState(state);
      await markThresholds(state);
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "hidden") {
        await tick({ allowHidden: true });
        const state = stateRef.current;
        sendHeatmapDayKeepalive(state.date, state.minutesSpent);
      } else {
        lastVisibleAtRef.current = Date.now();
      }
    };

    const handlePageHide = () => {
      const state = stateRef.current;
      sendHeatmapDayKeepalive(state.date, state.minutesSpent);
    };

    const initialState = readTrackerState();
    if (initialState.date !== getLocalDateKey()) {
      stateRef.current = createDefaultTrackerState(getLocalDateKey());
    } else {
      stateRef.current = initialState;
    }

    writeTrackerState(stateRef.current);
    ensureVisit(stateRef.current);
    lastVisibleAtRef.current = Date.now();

    const intervalId = window.setInterval(() => {
      tick();
    }, TICK_INTERVAL_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
      const state = stateRef.current;
      sendHeatmapDayKeepalive(state.date, state.minutesSpent);
    };
  }, [isTrackingActive]);
}

export default useStudyHeatmapTracker;
