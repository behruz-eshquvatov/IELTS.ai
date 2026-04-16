const HEATMAP_LEVEL_ONE_MINUTES = 30;
const HEATMAP_LEVEL_TWO_MINUTES = 60;
const HEATMAP_LEVEL_THREE_MINUTES = 120;
const STUDY_HEATMAP_RETENTION_DAYS = 366 * 5;

function getDateKey(dateInput = new Date()) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(value, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw) {
    return fallback;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(date.getTime()) && getDateKey(date) === raw) {
      return raw;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return getDateKey(parsed);
}

function normalizeMinutes(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Number(parsed.toFixed(1));
}

function normalizeStudyHeatmapEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  const mergedByDate = new Map();

  entries.forEach((entry) => {
    const date = normalizeDateKey(entry?.date || entry?.dateKey);
    if (!date) {
      return;
    }

    const minutesSpent = normalizeMinutes(
      entry?.minutesSpent ?? entry?.taskActiveMinutes ?? 0,
      0,
    );

    if (!mergedByDate.has(date)) {
      mergedByDate.set(date, { date, minutesSpent });
      return;
    }

    const current = mergedByDate.get(date);
    current.minutesSpent = Math.max(current.minutesSpent, minutesSpent);
  });

  return Array.from(mergedByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function pruneHeatmapEntries(entries, keepDays = STUDY_HEATMAP_RETENTION_DAYS) {
  const normalized = normalizeStudyHeatmapEntries(entries);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffKey = getDateKey(cutoff);
  return normalized.filter((entry) => entry.date >= cutoffKey);
}

function mergeDailyMinutes(entries, payload = {}) {
  const mode = payload.mode === "increment" ? "increment" : "max";
  const date = normalizeDateKey(payload.date, getDateKey());
  const incomingMinutes = normalizeMinutes(payload.minutesSpent, 0);

  const normalized = normalizeStudyHeatmapEntries(entries);
  const nextEntries = [...normalized];
  const index = nextEntries.findIndex((entry) => entry.date === date);

  if (index === -1) {
    nextEntries.push({
      date,
      minutesSpent: incomingMinutes,
    });
  } else {
    const current = nextEntries[index];
    const nextMinutes = mode === "increment"
      ? current.minutesSpent + incomingMinutes
      : Math.max(current.minutesSpent, incomingMinutes);

    nextEntries[index] = {
      date,
      minutesSpent: Number(nextMinutes.toFixed(1)),
    };
  }

  return pruneHeatmapEntries(nextEntries);
}

function getHeatmapLevelByMinutes(minutesSpent = 0, hasEntry = true) {
  if (!hasEntry) {
    return 0;
  }

  if (minutesSpent >= HEATMAP_LEVEL_THREE_MINUTES) {
    return 4;
  }

  if (minutesSpent >= HEATMAP_LEVEL_TWO_MINUTES) {
    return 3;
  }

  if (minutesSpent >= HEATMAP_LEVEL_ONE_MINUTES) {
    return 2;
  }

  return 1;
}

function toDateOnly(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeekSunday(dateInput) {
  const date = toDateOnly(dateInput);
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function endOfWeekSaturday(dateInput) {
  const sunday = startOfWeekSunday(dateInput);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return saturday;
}

function diffDays(fromDate, toDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((toDate.getTime() - fromDate.getTime()) / msPerDay);
}

function buildYearHeatmapFromEntries(entries, yearInput = new Date().getFullYear()) {
  const fallbackYear = new Date().getFullYear();
  const parsedYear = Number.parseInt(String(yearInput), 10);
  const year = Number.isFinite(parsedYear) ? parsedYear : fallbackYear;

  const normalized = normalizeStudyHeatmapEntries(entries);
  const entryByDate = new Map(normalized.map((entry) => [entry.date, entry]));

  const firstDayOfYear = toDateOnly(new Date(year, 0, 1));
  const lastDayOfYear = toDateOnly(new Date(year, 11, 31));
  const rangeStart = startOfWeekSunday(firstDayOfYear);
  const rangeEnd = endOfWeekSaturday(lastDayOfYear);

  const activityData = [];
  const visibilityData = [];
  const monthTicks = [];

  const totalDays = diffDays(rangeStart, rangeEnd) + 1;

  for (let i = 0; i < totalDays; i += 1) {
    const day = new Date(rangeStart);
    day.setDate(rangeStart.getDate() + i);

    const dateKey = getDateKey(day);
    const isInsideCurrentYear = day >= firstDayOfYear && day <= lastDayOfYear;
    visibilityData.push(isInsideCurrentYear);

    if (!isInsideCurrentYear) {
      activityData.push(0);
      continue;
    }

    const entry = entryByDate.get(dateKey);
    activityData.push(getHeatmapLevelByMinutes(entry?.minutesSpent || 0, Boolean(entry)));
  }

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const firstOfMonth = toDateOnly(new Date(year, monthIndex, 1));
    const column = Math.floor(diffDays(rangeStart, firstOfMonth) / 7);

    monthTicks.push({
      label: firstOfMonth.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      column,
    });
  }

  return {
    months: monthTicks.map((tick) => tick.label),
    monthTicks,
    activityData,
    visibilityData,
    calendarYear: year,
    startDateKey: getDateKey(rangeStart),
    endDateKey: getDateKey(rangeEnd),
  };
}

function todaysStudySummary(entries, dateKeyInput = getDateKey()) {
  const dateKey = normalizeDateKey(dateKeyInput, getDateKey());
  const normalized = normalizeStudyHeatmapEntries(entries);
  const entry = normalized.find((item) => item.date === dateKey);
  const todaysStudyTimeMinutes = Number(entry?.minutesSpent || 0);
  const level = getHeatmapLevelByMinutes(todaysStudyTimeMinutes, Boolean(entry));

  return {
    date: dateKey,
    todaysStudyTimeMinutes,
    "today's study time": `${todaysStudyTimeMinutes} minutes`,
    "today's study time :": `${todaysStudyTimeMinutes} minutes`,
    level,
  };
}

module.exports = {
  HEATMAP_LEVEL_ONE_MINUTES,
  HEATMAP_LEVEL_TWO_MINUTES,
  HEATMAP_LEVEL_THREE_MINUTES,
  getDateKey,
  normalizeDateKey,
  normalizeMinutes,
  normalizeStudyHeatmapEntries,
  pruneHeatmapEntries,
  mergeDailyMinutes,
  getHeatmapLevelByMinutes,
  buildYearHeatmapFromEntries,
  todaysStudySummary,
};
