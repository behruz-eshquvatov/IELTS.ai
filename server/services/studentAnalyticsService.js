const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const User = require("../models/userModel");
const { DailyTaskUnit } = require("../models/dailyTaskUnitModel");
const { normalizeStudyHeatmapEntries } = require("../utils/studyHeatmap");

const PERIODS = ["week", "month", "lifetime"];
const SECTION_KEYS = ["all", "reading", "listening", "writing_task1", "writing_task2"];
const DAY_MS = 24 * 60 * 60 * 1000;

function normalizePeriod(value) {
  const safe = String(value || "").trim().toLowerCase();
  return PERIODS.includes(safe) ? safe : "week";
}

function startOfDay(dateInput = new Date()) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDateKey(dateInput = new Date()) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodStart(period, now = new Date()) {
  if (period === "lifetime") {
    return null;
  }

  const days = period === "month" ? 30 : 7;
  return new Date(startOfDay(now).valueOf() - ((days - 1) * DAY_MS));
}

function isDateInsidePeriod(value, period, now = new Date()) {
  if (period === "lifetime") {
    return true;
  }

  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) {
    return false;
  }

  const start = getPeriodStart(period, now);
  return date >= start && date <= now;
}

function toSection(taskType) {
  const safe = String(taskType || "").toLowerCase();
  if (safe.includes("listening")) return "listening";
  if (safe.includes("reading")) return "reading";
  if (safe.includes("writing_task1")) return "writing_task1";
  if (safe.includes("writing_task2")) return "writing_task2";
  return "all";
}

function normalizeSection(value, fallback = "all") {
  const safe = String(value || "").trim().toLowerCase();
  if (SECTION_KEYS.includes(safe)) {
    return safe;
  }
  return SECTION_KEYS.includes(fallback) ? fallback : "all";
}

function formatSectionLabel(section) {
  const safe = normalizeSection(section);
  if (safe === "writing_task1") return "Writing T1";
  if (safe === "writing_task2") return "Writing T2";
  return safe === "all" ? "" : safe.charAt(0).toUpperCase() + safe.slice(1);
}

function toBand(score = {}) {
  const band = Number(score?.band);
  if (Number.isFinite(band)) return band;

  const percentage = Number(score?.percentage);
  if (Number.isFinite(percentage)) {
    return Math.max(0, Math.min(9, Number(((percentage / 100) * 9).toFixed(1))));
  }

  return null;
}

function toAccuracy(score = {}) {
  const percentage = Number(score?.percentage);
  if (Number.isFinite(percentage)) return percentage;

  const correctCount = Number(score?.correctCount);
  const totalQuestions = Number(score?.totalQuestions);
  if (Number.isFinite(correctCount) && Number.isFinite(totalQuestions) && totalQuestions > 0) {
    return (correctCount / totalQuestions) * 100;
  }

  return null;
}

function average(values = []) {
  const safe = values.filter((value) => Number.isFinite(Number(value)));
  if (safe.length === 0) return null;
  return safe.reduce((sum, value) => sum + Number(value), 0) / safe.length;
}

function formatChartLabel(date, period) {
  if (period === "week") {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }

  if (period === "month") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function buildDateBuckets(period, attempts = [], entries = [], now = new Date()) {
  if (period === "lifetime") {
    const keys = new Set();
    attempts.forEach((attempt) => {
      const date = attempt?.submittedAt ? new Date(attempt.submittedAt) : null;
      if (date && !Number.isNaN(date.valueOf())) {
        keys.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
      }
    });
    entries.forEach((entry) => {
      const date = entry?.date ? new Date(`${entry.date}T00:00:00`) : null;
      if (date && !Number.isNaN(date.valueOf())) {
        keys.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
      }
    });

    return Array.from(keys)
      .sort()
      .map((key) => {
        const [year, month] = key.split("-").map(Number);
        const date = new Date(year, month - 1, 1);
        return {
          key,
          label: formatChartLabel(date, period),
          date,
        };
      });
  }

  const days = period === "month" ? 30 : 7;
  const start = getPeriodStart(period, now);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start.valueOf() + (index * DAY_MS));
    return {
      key: getDateKey(date),
      label: formatChartLabel(date, period),
      date,
    };
  });
}

function attemptBucketKey(attempt, period) {
  const date = attempt?.submittedAt ? new Date(attempt.submittedAt) : null;
  if (!date || Number.isNaN(date.valueOf())) return "";
  if (period === "lifetime") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return getDateKey(date);
}

function entryBucketKey(entry, period) {
  const date = entry?.date ? new Date(`${entry.date}T00:00:00`) : null;
  if (!date || Number.isNaN(date.valueOf())) return "";
  if (period === "lifetime") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }
  return entry.date;
}

function prettify(value) {
  const safe = String(value || "").trim();
  if (!safe) return "Other";

  const normalized = safe
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const withoutTrailingNumber = normalized.replace(/\s+\d+$/g, "").trim();
  const comparable = withoutTrailingNumber.toLowerCase();

  if (comparable.includes("binary judgement") || comparable.includes("true false") || comparable.includes("not given")) {
    return "True / False / Not Given";
  }

  if (comparable.includes("multiple choice")) {
    return "Multiple choice questions";
  }

  if (comparable.includes("gap fill") || comparable.includes("gapfill")) {
    return "Gap-fill questions";
  }

  if (comparable.includes("matching")) {
    return "Matching questions";
  }

  if (comparable.includes("map")) {
    return "Map labelling";
  }

  if (comparable.includes("form")) {
    return "Form completion";
  }

  if (comparable.includes("sentence completion")) {
    return "Sentence completion";
  }

  if (comparable.includes("summary completion")) {
    return "Summary completion";
  }

  return withoutTrailingNumber
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function addWeakArea(map, section, label, count = 1, metadata = {}) {
  const safeSection = normalizeSection(section);
  const blockType = String(metadata?.blockType || "").trim().toLowerCase();
  const questionFamily = String(metadata?.questionFamily || "").trim().toLowerCase();
  const safeLabel = prettify(label || blockType || questionFamily);
  const key = `${safeSection}::${safeLabel.toLowerCase()}`;
  const current = map.get(key) || {
    section: safeSection,
    sectionLabel: formatSectionLabel(safeSection),
    questionFamily,
    blockType,
    label: safeLabel,
    mistakes: 0,
  };
  current.questionFamily = current.questionFamily || questionFamily;
  current.blockType = current.blockType || blockType;
  current.mistakes += Math.max(1, Number(count) || 1);
  map.set(key, current);
}

function extractWeakAreas(attempts = []) {
  const map = new Map();

  attempts.forEach((attempt) => {
    const section = toSection(attempt?.taskType);
    const payload = attempt?.payload && typeof attempt.payload === "object" ? attempt.payload : {};
    const submission = payload?.submission && typeof payload.submission === "object" ? payload.submission : {};
    const evaluation = payload?.evaluation || submission?.evaluation || {};
    const incorrectItems = Array.isArray(evaluation?.incorrectItems) ? evaluation.incorrectItems : [];

    incorrectItems.forEach((item) => {
      const itemSection = normalizeSection(item?.section, section);
      const questionFamily = item?.questionFamily || "";
      const blockType = item?.blockType || "";
      addWeakArea(
        map,
        itemSection,
        blockType || questionFamily || item?.questionType || item?.blockTitle || attempt?.sourceType || attempt?.taskLabel,
        1,
        { questionFamily, blockType },
      );
    });

    if (incorrectItems.length === 0) {
      const incorrectCount = Number(attempt?.score?.incorrectCount);
      if (Number.isFinite(incorrectCount) && incorrectCount > 0) {
        const blockResults = Array.isArray(evaluation?.blockResults)
          ? evaluation.blockResults
          : Array.isArray(payload?.blockResults)
            ? payload.blockResults
            : Array.isArray(submission?.blockResults)
              ? submission.blockResults
              : [];
        if (blockResults.length > 0) {
          blockResults.forEach((blockResult) => {
            const blockIncorrectCount = Number(blockResult?.totalQuestions || 0) - Number(blockResult?.correctCount || 0);
            if (Number.isFinite(blockIncorrectCount) && blockIncorrectCount > 0) {
              addWeakArea(
                map,
                normalizeSection(blockResult?.section, section),
                blockResult?.blockType || blockResult?.questionFamily || blockResult?.blockTitle || attempt?.taskLabel,
                blockIncorrectCount,
                {
                  questionFamily: blockResult?.questionFamily || "",
                  blockType: blockResult?.blockType || "",
                },
              );
            }
          });
        } else {
          addWeakArea(
            map,
            section,
            payload?.blockType || payload?.questionFamily || attempt?.sourceType || attempt?.taskLabel || attempt?.taskType,
            incorrectCount,
            {
              questionFamily: payload?.questionFamily || "",
              blockType: payload?.blockType || "",
            },
          );
        }
      }
    }

    const analysis = payload?.analysis && typeof payload.analysis === "object" ? payload.analysis : payload;
    const diagnosis = analysis?.diagnosis && typeof analysis.diagnosis === "object" ? analysis.diagnosis : {};
    [
      ["coherenceIssues", "Coherence and cohesion"],
      ["lexicalIssues", "Lexical resource"],
      ["grammarIssues", "Grammar accuracy"],
    ].forEach(([key, label]) => {
      const items = Array.isArray(diagnosis?.[key]) ? diagnosis[key] : [];
      if (items.length > 0) {
        addWeakArea(map, section, label, items.length);
      }
    });

    const criteriaScores = analysis?.criteriaScores && typeof analysis.criteriaScores === "object"
      ? analysis.criteriaScores
      : {};
    Object.entries(criteriaScores).forEach(([criterion, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0 && numeric < 6) {
        addWeakArea(map, section, criterion, 1);
      }
    });
  });

  const bySection = SECTION_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});

  Array.from(map.values()).forEach((item) => {
    bySection[item.section].push(item);
    bySection.all.push(item);
  });

  Object.keys(bySection).forEach((section) => {
    const combined = new Map();
    bySection[section].forEach((item) => {
      const key = section === "all"
        ? `${item.section}::${item.label.toLowerCase()}`
        : item.label.toLowerCase();
      const current = combined.get(key) || {
        section: item.section,
        sectionLabel: item.sectionLabel || formatSectionLabel(item.section),
        questionFamily: item.questionFamily || "",
        blockType: item.blockType || "",
        label: item.label,
        mistakes: 0,
      };
      current.mistakes += item.mistakes;
      combined.set(key, current);
    });
    const total = Array.from(combined.values()).reduce((sum, item) => sum + item.mistakes, 0);
    bySection[section] = Array.from(combined.values())
      .sort((left, right) => right.mistakes - left.mistakes)
      .slice(0, 8)
      .map((item) => ({
        ...item,
        percentage: total ? Math.round((item.mistakes / total) * 100) : 0,
      }));
  });

  return bySection;
}

function normalizeUnitLabel(unit = {}, fallbackIndex = 0) {
  const title = String(unit?.title || "").trim();
  if (title) {
    return title;
  }

  const order = Number(unit?.order);
  return `Unit ${Number.isFinite(order) && order > 0 ? order : fallbackIndex + 1}`;
}

async function buildDailyUnitScores(studentUserId, attempts = []) {
  const publishedUnits = await DailyTaskUnit.find(
    { status: "published" },
    { _id: 1, title: 1, order: 1, tasks: 1 },
  )
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .lean();

  const dailyAttempts = (Array.isArray(attempts) ? attempts : [])
    .filter((attempt) => String(attempt?.attemptCategory || "").trim() === "daily")
    .sort((left, right) => {
      const leftDate = new Date(left?.submittedAt || left?.createdAt || 0).valueOf();
      const rightDate = new Date(right?.submittedAt || right?.createdAt || 0).valueOf();
      if (leftDate !== rightDate) return leftDate - rightDate;
      return Number(left?.attemptNumber || 0) - Number(right?.attemptNumber || 0);
    });

  const latestAttemptByUnitTask = new Map();
  dailyAttempts.forEach((attempt) => {
    const unitId = String(attempt?.unitId || "").trim();
    const taskType = String(attempt?.taskType || "").trim();
    const taskRefId = String(attempt?.taskRefId || "").trim();
    if (!unitId || !taskType || !taskRefId) {
      return;
    }

    latestAttemptByUnitTask.set(`${unitId}::${taskType}::${taskRefId}`, attempt);
  });

  return publishedUnits.flatMap((unit, unitIndex) => {
    const unitId = String(unit?._id || "").trim();
    const unitLabel = normalizeUnitLabel(unit, unitIndex);
    const unitOrder = Number(unit?.order) || unitIndex + 1;
    const tasks = Array.isArray(unit?.tasks) ? unit.tasks : [];

    return tasks.map((task) => {
      const taskType = String(task?.taskType || "").trim();
      const taskRefId = String(task?.taskRefId || "").trim();
      const section = toSection(taskType);
      const attempt = latestAttemptByUnitTask.get(`${unitId}::${taskType}::${taskRefId}`) || null;
      const score = attempt?.score || {};
      const band = toBand(score);
      const correctCount = Number(score?.correctCount);
      const totalQuestions = Number(score?.totalQuestions);

      return {
        unitId,
        unitLabel,
        unitOrder,
        taskType,
        section,
        sectionLabel: formatSectionLabel(section),
        taskRefId,
        score: band === null ? null : Number(band.toFixed(1)),
        band: band === null ? null : Number(band.toFixed(1)),
        correctCount: Number.isFinite(correctCount) ? correctCount : null,
        totalQuestions: Number.isFinite(totalQuestions) ? totalQuestions : null,
        attemptNumber: Number.isFinite(Number(attempt?.attemptNumber)) ? Number(attempt.attemptNumber) : null,
        submittedAt: attempt?.submittedAt || null,
        hasAttempt: Boolean(attempt),
      };
    });
  }).filter((row) => row.section !== "all");
}

function currentStreak(entries = [], now = new Date()) {
  const activeDates = new Set(
    entries
      .filter((entry) => Number(entry?.minutesSpent || 0) > 0)
      .map((entry) => String(entry.date || "")),
  );

  let streak = 0;
  let cursor = startOfDay(now);
  while (activeDates.has(getDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.valueOf() - DAY_MS);
  }
  return streak;
}

function generateInsight({ period, summary, weakSections }) {
  if (!summary.tasksCompleted && !summary.totalStudyMinutes) {
    return {
      title: period === "month" ? "Monthly insight" : period === "lifetime" ? "Lifetime insight" : "Weekly insight",
      text: "Complete more tasks to generate reliable insights.",
      recommendations: [
        "Finish at least one reading or listening task.",
        "Track study time while practicing so the dashboard can find patterns.",
      ],
    };
  }

  const strongestWeakArea = weakSections.all?.[0] || null;
  if (strongestWeakArea) {
    return {
      title: period === "month" ? "Monthly insight" : period === "lifetime" ? "Lifetime insight" : "Weekly insight",
      text: `${strongestWeakArea.label} is your most frequent weak area in this period, with ${strongestWeakArea.mistakes} recorded mistakes.`,
      recommendations: [
        `Review ${strongestWeakArea.label.toLowerCase()} before your next practice set.`,
        "Redo one related task and compare mistakes immediately after finishing.",
      ],
    };
  }

  if (summary.currentStreak < 2 && period !== "lifetime") {
    return {
      title: period === "month" ? "Monthly insight" : "Weekly insight",
      text: "Your practice data is still thin for this period. A steadier routine will make score trends more reliable.",
      recommendations: [
        "Study on at least three separate days this period.",
        "Complete one timed task before checking detailed analytics again.",
      ],
    };
  }

  return {
    title: period === "month" ? "Monthly insight" : period === "lifetime" ? "Lifetime insight" : "Weekly insight",
    text: `You completed ${summary.tasksCompleted} task${summary.tasksCompleted === 1 ? "" : "s"} with ${summary.totalStudyMinutes} minutes of recorded study time.`,
    recommendations: [
      "Keep reviewing mistakes within 24 hours of each attempt.",
      "Balance practice across listening, reading, and writing for clearer trends.",
    ],
  };
}

async function getDynamicStudentAnalytics(studentUserId, periodInput = "week") {
  const period = normalizePeriod(periodInput);
  const now = new Date();
  const dateFilter = getPeriodStart(period, now);
  const attemptQuery = {
    studentUserId: String(studentUserId || "").trim(),
    status: "completed",
  };

  if (dateFilter) {
    attemptQuery.submittedAt = { $gte: dateFilter, $lte: now };
  }

  const [attempts, allAttempts, user] = await Promise.all([
    StudentTaskAttempt.find(attemptQuery).sort({ submittedAt: 1, createdAt: 1 }).lean(),
    period === "lifetime"
      ? Promise.resolve([])
      : StudentTaskAttempt.find({
        studentUserId: String(studentUserId || "").trim(),
        status: "completed",
      }).sort({ submittedAt: 1, createdAt: 1 }).lean(),
    User.findById(studentUserId, { studyHeatmap: 1 }).lean(),
  ]);

  const sourceAttempts = period === "lifetime" ? attempts : allAttempts;
  const allEntries = normalizeStudyHeatmapEntries(user?.studyHeatmap || []);
  const periodEntries = allEntries.filter((entry) =>
    isDateInsidePeriod(`${entry.date}T00:00:00`, period, now),
  );
  const buckets = buildDateBuckets(period, sourceAttempts, allEntries, now);

  const attemptsForCharts = period === "lifetime" ? attempts : attempts;
  const bandByDay = buckets.map((bucket) => {
    const bucketAttempts = attemptsForCharts.filter((attempt) => attemptBucketKey(attempt, period) === bucket.key);
    const band = average(bucketAttempts.map((attempt) => toBand(attempt?.score)));
    return {
      label: bucket.label,
      value: band === null ? null : Number(band.toFixed(1)),
      band: band === null ? null : Number(band.toFixed(1)),
    };
  });

  const timeSpent = buckets.map((bucket) => {
    const minutes = periodEntries
      .filter((entry) => entryBucketKey(entry, period) === bucket.key)
      .reduce((sum, entry) => sum + Number(entry.minutesSpent || 0), 0);
    return {
      label: bucket.label,
      minutes: Number(minutes.toFixed(1)),
    };
  });

  const bands = attempts.map((attempt) => toBand(attempt?.score)).filter((value) => value !== null);
  const accuracies = attempts.map((attempt) => toAccuracy(attempt?.score)).filter((value) => value !== null);
  const totalStudyMinutes = periodEntries.reduce((sum, entry) => sum + Number(entry.minutesSpent || 0), 0);
  const weakSections = extractWeakAreas(attempts);
  const dailyUnitScores = await buildDailyUnitScores(studentUserId, attempts);
  const summary = {
    totalStudyMinutes: Math.round(totalStudyMinutes),
    tasksCompleted: attempts.length,
    averageBand: bands.length ? Number(average(bands).toFixed(1)) : null,
    averageAccuracy: accuracies.length ? Math.round(average(accuracies)) : null,
    currentStreak: currentStreak(allEntries, now),
  };

  return {
    period,
    summary,
    aiInsight: generateInsight({ period, summary, weakSections }),
    bandByDay,
    timeSpent,
    dailyUnitScores,
    practiceConsistency: periodEntries,
    weakSections,
    sectionFilters: [
      { value: "reading", label: "Reading" },
      { value: "listening", label: "Listening" },
      { value: "writing_task1", label: "Writing T1" },
      { value: "writing_task2", label: "Writing T2" },
    ],
  };
}

module.exports = {
  getDynamicStudentAnalytics,
  normalizePeriod,
};
