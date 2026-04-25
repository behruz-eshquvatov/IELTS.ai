const { DailyTaskUnit, DAILY_TASK_TYPES } = require("../models/dailyTaskUnitModel");
const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const StudentUnitProgress = require("../models/studentUnitProgressModel");
const User = require("../models/userModel");
const ATTEMPT_CATEGORIES = ["daily", "additional"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeTaskType(value) {
  const safe = normalizeText(value).toLowerCase();
  return DAILY_TASK_TYPES.includes(safe) ? safe : "";
}

function normalizeTaskRefId(value) {
  return normalizeText(value);
}

function normalizeAttemptCategory(value, fallback = "") {
  const safe = normalizeText(value).toLowerCase();
  if (ATTEMPT_CATEGORIES.includes(safe)) {
    return safe;
  }

  return fallback;
}

function normalizeSourceType(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
}

function inferDefaultSourceType(taskType, attemptCategory) {
  if (attemptCategory === "daily") {
    return "daily_unit";
  }

  if (taskType === "reading") {
    return "reading_full";
  }

  if (taskType === "listening") {
    return "listening_full";
  }

  if (taskType === "writing_task1") {
    return "writing_task1_extra";
  }

  if (taskType === "writing_task2") {
    return "writing_task2_extra";
  }

  return "additional_task";
}

function normalizeStudentEmail(value) {
  return normalizeText(value).toLowerCase();
}

function toPositiveInteger(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function toSafeDate(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.valueOf())) {
    return new Date();
  }

  return parsed;
}

function toFiniteNonNegative(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
}

function toNullableFinite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function startOfUtcDay(value) {
  const safeDate = toSafeDate(value);
  return new Date(Date.UTC(
    safeDate.getUTCFullYear(),
    safeDate.getUTCMonth(),
    safeDate.getUTCDate(),
  ));
}

function addUtcDays(value, daysToAdd = 0) {
  const base = startOfUtcDay(value);
  const next = new Date(base);
  next.setUTCDate(base.getUTCDate() + Math.max(0, Math.round(Number(daysToAdd) || 0)));
  return next;
}

function roundToNearestHalf(value) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return Math.round(Number(value) * 2) / 2;
}

function roundToSingleDecimal(value) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  return Number(Number(value).toFixed(1));
}

function createTaskKey(taskType, taskRefId) {
  return `${taskType}::${taskRefId}`;
}

function normalizeUnitTasks(tasks = []) {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task, index) => ({
      taskType: normalizeTaskType(task?.taskType),
      taskRefId: normalizeTaskRefId(task?.taskRefId),
      order: toPositiveInteger(task?.order, index + 1),
    }))
    .filter((task) => Boolean(task.taskType) && Boolean(task.taskRefId))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .map((task, index) => ({
      ...task,
      order: index + 1,
    }));
}

function normalizePublishedUnits(units = []) {
  return (Array.isArray(units) ? units : [])
    .map((unit, index) => ({
      unitId: normalizeText(unit?._id),
      unitTitle: normalizeText(unit?.title) || `Unit ${index + 1}`,
      unitOrder: toPositiveInteger(unit?.order, index + 1),
      tasks: normalizeUnitTasks(unit?.tasks || []),
    }))
    .filter((unit) => Boolean(unit.unitId) && unit.tasks.length > 0)
    .sort((left, right) => Number(left.unitOrder || 0) - Number(right.unitOrder || 0));
}

function isAutoSubmittedFromReason(submitReason = "", forceReason = "") {
  const source = `${normalizeText(submitReason)} ${normalizeText(forceReason)}`.toLowerCase();
  if (!source || source === "manual") {
    return false;
  }

  const autoKeywords = [
    "auto",
    "leave-page",
    "tab-hidden",
    "page-hide",
    "focus-lost",
    "audio-ended",
    "before-unload",
  ];

  return autoKeywords.some((keyword) => source.includes(keyword));
}

function extractBandFromAttempt(attempt) {
  const explicitBand = toNullableFinite(attempt?.score?.band);
  if (explicitBand !== null) {
    return roundToNearestHalf(Math.max(0, Math.min(explicitBand, 9)));
  }

  const percentage = toNullableFinite(attempt?.score?.percentage);
  if (percentage === null) {
    return null;
  }

  const convertedBand = (Math.max(0, Math.min(percentage, 100)) / 100) * 9;
  return roundToNearestHalf(convertedBand);
}

function buildBreakdownLabel(latestAttempts = []) {
  const parts = (Array.isArray(latestAttempts) ? latestAttempts : [])
    .map((attempt) => {
      const taskType = normalizeTaskType(attempt?.taskType);
      const band = extractBandFromAttempt(attempt);
      const percentage = toNullableFinite(attempt?.score?.percentage);

      if (taskType === "reading") {
        if (band !== null) {
          return `R ${band.toFixed(1)}`;
        }
        if (percentage !== null) {
          return `R ${Math.round(percentage)}%`;
        }
        return "R";
      }

      if (taskType === "listening") {
        if (band !== null) {
          return `L ${band.toFixed(1)}`;
        }
        if (percentage !== null) {
          return `L ${Math.round(percentage)}%`;
        }
        return "L";
      }

      if (taskType === "writing_task1") {
        if (band !== null) {
          return `W1 ${band.toFixed(1)}`;
        }
        return "W1";
      }

      if (taskType === "writing_task2") {
        if (band !== null) {
          return `W2 ${band.toFixed(1)}`;
        }
        return "W2";
      }

      return "";
    })
    .filter(Boolean);

  return parts.join(" / ");
}

function buildUnitAttemptSnapshot(attemptNumber, submittedAt, latestAttempts = []) {
  const safeAttempts = Array.isArray(latestAttempts) ? latestAttempts.filter(Boolean) : [];
  const totalTimeSpentSeconds = safeAttempts.reduce(
    (sum, attempt) => sum + toFiniteNonNegative(attempt?.totalTimeSpentSeconds, 0),
    0,
  );
  const percentageValues = safeAttempts
    .map((attempt) => toNullableFinite(attempt?.score?.percentage))
    .filter((value) => value !== null);
  const bandValues = safeAttempts
    .map((attempt) => extractBandFromAttempt(attempt))
    .filter((value) => value !== null);

  let averageBand = null;
  if (bandValues.length > 0) {
    averageBand = roundToNearestHalf(
      bandValues.reduce((sum, value) => sum + Number(value || 0), 0) / bandValues.length,
    );
  }

  let averagePercentage = null;
  if (percentageValues.length > 0) {
    averagePercentage = roundToSingleDecimal(
      percentageValues.reduce((sum, value) => sum + Number(value || 0), 0) / percentageValues.length,
    );
  }

  return {
    attemptNumber,
    submittedAt: toSafeDate(submittedAt),
    band: averageBand,
    scorePercent: averagePercentage,
    totalTimeSpentSeconds: Math.round(totalTimeSpentSeconds),
    breakdownLabel: buildBreakdownLabel(safeAttempts),
    taskAttemptIds: safeAttempts.map((attempt) => normalizeText(attempt?._id)).filter(Boolean),
  };
}

async function getPublishedUnits() {
  const units = await DailyTaskUnit.find({ status: "published" })
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .lean();

  return normalizePublishedUnits(units);
}

async function resolvePublishedUnitForTask(taskType, taskRefId) {
  const safeTaskType = normalizeTaskType(taskType);
  const safeTaskRefId = normalizeTaskRefId(taskRefId);
  if (!safeTaskType || !safeTaskRefId) {
    return null;
  }

  const unit = await DailyTaskUnit.findOne({
    status: "published",
    tasks: {
      $elemMatch: {
        taskType: safeTaskType,
        taskRefId: safeTaskRefId,
      },
    },
  })
    .sort({ order: 1, createdAt: 1, _id: 1 })
    .lean();

  if (!unit) {
    return null;
  }

  const unitTasks = normalizeUnitTasks(unit?.tasks || []);
  const matchedTask = unitTasks.find((task) => task.taskType === safeTaskType && task.taskRefId === safeTaskRefId) || null;

  return {
    unitId: normalizeText(unit?._id),
    unitTitle: normalizeText(unit?.title),
    unitOrder: toPositiveInteger(unit?.order, 1),
    unitTaskOrder: matchedTask ? toPositiveInteger(matchedTask.order, 1) : null,
    unitTaskRef: matchedTask ? createTaskKey(matchedTask.taskType, matchedTask.taskRefId) : "",
  };
}

async function getNextTaskAttemptNumber(studentUserId, attemptCategory, taskType, taskRefId) {
  const previousAttempt = await StudentTaskAttempt.findOne({
    studentUserId: normalizeText(studentUserId),
    attemptCategory: normalizeAttemptCategory(attemptCategory, "additional"),
    taskType: normalizeTaskType(taskType),
    taskRefId: normalizeTaskRefId(taskRefId),
  })
    .sort({ submittedAt: -1, attemptNumber: -1, createdAt: -1 })
    .lean();

  return toPositiveInteger(previousAttempt?.attemptNumber, 0) + 1;
}

async function resolveDailyCalendarEligibility(studentUserId, explicitAnchorDate = null) {
  const safeStudentUserId = normalizeText(studentUserId);
  if (!safeStudentUserId) {
    return {
      anchorDate: startOfUtcDay(new Date()),
      eligibleUnitCount: 1,
    };
  }

  let anchorDate = explicitAnchorDate ? toSafeDate(explicitAnchorDate) : null;
  if (!anchorDate) {
    const userDoc = await User.findById(safeStudentUserId, { createdAt: 1 }).lean();
    anchorDate = userDoc?.createdAt ? toSafeDate(userDoc.createdAt) : new Date();
  }

  const today = startOfUtcDay(new Date());
  const anchorUtcDay = startOfUtcDay(anchorDate);
  const elapsedDays = Math.max(
    0,
    Math.floor((today.valueOf() - anchorUtcDay.valueOf()) / (24 * 60 * 60 * 1000)),
  );

  return {
    anchorDate: anchorUtcDay,
    eligibleUnitCount: elapsedDays + 1,
  };
}

async function rebuildStudentUnitProgress(studentUserId, studentEmail = "", options = {}) {
  const safeStudentUserId = normalizeText(studentUserId);
  if (!safeStudentUserId) {
    return [];
  }

  const safeStudentEmail = normalizeStudentEmail(studentEmail);
  const units = await getPublishedUnits();
  const calendarEligibility = await resolveDailyCalendarEligibility(
    safeStudentUserId,
    options?.calendarAnchorDate || null,
  );
  const eligibleUnitCount = Math.max(1, Number(calendarEligibility?.eligibleUnitCount || 1));
  const calendarAnchorDate = toSafeDate(calendarEligibility?.anchorDate || new Date());

  if (units.length === 0) {
    await StudentUnitProgress.deleteMany({ studentUserId: safeStudentUserId });
    return [];
  }

  const validTaskKeys = new Set(
    units.flatMap((unit) => unit.tasks.map((task) => createTaskKey(task.taskType, task.taskRefId))),
  );
  const allAttempts = await StudentTaskAttempt.find({
    studentUserId: safeStudentUserId,
    attemptCategory: "daily",
    status: "completed",
  })
    .sort({ submittedAt: 1, createdAt: 1, _id: 1 })
    .lean();
  const relevantAttempts = allAttempts.filter((attempt) =>
    validTaskKeys.has(createTaskKey(normalizeTaskType(attempt?.taskType), normalizeTaskRefId(attempt?.taskRefId))),
  );

  const attemptsByTaskKey = new Map();
  relevantAttempts.forEach((attempt) => {
    const taskKey = createTaskKey(normalizeTaskType(attempt?.taskType), normalizeTaskRefId(attempt?.taskRefId));
    const list = attemptsByTaskKey.get(taskKey) || [];
    list.push(attempt);
    attemptsByTaskKey.set(taskKey, list);
  });

  let allPreviousUnitsCompleted = true;
  const progressDocs = units.map((unit, unitIndex) => {
    const taskKeys = unit.tasks.map((task) => createTaskKey(task.taskType, task.taskRefId));
    const completedTaskRefs = unit.tasks
      .map((task) => {
        const taskKey = createTaskKey(task.taskType, task.taskRefId);
        const attemptsForTask = attemptsByTaskKey.get(taskKey) || [];
        const latestAttempt = attemptsForTask.length > 0 ? attemptsForTask[attemptsForTask.length - 1] : null;
        if (!latestAttempt) {
          return null;
        }

        return {
          taskType: task.taskType,
          taskRefId: task.taskRefId,
          latestAttemptId: normalizeText(latestAttempt?._id),
          completedAt: latestAttempt?.submittedAt || latestAttempt?.createdAt || null,
        };
      })
      .filter(Boolean);

    const isCompleted = completedTaskRefs.length === taskKeys.length && taskKeys.length > 0;

    const relevantUnitAttempts = relevantAttempts.filter((attempt) =>
      taskKeys.includes(createTaskKey(normalizeTaskType(attempt?.taskType), normalizeTaskRefId(attempt?.taskRefId))),
    );

    const latestByTaskKey = new Map();
    const unitSnapshots = [];
    relevantUnitAttempts.forEach((attempt) => {
      const taskKey = createTaskKey(normalizeTaskType(attempt?.taskType), normalizeTaskRefId(attempt?.taskRefId));
      latestByTaskKey.set(taskKey, attempt);

      const hasAllTaskAttempts = taskKeys.every((key) => latestByTaskKey.has(key));
      if (!hasAllTaskAttempts) {
        return;
      }

      const latestAttempts = taskKeys.map((key) => latestByTaskKey.get(key));
      unitSnapshots.push(
        buildUnitAttemptSnapshot(
          unitSnapshots.length + 1,
          attempt?.submittedAt || attempt?.createdAt || new Date(),
          latestAttempts,
        ),
      );
    });

    const latestSnapshot = unitSnapshots.length > 0 ? unitSnapshots[unitSnapshots.length - 1] : null;
    const completedAt = unitSnapshots.length > 0 ? unitSnapshots[0].submittedAt : null;
    const lastAttemptAt = unitSnapshots.length > 0 ? latestSnapshot.submittedAt : null;
    const calendarDayIndex = unitIndex + 1;
    const calendarEligible = calendarDayIndex <= eligibleUnitCount;
    const calendarAvailableAt = addUtcDays(calendarAnchorDate, unitIndex);

    let status = "locked";
    if (isCompleted) {
      status = "completed";
    } else if (calendarEligible && allPreviousUnitsCompleted) {
      status = "available";
    }

    if (!isCompleted) {
      allPreviousUnitsCompleted = false;
    }

    return {
      studentUserId: safeStudentUserId,
      studentEmail: safeStudentEmail,
      unitId: unit.unitId,
      unitTitle: unit.unitTitle,
      unitOrder: unit.unitOrder,
      calendarDayIndex,
      calendarEligible,
      calendarAvailableAt,
      status,
      latestBand: latestSnapshot?.band ?? null,
      latestScorePercent: latestSnapshot?.scorePercent ?? null,
      latestTimeSpentSeconds: latestSnapshot?.totalTimeSpentSeconds || 0,
      attemptsCount: unitSnapshots.length,
      completedTaskRefs,
      attempts: unitSnapshots,
      completedAt,
      lastAttemptAt,
    };
  });

  const unitIdSet = new Set(progressDocs.map((doc) => doc.unitId));
  const bulkOps = progressDocs.map((doc) => ({
    updateOne: {
      filter: {
        studentUserId: safeStudentUserId,
        unitId: doc.unitId,
      },
      update: {
        $set: doc,
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await StudentUnitProgress.bulkWrite(bulkOps, { ordered: false });
  }

  await StudentUnitProgress.deleteMany({
    studentUserId: safeStudentUserId,
    unitId: { $nin: Array.from(unitIdSet) },
  });

  return StudentUnitProgress.find({ studentUserId: safeStudentUserId })
    .sort({ unitOrder: 1, unitId: 1 })
    .lean();
}

async function recordStudentTaskAttempt(payload = {}) {
  const studentUserId = normalizeText(payload.studentUserId);
  const studentEmail = normalizeStudentEmail(payload.studentEmail);
  const taskType = normalizeTaskType(payload.taskType);
  const taskRefId = normalizeTaskRefId(payload.taskRefId);
  if (!studentUserId || !studentEmail || !taskType || !taskRefId) {
    throw new Error("studentUserId, studentEmail, taskType, and taskRefId are required.");
  }

  const requestedAttemptCategory = normalizeAttemptCategory(payload.attemptCategory, "");
  const unitMeta = await resolvePublishedUnitForTask(taskType, taskRefId);
  const resolvedAttemptCategory = requestedAttemptCategory
    ? requestedAttemptCategory
    : unitMeta
      ? "daily"
      : "additional";

  if (resolvedAttemptCategory === "daily" && !unitMeta) {
    throw new Error(`Task '${taskType}:${taskRefId}' is not present in published daily units.`);
  }

  const attemptNumber = toPositiveInteger(payload.attemptNumber, 0) || await getNextTaskAttemptNumber(
    studentUserId,
    resolvedAttemptCategory,
    taskType,
    taskRefId,
  );
  const submitReason = normalizeText(payload.submitReason) || "manual";
  const forceReason = normalizeText(payload.forceReason);
  const explicitAutoSubmitted = payload.isAutoSubmitted === true;
  const isAutoSubmitted = explicitAutoSubmitted || isAutoSubmittedFromReason(submitReason, forceReason);
  const submittedAt = toSafeDate(payload.submittedAt);
  const sourceType = normalizeSourceType(payload.sourceType) || inferDefaultSourceType(taskType, resolvedAttemptCategory);
  const status = normalizeText(payload.status) || "completed";

  const score = payload.score && typeof payload.score === "object" ? payload.score : {};
  const safeScore = {
    band: roundToNearestHalf(toNullableFinite(score.band)),
    percentage: toNullableFinite(score.percentage),
    correctCount: toNullableFinite(score.correctCount),
    incorrectCount: toNullableFinite(score.incorrectCount),
    totalQuestions: toNullableFinite(score.totalQuestions),
  };

  if (safeScore.incorrectCount === null) {
    if (safeScore.totalQuestions !== null && safeScore.correctCount !== null) {
      safeScore.incorrectCount = Math.max(0, safeScore.totalQuestions - safeScore.correctCount);
    } else {
      safeScore.incorrectCount = null;
    }
  }

  const createdAttempt = await StudentTaskAttempt.create({
    studentUserId,
    studentEmail,
    attemptCategory: resolvedAttemptCategory,
    sourceType,
    status,
    unitId: unitMeta?.unitId || "",
    unitTitle: unitMeta?.unitTitle || "",
    unitOrder: unitMeta?.unitOrder || 0,
    unitTaskOrder: unitMeta?.unitTaskOrder || null,
    unitTaskRef: unitMeta?.unitTaskRef || "",
    taskType,
    taskRefId,
    taskLabel: normalizeText(payload.taskLabel),
    attemptNumber,
    submitReason,
    forceReason,
    isAutoSubmitted,
    totalTimeSpentSeconds: Math.round(toFiniteNonNegative(payload.totalTimeSpentSeconds, 0)),
    score: safeScore,
    unitBreakdown: Array.isArray(payload.unitBreakdown) ? payload.unitBreakdown : [],
    payload: payload.payload && typeof payload.payload === "object" ? payload.payload : {},
    sourceRefs: payload.sourceRefs && typeof payload.sourceRefs === "object" ? payload.sourceRefs : {},
    submittedAt,
  });

  if (resolvedAttemptCategory === "daily") {
    await rebuildStudentUnitProgress(studentUserId, studentEmail);
  }

  return createdAttempt.toObject();
}

async function getStudentUnitProgress(studentUserId) {
  const safeStudentUserId = normalizeText(studentUserId);
  if (!safeStudentUserId) {
    return [];
  }

  return StudentUnitProgress.find({ studentUserId: safeStudentUserId })
    .sort({ unitOrder: 1, unitId: 1 })
    .lean();
}

async function listRecentStudentTaskAttempts(studentUserId, limit = 10, filters = {}) {
  const safeStudentUserId = normalizeText(studentUserId);
  if (!safeStudentUserId) {
    return [];
  }

  const safeLimit = Math.min(Math.max(toPositiveInteger(limit, 10), 1), 40);
  const filter = {
    studentUserId: safeStudentUserId,
  };
  const attemptCategory = normalizeAttemptCategory(filters?.attemptCategory, "");
  if (attemptCategory) {
    filter.attemptCategory = attemptCategory;
  }
  const status = normalizeText(filters?.status);
  if (status) {
    filter.status = status;
  }

  return StudentTaskAttempt.find(filter)
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .limit(safeLimit)
    .lean();
}

async function listStudentTaskAttempts(studentUserId, options = {}) {
  const safeStudentUserId = normalizeText(studentUserId);
  if (!safeStudentUserId) {
    return {
      attempts: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    };
  }

  const requestedPage = Math.max(toPositiveInteger(options?.page, 1), 1);
  const limit = Math.min(Math.max(toPositiveInteger(options?.limit, 20), 1), 100);
  const filter = {
    studentUserId: safeStudentUserId,
  };
  const attemptCategory = normalizeAttemptCategory(options?.attemptCategory, "");
  if (attemptCategory) {
    filter.attemptCategory = attemptCategory;
  }
  const taskType = normalizeTaskType(options?.taskType);
  if (taskType) {
    filter.taskType = taskType;
  }
  const taskRefId = normalizeTaskRefId(options?.taskRefId);
  if (taskRefId) {
    filter.taskRefId = taskRefId;
  }
  const sourceType = normalizeSourceType(options?.sourceType);
  if (sourceType) {
    filter.sourceType = sourceType;
  }

  const total = await StudentTaskAttempt.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const pageSkip = (page - 1) * limit;
  const attempts = await StudentTaskAttempt.find(filter)
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .skip(pageSkip)
    .limit(limit)
    .lean();

  return {
    attempts,
    total,
    page,
    limit,
    totalPages,
  };
}

module.exports = {
  normalizeTaskType,
  normalizeTaskRefId,
  normalizeAttemptCategory,
  normalizeSourceType,
  normalizeStudentEmail,
  isAutoSubmittedFromReason,
  getPublishedUnits,
  resolvePublishedUnitForTask,
  recordStudentTaskAttempt,
  rebuildStudentUnitProgress,
  getStudentUnitProgress,
  listRecentStudentTaskAttempts,
  listStudentTaskAttempts,
};
