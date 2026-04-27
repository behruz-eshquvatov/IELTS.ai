import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../../lib/apiClient";

const TRACKER_STORAGE_KEY = "student:study-heatmap:tracker";
const CELL_SIZE = 14;
const CELL_GAP = 4;

function getDateKey(dateInput = new Date()) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function normalizeHeatmapData(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const byDate = new Map();

  entries.forEach((entry) => {
    const date = String(entry?.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return;
    }

    const minutesSpent = Number(entry?.minutesSpent);
    const safeMinutes = Number.isFinite(minutesSpent) && minutesSpent >= 0 ? Number(minutesSpent.toFixed(1)) : 0;

    if (!byDate.has(date)) {
      byDate.set(date, { date, minutesSpent: safeMinutes });
      return;
    }

    const current = byDate.get(date);
    current.minutesSpent = Math.max(current.minutesSpent, safeMinutes);
  });

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function readTrackerDayState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(TRACKER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const date = String(parsed?.date || "").trim();
    const minutesSpent = Number(parsed?.minutesSpent);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return null;
    }

    if (!Number.isFinite(minutesSpent) || minutesSpent < 0) {
      return { date, minutesSpent: 0 };
    }

    return {
      date,
      minutesSpent: Number(minutesSpent.toFixed(1)),
    };
  } catch {
    return null;
  }
}

function getHeatmapLevel(minutesSpent = 0, hasEntry = false) {
  if (!hasEntry) {
    return 0;
  }

  if (minutesSpent >= 120) {
    return 4;
  }

  if (minutesSpent >= 60) {
    return 3;
  }

  if (minutesSpent >= 30) {
    return 2;
  }

  return 1;
}

function buildHeatmapCalendar(entries, year) {
  const entryByDate = new Map(entries.map((entry) => [entry.date, entry.minutesSpent]));
  const firstDay = new Date(year, 0, 1);
  const daysInCurrentYear = isLeapYear(year) ? 366 : 365;
  const leadingEmptyCount = firstDay.getDay();

  const cells = [];
  for (let i = 0; i < leadingEmptyCount; i += 1) {
    cells.push({
      id: `leading-${i}`,
      placeholder: true,
    });
  }

  const monthTicks = [];

  for (let i = 0; i < daysInCurrentYear; i += 1) {
    const day = new Date(year, 0, 1 + i);
    const dateKey = getDateKey(day);
    const minutesSpent = Number(entryByDate.get(dateKey) || 0);
    const hasEntry = entryByDate.has(dateKey);

    if (day.getDate() === 1) {
      const column = Math.floor((leadingEmptyCount + i) / 7);
      monthTicks.push({
        label: day.toLocaleString("en-US", { month: "short" }).toUpperCase(),
        column,
      });
    }

    cells.push({
      id: dateKey,
      dateKey,
      date: day,
      placeholder: false,
      minutesSpent,
      hasEntry,
      level: getHeatmapLevel(minutesSpent, hasEntry),
    });
  }

  const trailingEmptyCount = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailingEmptyCount; i += 1) {
    cells.push({
      id: `trailing-${i}`,
      placeholder: true,
    });
  }

  const columns = Math.ceil(cells.length / 7);
  const gridWidth = columns * CELL_SIZE + (columns - 1) * CELL_GAP;

  return {
    columns,
    cells,
    monthTicks,
    gridWidth,
  };
}

function getCellClass(level) {
  switch (level) {
    case 4:
      return "border border-emerald-800/70 bg-emerald-700";
    case 3:
      return "border border-emerald-600/70 bg-emerald-500";
    case 2:
      return "border border-emerald-400/70 bg-emerald-300";
    case 1:
      return "border border-emerald-200/80 bg-emerald-100";
    default:
      return "border border-slate-200/80 bg-transparent";
  }
}

function formatMinutes(minutesSpent) {
  const rounded = Number(minutesSpent.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function StudentActivityHeatmap({ entries: providedEntries = null }) {
  const [entries, setEntries] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [tooltip, setTooltip] = useState(null);
  const currentYear = new Date().getFullYear();

  const loadHeatmap = useCallback(async () => {
    if (Array.isArray(providedEntries)) {
      setEntries(normalizeHeatmapData(providedEntries));
      setFetchError("");
      return;
    }

    try {
      const response = await apiRequest("/users/me/heatmap");
      setEntries(normalizeHeatmapData(response?.entries || []));
      setFetchError("");
    } catch {
      try {
        const fallbackResponse = await apiRequest("/students/me/study-activity/heatmap");
        setEntries(normalizeHeatmapData(fallbackResponse?.entries || []));
        setFetchError("");
      } catch {
        setFetchError("Failed to load heatmap activity.");
      }
    }
  }, [providedEntries]);

  useEffect(() => {
    const runLoad = async () => {
      await loadHeatmap();
    };

    runLoad();
    if (Array.isArray(providedEntries)) {
      return undefined;
    }

    const intervalId = window.setInterval(runLoad, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadHeatmap, providedEntries]);

  const mergedEntries = useMemo(() => {
    const normalized = normalizeHeatmapData(entries);
    const byDate = new Map(normalized.map((entry) => [entry.date, entry]));

    const trackerState = readTrackerDayState();
    if (trackerState && trackerState.date.startsWith(String(currentYear))) {
      const existing = byDate.get(trackerState.date);
      if (!existing) {
        byDate.set(trackerState.date, {
          date: trackerState.date,
          minutesSpent: trackerState.minutesSpent,
        });
      } else {
        existing.minutesSpent = Math.max(existing.minutesSpent, trackerState.minutesSpent);
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [currentYear, entries]);

  const { columns, cells, monthTicks, gridWidth } = useMemo(
    () => buildHeatmapCalendar(mergedEntries, currentYear),
    [currentYear, mergedEntries],
  );

  return (
    <div className="w-full text-slate-700">
      <div className="rounded-none border border-slate-200/80 bg-[#fbf7f0]/90 p-6">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="grid grid-cols-[auto_1fr] items-end gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              <span className="w-8" aria-hidden="true" />
              <div
                className="grid"
                style={{
                  width: `${gridWidth}px`,
                  gridTemplateColumns: `repeat(${columns}, ${CELL_SIZE}px)`,
                  columnGap: `${CELL_GAP}px`,
                }}
              >
                {monthTicks.map((tick, index) => (
                  <span
                    key={`${tick.label}-${tick.column}-${index}`}
                    style={{ gridColumnStart: Math.min(Math.max((tick.column || 0) + 1, 1), columns) }}
                  >
                    {tick.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-[auto_1fr] gap-3">
              <div className="grid text-[10px] text-slate-400" style={{ gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`, rowGap: `${CELL_GAP}px` }}>
                <span style={{ gridRow: 2 }}>Mon</span>
                <span style={{ gridRow: 4 }}>Wed</span>
                <span style={{ gridRow: 6 }}>Fri</span>
              </div>

              <div className="relative" style={{ width: `${gridWidth}px` }}>
                <div
                  className="grid"
                  style={{
                    gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
                    gridAutoFlow: "column",
                    gridAutoColumns: `${CELL_SIZE}px`,
                    rowGap: `${CELL_GAP}px`,
                    columnGap: `${CELL_GAP}px`,
                  }}
                >
                  {cells.map((cell) => {
                    if (cell.placeholder) {
                      return (
                        <span
                          key={cell.id}
                          className="h-[14px] w-[14px] border border-transparent"
                          aria-hidden="true"
                        />
                      );
                    }

                    const formattedDate = cell.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    const tooltipText = !cell.hasEntry
                      ? `${formattedDate} - no activity`
                      : cell.minutesSpent > 0
                      ? `${formattedDate} - ${formatMinutes(cell.minutesSpent)} min`
                      : `${formattedDate} - visited`;

                    return (
                      <button
                        key={cell.id}
                        type="button"
                        className={`h-[14px] w-[14px] rounded-[2px] transition-colors ${getCellClass(cell.level)}`}
                        onMouseEnter={(event) => {
                          setTooltip({
                            x: event.clientX,
                            y: event.clientY,
                            text: tooltipText,
                          });
                        }}
                        onMouseMove={(event) => {
                          setTooltip((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  x: event.clientX,
                                  y: event.clientY,
                                }
                              : prev,
                          );
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        aria-label={tooltipText}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-3 text-xs text-slate-500">
          {fetchError ? <span className="mr-auto">{fetchError}</span> : null}
          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-[2px] border border-slate-200/80 bg-transparent" />
              <span className="h-3 w-3 rounded-[2px] border border-emerald-200/80 bg-emerald-100" />
              <span className="h-3 w-3 rounded-[2px] border border-emerald-400/80 bg-emerald-300" />
              <span className="h-3 w-3 rounded-[2px] border border-emerald-600/80 bg-emerald-500" />
              <span className="h-3 w-3 rounded-[2px] border border-emerald-800/80 bg-emerald-700" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] text-white shadow-xl"
          style={{ left: tooltip.x, top: tooltip.y - 10 }}
        >
          {tooltip.text}
        </div>
      ) : null}
    </div>
  );
}

export default StudentActivityHeatmap;
