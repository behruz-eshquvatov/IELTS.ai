const mongoose = require("mongoose");
const StudentProfile = require("../models/studentProfileModel");
const StudentDailyTasks = require("../models/studentDailyTasksModel");
const StudentAnalytics = require("../models/studentAnalyticsModel");
const ListeningTest = require("../models/listeningTestModel");
const WritingTask1Item = require("../models/writingTask1ItemModel");
const WritingTask2Item = require("../models/writingTask2ItemModel");
const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const StudentUnitProgress = require("../models/studentUnitProgressModel");
const User = require("../models/userModel");
const {
  getPublishedUnits,
  getStudentUnitProgress,
  recordStudentTaskAttempt,
  rebuildStudentUnitProgress,
  listRecentStudentTaskAttempts,
  listStudentTaskAttempts,
} = require("../services/dailyTaskProgressService");
const {
  assertAdditionalTaskUnlocked,
} = require("../services/additionalTaskProgressService");
const {
  listResultsCenterGroups,
  listResultGroupAttempts,
  getResultGroupAttemptDetail,
  getWritingResultRedirectMeta,
} = require("../services/resultsCenterService");
const {
  getDynamicStudentAnalytics,
} = require("../services/studentAnalyticsService");
const {
  studentProfileSeed,
  studentDailyTasksSeed,
  studentAnalyticsSeed,
} = require("../data/studentSeedData");
const {
  buildYearHeatmapFromEntries,
  getDateKey,
  mergeDailyMinutes,
  normalizeDateKey,
  normalizeStudyHeatmapEntries,
  todaysStudySummary,
} = require("../utils/studyHeatmap");

const VALID_RANGES = ["week", "month", "lifetime"];
const VALID_PARTS = ["Listening", "Reading", "Writing"];
const VALID_TASK_STATUSES = ["completed", "pending", "locked"];
const READING_TESTS_COLLECTION = "reading_tests";
const READING_PASSAGES_COLLECTION = "reading_passages";
const LISTENING_BLOCKS_COLLECTION = "listening_blocks";
const LEGACY_LISTENING_BLOCKS_COLLECTION = "listeninig_blocks";
const DAILY_TASK_TYPES = ["reading", "listening", "writing_task1", "writing_task2"];
const ATTEMPT_CATEGORIES = ["daily", "additional"];
const RESULTS_CATEGORY_KEYS = [
  "all",
  "writing_task1",
  "writing_task2",
  "reading_full",
  "listening_full",
  "reading_question",
  "listening_question",
];
const RESULTS_CATEGORY_LABELS = {
  all: "ALL",
  writing_task1: "WRITING T1",
  writing_task2: "WRITING T2",
  reading_full: "READING FULL TESTS",
  listening_full: "LISTENING FULL TESTS",
};
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PROFILE_BIO_MAX_LENGTH = 300;

function respondResultsCenterError(res, error, fallbackMessage = "Could not load results data.") {
  const statusCode = Number.isFinite(Number(error?.httpStatus))
    ? Number(error.httpStatus)
    : Number.isFinite(Number(error?.status))
      ? Number(error.status)
      : 500;

  return res.status(statusCode).json({
    message: String(error?.message || fallbackMessage),
  });
}

function normalizeStudentId(studentId) {
  return String(studentId || "").trim().toLowerCase();
}

function normalizeProfileText(value, maxLength = 300) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeText(value, fallback = "", maxLength = 320) {
  const normalized = String(value || "").trim().slice(0, maxLength);
  return normalized || String(fallback || "").trim().slice(0, maxLength);
}

function formatSecurityUpdatedLabel() {
  return "";
}

function normalizePositiveOrder(value, fallback = 1) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeDailyTaskType(value) {
  const safe = String(value || "").trim().toLowerCase();
  return DAILY_TASK_TYPES.includes(safe) ? safe : "";
}

function normalizeDailyTaskRefId(value) {
  return String(value || "").trim();
}

function normalizeAttemptCategory(value) {
  const safe = String(value || "").trim().toLowerCase();
  return ATTEMPT_CATEGORIES.includes(safe) ? safe : "";
}

function normalizeSourceType(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function toReadableLabel(value) {
  const safe = String(value || "").trim();
  if (!safe) {
    return "Unknown";
  }

  return safe
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function createDailyTaskKey(taskType, taskRefId) {
  return `${taskType}::${taskRefId}`;
}

function appendQueryParams(path, entries = {}) {
  const search = new URLSearchParams();
  Object.entries(entries).forEach(([key, value]) => {
    const safeValue = String(value || "").trim();
    if (!safeValue) {
      return;
    }

    search.set(key, safeValue);
  });

  const serialized = search.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function buildDailyTaskRoute(taskType, taskRefId, options = {}) {
  const includeDailyMode = options?.includeDailyMode !== false;
  const query = includeDailyMode ? { mode: "daily" } : {};

  if (taskType === "reading") {
    return appendQueryParams(`/student/tests/reading/full/${encodeURIComponent(taskRefId)}`, query);
  }

  if (taskType === "listening") {
    return appendQueryParams(`/student/tests/listening/full/${encodeURIComponent(taskRefId)}`, query);
  }

  if (taskType === "writing_task1") {
    return appendQueryParams(`/student/tests/writingTask1/${encodeURIComponent(taskRefId)}`, query);
  }

  if (taskType === "writing_task2") {
    return appendQueryParams(`/student/tests/writingTask2/${encodeURIComponent(taskRefId)}`, query);
  }

  return "/student/dailytasks";
}

function buildAdditionalTaskRoute(item = {}, rawAttempt = {}) {
  const taskType = normalizeDailyTaskType(item?.taskType);
  const taskRefId = normalizeDailyTaskRefId(item?.taskRefId);
  const sourceType = normalizeSourceType(item?.sourceType || rawAttempt?.sourceType);
  const payload = rawAttempt?.payload && typeof rawAttempt.payload === "object" ? rawAttempt.payload : {};
  const submission = payload?.submission && typeof payload.submission === "object" ? payload.submission : {};
  const routeFromPayload = String(payload?.navigation?.to || payload?.route || "").trim();
  if (routeFromPayload) {
    return routeFromPayload;
  }

  if (taskType === "reading") {
    if (sourceType === "reading_passage") {
      return `/student/tests/reading/by-passage/${encodeURIComponent(taskRefId)}`;
    }

    if (sourceType === "reading_question_family") {
      const practiceKey = String(submission?.practiceKey || payload?.practiceKey || "").trim();
      const passageId = String(submission?.passageId || payload?.passageId || taskRefId).trim();
      if (practiceKey && passageId) {
        return `/student/tests/reading/${encodeURIComponent(practiceKey)}/${encodeURIComponent(passageId)}`;
      }
    }

    return `/student/tests/reading/full/${encodeURIComponent(taskRefId)}`;
  }

  if (taskType === "listening") {
    if (sourceType === "listening_part") {
      const testId = String(payload?.testId || submission?.testId || taskRefId).trim();
      const partNumber = Number.parseInt(String(payload?.partNumber || submission?.partNumber || ""), 10);
      if (testId && Number.isFinite(partNumber) && partNumber > 0) {
        return `/student/tests/listening/by-part/${encodeURIComponent(testId)}/${partNumber}`;
      }
    }

    if (sourceType === "listening_question_family") {
      const practiceKey = String(payload?.practiceKey || submission?.practiceKey || "").trim();
      const blockId = String(payload?.blockId || submission?.blockId || taskRefId).trim();
      if (practiceKey && blockId) {
        return `/student/tests/listening/${encodeURIComponent(practiceKey)}/${encodeURIComponent(blockId)}`;
      }
    }

    if (sourceType === "listening_block") {
      const blockId = String(payload?.blockId || submission?.blockId || taskRefId).trim();
      return `/student/tests/listening/block/${encodeURIComponent(blockId)}`;
    }

    return `/student/tests/listening/full/${encodeURIComponent(taskRefId)}`;
  }

  if (taskType === "writing_task1") {
    return `/student/tests/writingTask1/${encodeURIComponent(taskRefId)}`;
  }

  if (taskType === "writing_task2") {
    return `/student/tests/writingTask2/${encodeURIComponent(taskRefId)}`;
  }

  return "/student/dashboard";
}

function buildDailyTaskLabel(taskType, taskRefId, sourceDocByType = {}) {
  const docById = sourceDocByType[taskType] || new Map();
  const source = docById.get(taskRefId) || null;

  if (taskType === "reading") {
    const title = String(source?.title || "").trim() || taskRefId;
    return `Reading: ${title}`;
  }

  if (taskType === "listening") {
    const title = String(source?.title || "").trim() || taskRefId;
    return `Listening: ${title}`;
  }

  if (taskType === "writing_task1") {
    const topic = String(source?.questionTopic || source?.title || "").trim() || taskRefId;
    return `Writing Task 1: ${topic}`;
  }

  if (taskType === "writing_task2") {
    const topic = String(source?.questionTopic || "").trim() || taskRefId;
    return `Writing Task 2: ${topic}`;
  }

  return taskRefId;
}

function normalizeUnitStatusForClient(status) {
  const safeStatus = String(status || "").trim().toLowerCase();
  if (safeStatus === "available") {
    return "available";
  }

  if (safeStatus === "completed") {
    return "completed";
  }

  return "locked";
}

function formatDurationLabel(totalSeconds) {
  const safeSeconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatCalendarDate(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.valueOf())) {
    return "";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildAttemptDetailLine(attempt = {}) {
  const score = attempt?.score || {};
  const band = Number(score?.band);
  const percentage = Number(score?.percentage);
  const correctCount = Number(score?.correctCount);
  const totalQuestions = Number(score?.totalQuestions);

  if (Number.isFinite(correctCount) && Number.isFinite(totalQuestions) && totalQuestions > 0) {
    if (Number.isFinite(band)) {
      return `${correctCount}/${totalQuestions} - band ${band.toFixed(1)}`;
    }
    return `${correctCount}/${totalQuestions}`;
  }

  if (Number.isFinite(band)) {
    return `Band ${band.toFixed(1)}`;
  }

  if (Number.isFinite(percentage)) {
    return `${Math.round(percentage)}%`;
  }

  return "Completed";
}

function toSafeIsoDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) {
    return null;
  }

  return date.toISOString();
}

function summarizeStudentTaskAttemptForClient(attempt = {}) {
  const score = attempt?.score && typeof attempt.score === "object" ? attempt.score : {};
  const submittedAt = toSafeIsoDate(attempt?.submittedAt || attempt?.createdAt);
  const attemptCategory = normalizeAttemptCategory(attempt?.attemptCategory) || "additional";

  return {
    id: String(attempt?._id || ""),
    attemptCategory,
    sourceType: normalizeSourceType(attempt?.sourceType),
    status: String(attempt?.status || "").trim() || "completed",
    unitId: String(attempt?.unitId || ""),
    unitTitle: String(attempt?.unitTitle || "").trim(),
    unitOrder: Number.isFinite(Number(attempt?.unitOrder)) ? Number(attempt.unitOrder) : 0,
    unitTaskOrder: Number.isFinite(Number(attempt?.unitTaskOrder)) ? Number(attempt.unitTaskOrder) : null,
    unitTaskRef: String(attempt?.unitTaskRef || "").trim(),
    taskType: normalizeDailyTaskType(attempt?.taskType),
    taskRefId: normalizeDailyTaskRefId(attempt?.taskRefId),
    taskLabel: String(attempt?.taskLabel || "").trim(),
    attemptNumber: Number.isFinite(Number(attempt?.attemptNumber)) ? Number(attempt.attemptNumber) : 0,
    submitReason: String(attempt?.submitReason || "").trim() || "manual",
    forceReason: String(attempt?.forceReason || "").trim(),
    isAutoSubmitted: Boolean(attempt?.isAutoSubmitted),
    submittedAt,
    totalTimeSpentSeconds: Math.max(0, Math.round(Number(attempt?.totalTimeSpentSeconds) || 0)),
    totalTimeSpentLabel: formatDurationLabel(attempt?.totalTimeSpentSeconds),
    score: {
      band: Number.isFinite(Number(score?.band)) ? Number(score.band) : null,
      percentage: Number.isFinite(Number(score?.percentage)) ? Number(score.percentage) : null,
      correctCount: Number.isFinite(Number(score?.correctCount)) ? Number(score.correctCount) : null,
      incorrectCount: Number.isFinite(Number(score?.incorrectCount)) ? Number(score.incorrectCount) : null,
      totalQuestions: Number.isFinite(Number(score?.totalQuestions)) ? Number(score.totalQuestions) : null,
    },
  };
}

function buildRecentCompletedTitle(item = {}) {
  const safeUnitTitle = String(item?.unitTitle || "").trim();
  const safeTaskLabel = String(item?.taskLabel || "").trim();

  if (safeUnitTitle && safeTaskLabel) {
    return `${safeUnitTitle}: ${safeTaskLabel}`;
  }

  if (safeTaskLabel) {
    return safeTaskLabel;
  }

  return `${toReadableLabel(item?.taskType)}: ${item?.taskRefId || "task"}`;
}

function extractWritingAnalysisIdFromAttempt(attempt = {}, taskType = "") {
  const sourceRefs = attempt?.sourceRefs && typeof attempt.sourceRefs === "object"
    ? attempt.sourceRefs
    : {};
  const payload = attempt?.payload && typeof attempt.payload === "object"
    ? attempt.payload
    : {};

  if (taskType === "writing_task1") {
    const fromSourceRefs = normalizeDailyTaskRefId(sourceRefs?.writingTask1AnalysisId);
    if (fromSourceRefs) {
      return fromSourceRefs;
    }

    const fromPayload = normalizeDailyTaskRefId(payload?.analysis?.id || payload?.analysisId);
    return fromPayload;
  }

  if (taskType === "writing_task2") {
    const fromSourceRefs = normalizeDailyTaskRefId(sourceRefs?.writingTask2AnalysisId);
    if (fromSourceRefs) {
      return fromSourceRefs;
    }

    const fromPayload = normalizeDailyTaskRefId(
      payload?.analysis?.id || payload?.submission?.analysisId || payload?.analysisId,
    );
    return fromPayload;
  }

  return "";
}

function buildRecentCompletedRoute(item = {}, rawAttempt = {}) {
  const taskType = normalizeDailyTaskType(item?.taskType);
  if (!taskType) {
    return "/student/results";
  }

  return buildResultAttemptRoute(item, rawAttempt, item?.attemptNumber);
}

function normalizeResultsCategory(value) {
  const safe = String(value || "").trim().toLowerCase();
  return RESULTS_CATEGORY_KEYS.includes(safe) ? safe : "all";
}

function getResultsCategoryLabel(category) {
  const safeCategory = normalizeResultsCategory(category);
  return RESULTS_CATEGORY_LABELS[safeCategory] || RESULTS_CATEGORY_LABELS.all;
}

function parseListeningPartTaskRefId(taskRefId) {
  const safeTaskRefId = normalizeDailyTaskRefId(taskRefId);
  const match = safeTaskRefId.match(/^(.*)::part:(\d+)$/i);
  if (!match) {
    return {
      testId: safeTaskRefId,
      partNumber: null,
    };
  }

  const partNumber = Number.parseInt(String(match[2] || ""), 10);
  return {
    testId: String(match[1] || "").trim(),
    partNumber: Number.isFinite(partNumber) && partNumber > 0 ? partNumber : null,
  };
}

function resolveAttemptResultCategory(taskType, sourceType, taskRefId = "") {
  const safeTaskType = normalizeDailyTaskType(taskType);
  const safeSourceType = normalizeSourceType(sourceType);
  const safeTaskRefId = normalizeDailyTaskRefId(taskRefId);

  if (safeTaskType === "writing_task1") {
    return "writing_task1";
  }

  if (safeTaskType === "writing_task2") {
    return "writing_task2";
  }

  if (safeTaskType === "reading") {
    if (safeSourceType === "reading_passage" || safeSourceType === "reading_question_family") {
      return "reading_question";
    }
    return "reading_full";
  }

  if (safeTaskType === "listening") {
    if (
      safeSourceType === "listening_block"
      || safeSourceType === "listening_question_family"
      || safeSourceType === "listening_part"
      || safeTaskRefId.includes("::part:")
    ) {
      return "listening_question";
    }
    return "listening_full";
  }

  return "all";
}

function resolveAttemptGroupSourceType(taskType, sourceType, taskRefId = "") {
  const category = resolveAttemptResultCategory(taskType, sourceType, taskRefId);
  if (category === "reading_full") {
    return "reading_full";
  }

  if (category === "listening_full") {
    return "listening_full";
  }

  if (category === "writing_task1") {
    return "writing_task1";
  }

  if (category === "writing_task2") {
    return "writing_task2";
  }

  const safeSourceType = normalizeSourceType(sourceType);
  if (safeSourceType) {
    return safeSourceType;
  }

  if (category === "reading_question") {
    return "reading_question_task";
  }

  if (category === "listening_question") {
    return "listening_question_task";
  }

  return "task";
}

function resolveResultTaskMode(category) {
  if (category === "reading_full" || category === "listening_full") {
    return "full";
  }

  if (category === "reading_question" || category === "listening_question") {
    return "question";
  }

  return "writing";
}

function buildResultScoreLabel(score = {}) {
  return buildAttemptDetailLine({ score });
}

function sanitizeIncorrectItemsForResults(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 60)
    .map((item) => ({
      section: normalizeSourceType(item?.section),
      questionFamily: normalizeSourceType(item?.questionFamily),
      blockType: normalizeSourceType(item?.blockType),
      blockId: normalizeDailyTaskRefId(item?.blockId),
      blockTitle: normalizeText(item?.blockTitle, "", 180),
      questionNumber: Number.isFinite(Number(item?.questionNumber)) ? Number(item.questionNumber) : null,
      studentAnswer: normalizeText(item?.studentAnswer, "", 240),
      acceptedAnswers: Array.isArray(item?.acceptedAnswers)
        ? item.acceptedAnswers.map((entry) => normalizeText(entry, "", 120)).filter(Boolean).slice(0, 8)
        : [],
    }));
}

function sanitizeEvaluationForResults(value = {}) {
  const safe = value && typeof value === "object" ? value : {};
  const totalQuestions = Number.isFinite(Number(safe?.totalQuestions)) ? Number(safe.totalQuestions) : 0;
  const correctCount = Number.isFinite(Number(safe?.correctCount)) ? Number(safe.correctCount) : 0;
  const incorrectCount = Number.isFinite(Number(safe?.incorrectCount))
    ? Number(safe.incorrectCount)
    : Math.max(0, totalQuestions - correctCount);
  const percentage = Number.isFinite(Number(safe?.percentage))
    ? Number(safe.percentage)
    : (totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0);

  return {
    totalQuestions: Math.max(0, Math.round(totalQuestions)),
    correctCount: Math.max(0, Math.round(correctCount)),
    incorrectCount: Math.max(0, Math.round(incorrectCount)),
    percentage: Math.max(0, Math.min(100, Math.round(percentage))),
    incorrectItems: sanitizeIncorrectItemsForResults(safe?.incorrectItems),
  };
}

function sanitizePassageTimingForResults(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => ({
      passageNumber: Number.isFinite(Number(item?.passageNumber))
        ? Number(item.passageNumber)
        : index + 1,
      timeSpentSeconds: Math.max(0, Math.round(Number(item?.timeSpentSeconds) || 0)),
    }))
    .filter((item) => item.passageNumber > 0);
}

function sanitizeBlockResultsForResults(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 30)
    .map((item) => ({
      blockId: normalizeDailyTaskRefId(item?.blockId),
      section: normalizeSourceType(item?.section),
      questionFamily: normalizeSourceType(item?.questionFamily),
      blockType: normalizeSourceType(item?.blockType),
      blockTitle: normalizeText(item?.blockTitle, "", 180),
      correctCount: Math.max(0, Math.round(Number(item?.correctCount) || 0)),
      totalQuestions: Math.max(0, Math.round(Number(item?.totalQuestions) || 0)),
      percentage: Math.max(0, Math.round(Number(item?.percentage) || 0)),
      incorrectItems: sanitizeIncorrectItemsForResults(item?.incorrectItems),
    }))
    .filter((item) => item.blockId);
}

function extractAttemptPayloadSummaryForResults(attempt = {}) {
  const payload = attempt?.payload && typeof attempt.payload === "object" ? attempt.payload : {};
  const submission = payload?.submission && typeof payload.submission === "object" ? payload.submission : {};
  const evaluation = sanitizeEvaluationForResults(payload?.evaluation || submission?.evaluation || {});
  const passageTiming = sanitizePassageTimingForResults(payload?.passageTiming || submission?.passageTiming || []);
  const blockResults = sanitizeBlockResultsForResults(payload?.blockResults || submission?.blockResults || []);

  return {
    route: normalizeText(payload?.route || payload?.navigation?.to, "", 480),
    practiceKey: normalizeSourceType(payload?.practiceKey || submission?.practiceKey),
    partNumber: Number.isFinite(Number(submission?.partNumber))
      ? Number(submission.partNumber)
      : null,
    evaluation,
    passageTiming,
    blockResults,
  };
}

function buildResultAttemptRoute(item = {}, rawAttempt = {}, overrideAttemptNumber = null) {
  const taskType = normalizeDailyTaskType(item?.taskType || rawAttempt?.taskType);
  const taskRefId = normalizeDailyTaskRefId(item?.taskRefId || rawAttempt?.taskRefId);
  const sourceType = resolveAttemptGroupSourceType(taskType, item?.sourceType || rawAttempt?.sourceType, taskRefId);
  const category = resolveAttemptResultCategory(taskType, item?.sourceType || rawAttempt?.sourceType, taskRefId);
  const taskMode = resolveResultTaskMode(category);
  const attemptNumber = Number.isFinite(Number(overrideAttemptNumber))
    ? Number(overrideAttemptNumber)
    : Number.isFinite(Number(item?.attemptNumber))
      ? Number(item.attemptNumber)
      : 1;

  if (taskType === "writing_task1" || taskType === "writing_task2") {
    const safeTaskRefId = encodeURIComponent(taskRefId || "");
    const analysisId = extractWritingAnalysisIdFromAttempt(rawAttempt, taskType);
    const analysisQuery = analysisId ? `&analysisId=${encodeURIComponent(analysisId)}` : "";
    if (taskType === "writing_task1") {
      return `/student/tests/writingTask1/result?set=${safeTaskRefId}${analysisQuery}`;
    }

    return `/student/tests/writingTask2/result?set=${safeTaskRefId}${analysisQuery}`;
  }

  const domain = taskType === "reading" ? "reading" : "listening";
  const attemptSlug = `attempt-${Math.max(1, attemptNumber)}`;
  return `/student/results/${domain}/${taskMode}/${encodeURIComponent(taskRefId)}/${attemptSlug}?sourceType=${encodeURIComponent(sourceType)}`;
}

async function getListeningBlocksCollectionNameForResults() {
  const db = mongoose.connection.db;
  const hasDefaultCollection = Boolean(
    await db.listCollections({ name: LISTENING_BLOCKS_COLLECTION }, { nameOnly: true }).next(),
  );
  if (hasDefaultCollection) {
    const defaultCount = await db.collection(LISTENING_BLOCKS_COLLECTION).estimatedDocumentCount();
    if (defaultCount > 0) {
      return LISTENING_BLOCKS_COLLECTION;
    }
  }

  const hasLegacyCollection = Boolean(
    await db.listCollections({ name: LEGACY_LISTENING_BLOCKS_COLLECTION }, { nameOnly: true }).next(),
  );
  if (hasLegacyCollection) {
    const legacyCount = await db.collection(LEGACY_LISTENING_BLOCKS_COLLECTION).estimatedDocumentCount();
    if (legacyCount > 0) {
      return LEGACY_LISTENING_BLOCKS_COLLECTION;
    }
  }

  return LISTENING_BLOCKS_COLLECTION;
}

async function buildTaskSourceLookupsForAttempts(attempts = []) {
  const writingTask1Ids = new Set();
  const writingTask2Ids = new Set();
  const readingTestIds = new Set();
  const readingPassageIds = new Set();
  const listeningTestIds = new Set();
  const listeningBlockIds = new Set();

  (Array.isArray(attempts) ? attempts : []).forEach((attempt) => {
    const taskType = normalizeDailyTaskType(attempt?.taskType);
    const taskRefId = normalizeDailyTaskRefId(attempt?.taskRefId);
    const sourceType = normalizeSourceType(attempt?.sourceType);
    const category = resolveAttemptResultCategory(taskType, sourceType, taskRefId);
    if (!taskType || !taskRefId) {
      return;
    }

    if (taskType === "writing_task1") {
      writingTask1Ids.add(taskRefId);
      return;
    }

    if (taskType === "writing_task2") {
      writingTask2Ids.add(taskRefId);
      return;
    }

    if (category === "reading_full") {
      readingTestIds.add(taskRefId);
      return;
    }

    if (category === "reading_question") {
      readingPassageIds.add(taskRefId);
      return;
    }

    if (category === "listening_full") {
      listeningTestIds.add(taskRefId);
      return;
    }

    if (category === "listening_question") {
      if (sourceType === "listening_part" || taskRefId.includes("::part:")) {
        const partMeta = parseListeningPartTaskRefId(taskRefId);
        if (partMeta.testId) {
          listeningTestIds.add(partMeta.testId);
        }
      } else {
        listeningBlockIds.add(taskRefId);
      }
    }
  });

  const db = mongoose.connection.db;
  const [
    writingTask1Docs,
    writingTask2Docs,
    readingTestDocs,
    readingPassageDocs,
    listeningTestDocs,
    listeningBlockDocs,
  ] = await Promise.all([
    writingTask1Ids.size > 0
      ? WritingTask1Item.find(
        { _id: { $in: Array.from(writingTask1Ids) } },
        { _id: 1, questionTopic: 1, title: 1, visualType: 1 },
      ).lean()
      : Promise.resolve([]),
    writingTask2Ids.size > 0
      ? WritingTask2Item.find(
        { _id: { $in: Array.from(writingTask2Ids) } },
        { _id: 1, questionTopic: 1, title: 1, essayType: 1 },
      ).lean()
      : Promise.resolve([]),
    readingTestIds.size > 0
      ? db.collection(READING_TESTS_COLLECTION).find(
        { _id: { $in: Array.from(readingTestIds) } },
        { projection: { _id: 1, title: 1, module: 1, book: 1, test: 1 } },
      ).toArray()
      : Promise.resolve([]),
    readingPassageIds.size > 0
      ? db.collection(READING_PASSAGES_COLLECTION).find(
        { _id: { $in: Array.from(readingPassageIds) } },
        { projection: { _id: 1, title: 1, passageTitle: 1, heading: 1 } },
      ).toArray()
      : Promise.resolve([]),
    listeningTestIds.size > 0
      ? ListeningTest.find(
        { _id: { $in: Array.from(listeningTestIds) } },
        { _id: 1, title: 1, module: 1, section: 1 },
      ).lean()
      : Promise.resolve([]),
    (async () => {
      if (listeningBlockIds.size <= 0) {
        return [];
      }
      const listeningBlocksCollectionName = await getListeningBlocksCollectionNameForResults();
      return db.collection(listeningBlocksCollectionName).find(
        { _id: { $in: Array.from(listeningBlockIds) } },
        { projection: { _id: 1, blockType: 1, questionFamily: 1, display: 1, instruction: 1 } },
      ).toArray();
    })(),
  ]);

  const byId = (docs = []) =>
    new Map((Array.isArray(docs) ? docs : []).map((doc) => [normalizeDailyTaskRefId(doc?._id), doc]));

  return {
    writingTask1ById: byId(writingTask1Docs),
    writingTask2ById: byId(writingTask2Docs),
    readingTestsById: byId(readingTestDocs),
    readingPassagesById: byId(readingPassageDocs),
    listeningTestsById: byId(listeningTestDocs),
    listeningBlocksById: byId(listeningBlockDocs),
  };
}

function buildAttemptDisplayBaseTitle(summary = {}, rawAttempt = {}, lookups = {}) {
  const taskType = normalizeDailyTaskType(summary?.taskType || rawAttempt?.taskType);
  const taskRefId = normalizeDailyTaskRefId(summary?.taskRefId || rawAttempt?.taskRefId);
  const sourceType = normalizeSourceType(summary?.sourceType || rawAttempt?.sourceType);
  const category = resolveAttemptResultCategory(taskType, sourceType, taskRefId);
  const taskLabel = normalizeText(summary?.taskLabel || rawAttempt?.taskLabel, "", 320);
  const payloadSummary = extractAttemptPayloadSummaryForResults(rawAttempt);

  if (category === "writing_task1") {
    const doc = lookups?.writingTask1ById?.get(taskRefId) || null;
    const topic = normalizeText(doc?.questionTopic || doc?.title || taskLabel || taskRefId, "", 320);
    return `Writing Task 1 - ${topic}`;
  }

  if (category === "writing_task2") {
    const doc = lookups?.writingTask2ById?.get(taskRefId) || null;
    const topic = normalizeText(doc?.questionTopic || doc?.title || taskLabel || taskRefId, "", 320);
    return `Writing Task 2 - ${topic}`;
  }

  if (category === "reading_full") {
    const testDoc = lookups?.readingTestsById?.get(taskRefId) || null;
    const testTitle = normalizeText(testDoc?.title || taskLabel || taskRefId, "", 280);
    return `Reading Full Test - ${testTitle}`;
  }

  if (category === "listening_full") {
    const testDoc = lookups?.listeningTestsById?.get(taskRefId) || null;
    const testTitle = normalizeText(testDoc?.title || taskLabel || taskRefId, "", 280);
    return `Listening Full Test - ${testTitle}`;
  }

  if (category === "reading_question") {
    const passageDoc = lookups?.readingPassagesById?.get(taskRefId) || null;
    const passageTitle = normalizeText(
      passageDoc?.title || passageDoc?.passageTitle || passageDoc?.heading || taskLabel || taskRefId,
      "",
      220,
    );
    if (sourceType === "reading_question_family") {
      const familyLabel = normalizeText(payloadSummary?.practiceKey, "", 120);
      const safeFamilyLabel = familyLabel ? toReadableLabel(familyLabel) : "Question Family";
      return `Reading Question Task - ${safeFamilyLabel} - ${passageTitle}`;
    }
    return `Reading Question Task - ${passageTitle}`;
  }

  if (category === "listening_question") {
    if (sourceType === "listening_part" || taskRefId.includes("::part:")) {
      const partMeta = parseListeningPartTaskRefId(taskRefId);
      const testDoc = lookups?.listeningTestsById?.get(partMeta.testId) || null;
      const testTitle = normalizeText(testDoc?.title || taskLabel || partMeta.testId || taskRefId, "", 220);
      const partLabel = Number.isFinite(partMeta.partNumber) ? `Part ${partMeta.partNumber}` : "Part";
      return `Listening Question Task - ${partLabel} - ${testTitle}`;
    }

    const blockDoc = lookups?.listeningBlocksById?.get(taskRefId) || null;
    const blockTitle = normalizeText(
      blockDoc?.display?.title || taskLabel || taskRefId,
      "",
      220,
    );
    const family = normalizeText(blockDoc?.questionFamily || payloadSummary?.practiceKey, "", 120);
    const familyLabel = family ? toReadableLabel(family) : "Question Type";
    return `Listening Question Task - ${familyLabel} - ${blockTitle}`;
  }

  return taskLabel || `${toReadableLabel(taskType)} - ${taskRefId}`;
}

function buildResultAttemptItem(summary = {}, rawAttempt = {}, lookups = {}) {
  const baseTitle = buildAttemptDisplayBaseTitle(summary, rawAttempt, lookups);
  const attemptNumber = Number.isFinite(Number(summary?.attemptNumber))
    ? Math.max(1, Number(summary.attemptNumber))
    : 1;
  const payloadSummary = extractAttemptPayloadSummaryForResults(rawAttempt);

  return {
    ...summary,
    title: `${baseTitle} - Attempt ${attemptNumber}`,
    baseTitle,
    scoreLabel: buildResultScoreLabel(summary?.score || {}),
    category: resolveAttemptResultCategory(summary?.taskType, summary?.sourceType, summary?.taskRefId),
    groupSourceType: resolveAttemptGroupSourceType(summary?.taskType, summary?.sourceType, summary?.taskRefId),
    payloadSummary,
    to: buildResultAttemptRoute(summary, rawAttempt, attemptNumber),
    analysisId: extractWritingAnalysisIdFromAttempt(rawAttempt, summary?.taskType),
  };
}

function notFound(res, entity, studentId) {
  return res.status(404).json({
    message: `${entity} not found for student '${studentId}'`,
  });
}

function buildDefaultProfileFromUser(user) {
  return {
    studentId: normalizeStudentId(user.email),
    fullName: user.fullName,
    email: normalizeStudentId(user.email),
    bio: "",
    memberSince: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    subscription: {
      planName: "Student subscription",
      monthlyPrice: 19,
      teacherMonthlyPrice: 39,
      status: "Active subscription",
      benefits: [
        "Skill-based Listening, Reading, and Writing practice",
        "Structured feedback with weak-pattern visibility",
        "Progress tracking, timing behavior, and retry history",
      ],
    },
    paymentMethod: {
      cardMasked: "**** **** **** 4821",
      label: "Primary payment method",
    },
    security: {
      passwordMasked: "************",
      lastUpdatedLabel: formatSecurityUpdatedLabel(),
    },
    billingHistory: [],
  };
}

function cloneSeed(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseHeatmapYear(yearInput, fallbackYear = new Date().getFullYear()) {
  if (yearInput === undefined || yearInput === null || yearInput === "") {
    return fallbackYear;
  }

  const year = Number.parseInt(String(yearInput), 10);
  if (!Number.isFinite(year) || year < 1970 || year > 9999) {
    return null;
  }

  return year;
}

async function getOrCreateStudentAnalyticsDoc(studentId) {
  let analytics = await StudentAnalytics.findOne({ studentId });
  if (analytics) {
    return analytics;
  }

  const seededAnalytics = cloneSeed(studentAnalyticsSeed);
  seededAnalytics.heatmap = buildYearHeatmapFromEntries([]);
  seededAnalytics.studyActivity = { entries: [] };

  analytics = await StudentAnalytics.create({
    studentId,
    ...seededAnalytics,
  });

  return analytics;
}

async function getStudentUserByStudentId(studentId, options = {}) {
  const projection = options.projection || null;
  const query = User.findOne({ email: studentId, role: "student" });

  if (projection) {
    query.select(projection);
  }

  return query.exec();
}

async function syncLegacyStudyActivityFromUser(studentId, heatmapEntries) {
  const analytics = await getOrCreateStudentAnalyticsDoc(studentId);
  const normalizedEntries = normalizeStudyHeatmapEntries(heatmapEntries);

  analytics.studyActivity = {
    entries: normalizedEntries.map((entry) => ({
      dateKey: entry.date,
      visited: true,
      taskActiveMinutes: Number(entry.minutesSpent || 0),
    })),
  };
  analytics.heatmap = buildYearHeatmapFromEntries(normalizedEntries);
  await analytics.save();

  return analytics;
}

async function getHeatmapEntriesForStudent(studentId) {
  const user = await getStudentUserByStudentId(studentId, "+studyHeatmap");
  if (!user || !user.isActive) {
    return null;
  }

  return normalizeStudyHeatmapEntries(user.studyHeatmap || []);
}

async function ensureStudentProfileForUser(userDoc) {
  const safeEmail = normalizeStudentId(userDoc?.email);
  const safeFullName = normalizeProfileText(userDoc?.fullName, 80) || "Student";
  let profile = await StudentProfile.findOne({ studentId: safeEmail });

  if (!profile) {
    profile = await StudentProfile.findOne({ email: safeEmail });
  }

  if (!profile) {
    const created = await StudentProfile.create(buildDefaultProfileFromUser(userDoc));
    return created.toObject();
  }

  let shouldSave = false;
  if (normalizeStudentId(profile.studentId) !== safeEmail) {
    profile.studentId = safeEmail;
    shouldSave = true;
  }

  if (normalizeStudentId(profile.email) !== safeEmail) {
    profile.email = safeEmail;
    shouldSave = true;
  }

  if (normalizeProfileText(profile.fullName, 80) !== safeFullName) {
    profile.fullName = safeFullName;
    shouldSave = true;
  }

  if (typeof profile.bio !== "string") {
    profile.bio = "";
    shouldSave = true;
  }

  if (shouldSave) {
    await profile.save();
  }

  return profile.toObject();
}

function buildMyStudentProfileResponse(userDoc, profileDoc) {
  const safeEmail = normalizeStudentId(userDoc?.email || profileDoc?.email);
  const createdAt = userDoc?.createdAt ? new Date(userDoc.createdAt) : null;
  const memberSince = profileDoc?.memberSince || (
    createdAt && !Number.isNaN(createdAt.valueOf())
      ? createdAt.toLocaleString("en-US", { month: "long", year: "numeric" })
      : new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  );

  return {
    studentId: safeEmail,
    fullName: normalizeProfileText(userDoc?.fullName || profileDoc?.fullName, 80) || "Student",
    email: safeEmail,
    bio: normalizeProfileText(profileDoc?.bio || "", PROFILE_BIO_MAX_LENGTH),
    memberSince,
    createdAt: userDoc?.createdAt || null,
    subscription: profileDoc?.subscription || {
      planName: "Student subscription",
      monthlyPrice: 19,
      status: "Active subscription",
      benefits: [
        "Skill-based Listening, Reading, and Writing practice",
        "Structured feedback with weak-pattern visibility",
        "Progress tracking, timing behavior, and retry history",
      ],
    },
    security: profileDoc?.security || {
      passwordMasked: "************",
      lastUpdatedLabel: formatSecurityUpdatedLabel(),
    },
  };
}

async function syncStudentEmailReferences(studentUserId, previousEmail, nextEmail) {
  if (!studentUserId || !previousEmail || !nextEmail || previousEmail === nextEmail) {
    return;
  }

  await Promise.all([
    StudentDailyTasks.updateOne(
      { studentId: previousEmail },
      { $set: { studentId: nextEmail } },
    ),
    StudentAnalytics.updateOne(
      { studentId: previousEmail },
      { $set: { studentId: nextEmail } },
    ),
    StudentTaskAttempt.updateMany(
      { studentUserId },
      { $set: { studentEmail: nextEmail } },
    ),
    StudentUnitProgress.updateMany(
      { studentUserId },
      { $set: { studentEmail: nextEmail } },
    ),
    mongoose.connection.db.collection("writing_task1_analyses").updateMany(
      { studentUserId },
      { $set: { studentEmail: nextEmail } },
    ),
    mongoose.connection.db.collection("writing_task2_analyses").updateMany(
      { studentUserId },
      { $set: { studentEmail: nextEmail } },
    ),
  ]);
}

async function getMyStudentProfile(req, res) {
  const user = await User.findById(req.auth.userId).lean();
  if (!user || user.role !== "student") {
    return res.status(403).json({
      message: "Only students can access this profile endpoint.",
    });
  }

  const profile = await ensureStudentProfileForUser(user);

  return res.json({
    profile: buildMyStudentProfileResponse(user, profile),
  });
}

async function getStudentProfile(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const profile = await StudentProfile.findOne({ studentId }).lean();

  if (!profile) {
    return notFound(res, "Profile", studentId);
  }

  return res.json({ profile });
}

async function updateStudentProfile(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const updates = req.body || {};

  const profile = await StudentProfile.findOneAndUpdate(
    { studentId },
    { $set: updates },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!profile) {
    return notFound(res, "Profile", studentId);
  }

  return res.json({
    message: "Profile updated",
    profile,
  });
}

async function updateMyAccountProfile(req, res) {
  const user = await User.findById(req.auth.userId);
  if (!user || user.role !== "student" || !user.isActive) {
    return res.status(403).json({
      message: "Only students can update this profile endpoint.",
    });
  }

  const body = req.body || {};
  const hasFullName = Object.prototype.hasOwnProperty.call(body, "fullName");
  const hasEmail = Object.prototype.hasOwnProperty.call(body, "email");
  const hasBio = Object.prototype.hasOwnProperty.call(body, "bio");

  if (!hasFullName && !hasEmail && !hasBio) {
    return res.status(400).json({
      message: "Provide at least one field to update: fullName, email, bio.",
    });
  }

  const nextFullName = hasFullName
    ? normalizeProfileText(body.fullName, 80)
    : normalizeProfileText(user.fullName, 80);
  if (hasFullName && nextFullName.length < 2) {
    return res.status(400).json({
      message: "Full name must be at least 2 characters.",
    });
  }

  const previousEmail = normalizeStudentId(user.email);
  const nextEmail = hasEmail ? normalizeStudentId(body.email) : previousEmail;
  if (hasEmail && !EMAIL_REGEX.test(nextEmail)) {
    return res.status(400).json({
      message: "Please provide a valid email address.",
    });
  }

  if (hasEmail && nextEmail !== previousEmail) {
    const existingUser = await User.findOne({
      email: nextEmail,
      _id: { $ne: user._id },
    })
      .select("_id")
      .lean();

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered.",
      });
    }
  }

  const nextBio = hasBio
    ? normalizeProfileText(body.bio, PROFILE_BIO_MAX_LENGTH)
    : undefined;

  const profile = await ensureStudentProfileForUser(user.toObject());
  const profileDoc = await StudentProfile.findById(profile._id);
  if (!profileDoc) {
    return res.status(500).json({
      message: "Profile could not be updated.",
    });
  }

  let userChanged = false;
  if (hasFullName && nextFullName !== normalizeProfileText(user.fullName, 80)) {
    user.fullName = nextFullName;
    userChanged = true;
  }
  if (hasEmail && nextEmail !== previousEmail) {
    user.email = nextEmail;
    userChanged = true;
  }
  if (userChanged) {
    await user.save();
  }

  let profileChanged = false;
  if (hasFullName && normalizeProfileText(profileDoc.fullName, 80) !== nextFullName) {
    profileDoc.fullName = nextFullName;
    profileChanged = true;
  }
  if (hasEmail && normalizeStudentId(profileDoc.email) !== nextEmail) {
    profileDoc.email = nextEmail;
    profileDoc.studentId = nextEmail;
    profileChanged = true;
  }
  if (hasBio && normalizeProfileText(profileDoc.bio, PROFILE_BIO_MAX_LENGTH) !== nextBio) {
    profileDoc.bio = nextBio;
    profileChanged = true;
  }
  if (profileChanged) {
    await profileDoc.save();
  }

  if (hasEmail && nextEmail !== previousEmail) {
    await syncStudentEmailReferences(String(user._id), previousEmail, nextEmail);
  }

  const refreshedUser = await User.findById(user._id).lean();
  const refreshedProfile = await ensureStudentProfileForUser(refreshedUser);

  return res.json({
    message: "Account details updated.",
    profile: buildMyStudentProfileResponse(refreshedUser, refreshedProfile),
  });
}

async function updateMyAccountPassword(req, res) {
  const currentPassword = String(req.body?.currentPassword || "");
  const newPassword = String(req.body?.newPassword || "");
  const confirmNewPassword = String(req.body?.confirmNewPassword || "");

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({
      message: "Current password, new password, and confirmation are required.",
    });
  }

  if (!PASSWORD_REGEX.test(newPassword)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters and include at least one letter and one number.",
    });
  }

  if (newPassword !== confirmNewPassword) {
    return res.status(400).json({
      message: "New password confirmation does not match.",
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({
      message: "New password must be different from current password.",
    });
  }

  const user = await User.findById(req.auth.userId).select("+password");
  if (!user || user.role !== "student" || !user.isActive) {
    return res.status(403).json({
      message: "Only students can update password here.",
    });
  }

  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({
      message: "Current password is incorrect.",
    });
  }

  user.password = newPassword;
  await user.save();

  const studentId = normalizeStudentId(user.email);
  await ensureStudentProfileForUser(user.toObject());
  await StudentProfile.updateOne(
    { studentId },
    {
      $set: {
        "security.passwordMasked": "************",
        "security.lastUpdatedLabel": formatSecurityUpdatedLabel(),
      },
    },
  );

  return res.json({
    message: "Password updated successfully.",
  });
}

async function resolveStudentUserForDailyTasks(req) {
  const requestedStudentId = normalizeStudentId(req.params.studentId);
  if (!requestedStudentId || requestedStudentId === "me") {
    const me = await User.findById(req.auth?.userId)
      .select("_id email role isActive createdAt")
      .lean();

    if (!me || me.role !== "student" || !me.isActive) {
      return null;
    }

    return {
      _id: String(me._id),
      email: normalizeStudentId(me.email),
      createdAt: me.createdAt || null,
    };
  }

  const targetUser = await User.findOne({
    email: requestedStudentId,
    role: "student",
    isActive: true,
  })
    .select("_id email createdAt")
    .lean();

  if (!targetUser) {
    return null;
  }

  return {
    _id: String(targetUser._id),
    email: normalizeStudentId(targetUser.email),
    createdAt: targetUser.createdAt || null,
  };
}

function normalizeUnitTasks(tasks = []) {
  return (Array.isArray(tasks) ? tasks : [])
    .map((task, index) => ({
      taskType: normalizeDailyTaskType(task?.taskType),
      taskRefId: normalizeDailyTaskRefId(task?.taskRefId),
      order: normalizePositiveOrder(task?.order, index + 1),
    }))
    .filter((task) => Boolean(task.taskType) && Boolean(task.taskRefId))
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
    .map((task, index) => ({
      ...task,
      order: index + 1,
    }));
}

async function buildDailyTaskSourceMaps(units = []) {
  const taskRefIdsByType = {
    reading: new Set(),
    listening: new Set(),
    writing_task1: new Set(),
    writing_task2: new Set(),
  };

  units.forEach((unit) => {
    const tasks = normalizeUnitTasks(unit?.tasks || []);
    tasks.forEach((task) => {
      taskRefIdsByType[task.taskType]?.add(task.taskRefId);
    });
  });

  const readingIds = Array.from(taskRefIdsByType.reading);
  const listeningIds = Array.from(taskRefIdsByType.listening);
  const writingTask1Ids = Array.from(taskRefIdsByType.writing_task1);
  const writingTask2Ids = Array.from(taskRefIdsByType.writing_task2);

  const db = mongoose.connection.db;
  const [readingDocs, listeningDocs, writingTask1Docs, writingTask2Docs] = await Promise.all([
    readingIds.length > 0
      ? db.collection(READING_TESTS_COLLECTION).find(
        { _id: { $in: readingIds } },
        { projection: { _id: 1, title: 1, module: 1 } },
      ).toArray()
      : [],
    listeningIds.length > 0
      ? ListeningTest.find(
        { _id: { $in: listeningIds } },
        { _id: 1, title: 1, module: 1, parts: 1 },
      ).lean()
      : [],
    writingTask1Ids.length > 0
      ? WritingTask1Item.find(
        { _id: { $in: writingTask1Ids } },
        { _id: 1, questionTopic: 1, title: 1 },
      ).lean()
      : [],
    writingTask2Ids.length > 0
      ? WritingTask2Item.find(
        { _id: { $in: writingTask2Ids } },
        { _id: 1, questionTopic: 1 },
      ).lean()
      : [],
  ]);

  return {
    readingIds,
    listeningIds,
    writingTask1Ids,
    writingTask2Ids,
    sourceDocByType: {
      reading: new Map(readingDocs.map((doc) => [String(doc?._id || ""), doc])),
      listening: new Map(listeningDocs.map((doc) => [String(doc?._id || ""), doc])),
      writing_task1: new Map(writingTask1Docs.map((doc) => [String(doc?._id || ""), doc])),
      writing_task2: new Map(writingTask2Docs.map((doc) => [String(doc?._id || ""), doc])),
    },
  };
}

async function buildStudentDailyTasksResponse(studentUser) {
  const studentUserId = String(studentUser?._id || "").trim();
  const studentId = normalizeStudentId(studentUser?.email);

  const publishedUnits = await getPublishedUnits();
  if (publishedUnits.length === 0) {
    return { studentId, units: [] };
  }

  await rebuildStudentUnitProgress(studentUserId, studentId, {
    calendarAnchorDate: studentUser?.createdAt || null,
  });
  const progressDocs = await getStudentUnitProgress(studentUserId);
  const progressByUnitId = new Map(
    progressDocs.map((doc) => [String(doc?.unitId || ""), doc]),
  );

  const sourceMaps = await buildDailyTaskSourceMaps(
    publishedUnits.map((unit) => ({
      _id: unit.unitId,
      title: unit.unitTitle,
      order: unit.unitOrder,
      tasks: unit.tasks,
    })),
  );
  const sourceDocByType = sourceMaps.sourceDocByType || {};

  const units = publishedUnits.map((unit, unitIndex) => {
    const unitId = unit.unitId;
    const progress = progressByUnitId.get(unitId) || null;
    const normalizedStatus = normalizeUnitStatusForClient(progress?.status);
    const completedTaskRefs = Array.isArray(progress?.completedTaskRefs)
      ? progress.completedTaskRefs
      : [];
    const completedTaskKeySet = new Set(
      completedTaskRefs.map((item) =>
        createDailyTaskKey(
          normalizeDailyTaskType(item?.taskType),
          normalizeDailyTaskRefId(item?.taskRefId),
        ),
      ),
    );

    const tasks = unit.tasks.map((task) => {
      const taskId = createDailyTaskKey(task.taskType, task.taskRefId);
      const taskCompleted = completedTaskKeySet.has(taskId);

      return {
        id: taskId,
        taskId,
        taskType: task.taskType,
        taskRefId: task.taskRefId,
        order: task.order,
        label: buildDailyTaskLabel(task.taskType, task.taskRefId, sourceDocByType),
        to: buildDailyTaskRoute(task.taskType, task.taskRefId),
        status: normalizedStatus === "locked" ? "locked" : taskCompleted ? "completed" : "pending",
      };
    });

    const completedTasksCount = tasks.filter((task) => task.status === "completed").length;
    const unitAttempts = Array.isArray(progress?.attempts) ? progress.attempts : [];
    const latestAttempt = unitAttempts.length > 0 ? unitAttempts[unitAttempts.length - 1] : null;
    const status = normalizedStatus === "available" ? "today" : normalizedStatus;
    const statusRaw = normalizedStatus;
    const isCalendarEligible = progress?.calendarEligible !== false;
    const calendarAvailableAtLabel = formatCalendarDate(progress?.calendarAvailableAt);
    const previousUnitTitle = unitIndex > 0 ? publishedUnits[unitIndex - 1].unitTitle : "";
    const lockHint = normalizedStatus !== "locked"
      ? ""
      : !isCalendarEligible
        ? calendarAvailableAtLabel
          ? `Scheduled for ${calendarAvailableAtLabel}`
          : "Not yet available by schedule."
        : previousUnitTitle
          ? `Complete ${previousUnitTitle} to unlock`
          : "Complete previous required units to unlock.";

    return {
      id: unitId,
      unitId,
      unit: unit.unitTitle,
      title: unit.unitTitle,
      order: unit.unitOrder,
      status,
      statusRaw,
      tasksCount: tasks.length,
      completedTasksCount,
      latestBand: Number.isFinite(Number(progress?.latestBand)) ? Number(progress.latestBand) : null,
      latestScorePercent: Number.isFinite(Number(progress?.latestScorePercent))
        ? Number(progress.latestScorePercent)
        : null,
      latestTimeSpentSeconds: Math.max(0, Math.round(Number(progress?.latestTimeSpentSeconds) || 0)),
      latestTimeSpentLabel: formatDurationLabel(progress?.latestTimeSpentSeconds),
      attemptsCount: Math.max(0, Number(progress?.attemptsCount) || 0),
      completedAt: progress?.completedAt || null,
      calendarDayIndex: Number(progress?.calendarDayIndex || unitIndex + 1),
      calendarEligible: isCalendarEligible,
      calendarAvailableAt: progress?.calendarAvailableAt || null,
      lockHint,
      attempts: unitAttempts.map((attempt) => ({
        id: `${unitId}:attempt:${attempt.attemptNumber}`,
        attemptNumber: Number(attempt?.attemptNumber || 0),
        label: `Attempt ${attempt?.attemptNumber || 0}`,
        date: attempt?.submittedAt || null,
        band: Number.isFinite(Number(attempt?.band)) ? Number(attempt.band) : null,
        scorePercent: Number.isFinite(Number(attempt?.scorePercent)) ? Number(attempt.scorePercent) : null,
        timeSpentSeconds: Math.max(0, Math.round(Number(attempt?.totalTimeSpentSeconds) || 0)),
        timeLabel: formatDurationLabel(attempt?.totalTimeSpentSeconds),
        breakdown: String(attempt?.breakdownLabel || "").trim(),
      })),
      latestAttempt: latestAttempt
        ? {
          attemptNumber: Number(latestAttempt?.attemptNumber || 0),
          date: latestAttempt?.submittedAt || null,
          band: Number.isFinite(Number(latestAttempt?.band)) ? Number(latestAttempt.band) : null,
          scorePercent: Number.isFinite(Number(latestAttempt?.scorePercent))
            ? Number(latestAttempt.scorePercent)
            : null,
          timeSpentSeconds: Math.max(0, Math.round(Number(latestAttempt?.totalTimeSpentSeconds) || 0)),
          timeLabel: formatDurationLabel(latestAttempt?.totalTimeSpentSeconds),
          breakdown: String(latestAttempt?.breakdownLabel || "").trim(),
        }
        : null,
      tasks,
    };
  });

  return {
    studentId,
    units,
  };
}

async function getStudentDailyTasks(req, res) {
  const studentUser = await resolveStudentUserForDailyTasks(req);
  const requestedStudentId = normalizeStudentId(req.params.studentId);
  if (!studentUser) {
    return notFound(res, "Daily tasks", requestedStudentId || normalizeStudentId(req.auth?.email));
  }

  const statusFilter = normalizeStudentId(req.query.status);
  const payload = await buildStudentDailyTasksResponse(studentUser);

  if (!statusFilter) {
    return res.json(payload);
  }

  return res.json({
    ...payload,
    units: payload.units.filter((unit) => normalizeStudentId(unit?.status) === statusFilter),
  });
}

async function getMyStudentDailyTasks(req, res) {
  req.params.studentId = "me";
  return getStudentDailyTasks(req, res);
}

async function getMyStudentDashboard(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const user = await User.findById(studentUserId)
    .select("_id email role fullName createdAt isActive")
    .lean();
  if (!user || user.role !== "student" || !user.isActive) {
    return res.status(403).json({
      message: "Only students can access this endpoint.",
    });
  }

  const studentId = normalizeStudentId(user.email);
  const safeDailyTaskUser = {
    _id: String(user._id),
    email: studentId,
  };

  const [
    profileDoc,
    dailyTasks,
    analytics,
    heatmapEntries,
    recentAttempts,
  ] = await Promise.all([
    ensureStudentProfileForUser(user),
    buildStudentDailyTasksResponse(safeDailyTaskUser),
    getDynamicStudentAnalytics(studentUserId, "week"),
    getHeatmapEntriesForStudent(studentId),
    listRecentStudentTaskAttempts(studentUserId, 11, {
      status: "completed",
    }),
  ]);

  const recentItems = (Array.isArray(recentAttempts) ? recentAttempts : []).map((attempt) => {
    const summary = summarizeStudentTaskAttemptForClient(attempt);
    return {
      ...summary,
      title: buildRecentCompletedTitle(summary),
      detail: buildAttemptDetailLine({ score: summary.score }),
      to: buildRecentCompletedRoute(summary, attempt),
    };
  });

  return res.json({
    profile: buildMyStudentProfileResponse(user, profileDoc),
    dailyTasks,
    recentAttempts: {
      count: recentItems.length,
      items: recentItems,
    },
    analyticsSummary: analytics || null,
    heatmap: {
      entries: normalizeStudyHeatmapEntries(heatmapEntries || []),
    },
    fetchedAt: new Date().toISOString(),
  });
}

async function createMyDailyTaskAttempt(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  const studentEmail = normalizeStudentId(req.auth?.email);
  if (!studentUserId || !studentEmail) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const taskType = normalizeDailyTaskType(req.body?.taskType);
  const taskRefId = normalizeDailyTaskRefId(req.body?.taskRefId);
  if (!taskType || !taskRefId) {
    return res.status(400).json({
      message: `\`taskType\` and \`taskRefId\` are required. taskType must be one of: ${DAILY_TASK_TYPES.join(", ")}.`,
    });
  }

  const score = req.body?.score && typeof req.body.score === "object" ? req.body.score : {};
  const bodyPayload = req.body?.payload;
  const bodySourceRefs = req.body?.sourceRefs;
  const bodyUnitBreakdown = req.body?.unitBreakdown;
  const attemptCategory = normalizeAttemptCategory(req.body?.attemptCategory);
  const sourceType = normalizeSourceType(req.body?.sourceType);
  const status = String(req.body?.status || "").trim() || "completed";
  const submittedAtRaw = req.body?.submittedAt ? new Date(req.body.submittedAt) : null;
  const submittedAt =
    submittedAtRaw && !Number.isNaN(submittedAtRaw.valueOf()) ? submittedAtRaw : new Date();

  if (attemptCategory === "additional") {
    try {
      await assertAdditionalTaskUnlocked({
        studentUserId,
        taskType,
        taskRefId,
        sourceType,
        payload: bodyPayload && typeof bodyPayload === "object" ? bodyPayload : {},
      });
    } catch (error) {
      const statusCode = Number(error?.httpStatus) || 403;
      return res.status(statusCode).json({
        message: error?.message || "This additional task is locked.",
      });
    }
  }

  try {
    const createdAttempt = await recordStudentTaskAttempt({
      studentUserId,
      studentEmail,
      taskType,
      taskRefId,
      attemptCategory,
      sourceType,
      status,
      taskLabel: String(req.body?.taskLabel || "").trim(),
      submitReason: String(req.body?.submitReason || "").trim() || "manual",
      forceReason: String(req.body?.forceReason || "").trim(),
      isAutoSubmitted: req.body?.isAutoSubmitted === true,
      submittedAt,
      totalTimeSpentSeconds: Math.max(0, Math.round(Number(req.body?.totalTimeSpentSeconds) || 0)),
      score: {
        band: Number.isFinite(Number(score?.band)) ? Number(score.band) : null,
        percentage: Number.isFinite(Number(score?.percentage)) ? Number(score.percentage) : null,
        correctCount: Number.isFinite(Number(score?.correctCount)) ? Number(score.correctCount) : null,
        incorrectCount: Number.isFinite(Number(score?.incorrectCount)) ? Number(score.incorrectCount) : null,
        totalQuestions: Number.isFinite(Number(score?.totalQuestions)) ? Number(score.totalQuestions) : null,
      },
      unitBreakdown: Array.isArray(bodyUnitBreakdown) ? bodyUnitBreakdown : [],
      payload: bodyPayload && typeof bodyPayload === "object" ? bodyPayload : {},
      sourceRefs: bodySourceRefs && typeof bodySourceRefs === "object" ? bodySourceRefs : {},
    });

    const responsePayload = {
      message: "Task attempt saved successfully.",
      attempt: summarizeStudentTaskAttemptForClient(createdAttempt),
    };

    if (String(createdAttempt?.attemptCategory || "").trim() === "daily") {
      const refreshedDailyTasks = await buildStudentDailyTasksResponse({
        _id: studentUserId,
        email: studentEmail,
      });

      responsePayload.studentId = refreshedDailyTasks.studentId;
      responsePayload.units = refreshedDailyTasks.units;
    }

    return res.status(201).json({
      ...responsePayload,
    });
  } catch (error) {
    const errorMessage = String(error?.message || "Task attempt could not be saved.");
    const isMissingPublishedTask = errorMessage.includes("not present in published daily units");
    return res.status(isMissingPublishedTask ? 404 : 400).json({
      message: errorMessage,
    });
  }
}

async function markMyDailyTaskCompleted(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  const studentEmail = normalizeStudentId(req.auth?.email);
  if (!studentUserId || !studentEmail) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const taskType = normalizeDailyTaskType(req.body?.taskType);
  const taskRefId = normalizeDailyTaskRefId(req.body?.taskRefId);
  if (!taskType || !taskRefId) {
    return res.status(400).json({
      message: `\`taskType\` and \`taskRefId\` are required. taskType must be one of: ${DAILY_TASK_TYPES.join(", ")}.`,
    });
  }

  try {
    const createdAttempt = await recordStudentTaskAttempt({
      studentUserId,
      studentEmail,
      taskType,
      taskRefId,
      attemptCategory: "daily",
      sourceType: "daily_unit",
      taskLabel: String(req.body?.taskLabel || "").trim(),
      submitReason: "manual",
      payload: {
        source: "legacy-complete-endpoint",
      },
    });

    const payload = await buildStudentDailyTasksResponse({
      _id: studentUserId,
      email: studentEmail,
    });

    return res.json({
      message: "Daily task marked as completed.",
      completedTask: {
        taskType,
        taskRefId,
        completedAt: toSafeIsoDate(createdAttempt?.submittedAt) || new Date().toISOString(),
      },
      attempt: summarizeStudentTaskAttemptForClient(createdAttempt),
      ...payload,
    });
  } catch (error) {
    const errorMessage = String(error?.message || "Daily task could not be marked as completed.");
    const isMissingPublishedTask = errorMessage.includes("not present in published daily units");
    return res.status(isMissingPublishedTask ? 404 : 400).json({
      message: errorMessage,
    });
  }
}

async function getMyRecentCompletedDailyTasks(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const requestedLimit = Number.parseInt(String(req.query?.limit || ""), 10);
  const safeLimit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 40)
    : 11;
  const requestedCategory = normalizeAttemptCategory(req.query?.attemptCategory);

  const attempts = await listRecentStudentTaskAttempts(studentUserId, safeLimit, {
    status: "completed",
    attemptCategory: requestedCategory || undefined,
  });
  const recentItems = attempts.map((attempt) => {
    const summary = summarizeStudentTaskAttemptForClient(attempt);
    return {
      ...summary,
      title: buildRecentCompletedTitle(summary),
      detail: buildAttemptDetailLine({ score: summary.score }),
      to: buildRecentCompletedRoute(summary, attempt),
    };
  });

  return res.json({
    count: recentItems.length,
    items: recentItems,
  });
}

async function listMyTaskAttempts(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const page = Number.parseInt(String(req.query?.page || ""), 10);
  const limit = Number.parseInt(String(req.query?.limit || ""), 10);
  const options = {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
    attemptCategory: normalizeAttemptCategory(req.query?.attemptCategory),
    taskType: normalizeDailyTaskType(req.query?.taskType),
    taskRefId: normalizeDailyTaskRefId(req.query?.taskRefId),
    sourceType: normalizeSourceType(req.query?.sourceType),
  };

  const result = await listStudentTaskAttempts(studentUserId, options);
  const attempts = (Array.isArray(result?.attempts) ? result.attempts : []).map((attempt) =>
    summarizeStudentTaskAttemptForClient(attempt),
  );

  return res.json({
    count: attempts.length,
    total: Number(result?.total || 0),
    pagination: {
      page: Number(result?.page || 1),
      limit: Number(result?.limit || 20),
      totalPages: Number(result?.totalPages || 1),
    },
    attempts,
  });
}

async function listMyResultsCenterGroups(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  try {
    const payload = await listResultsCenterGroups(studentUserId, {
      category: req.query?.category,
    });
    return res.json(payload);
  } catch (error) {
    return respondResultsCenterError(res, error, "Could not load grouped results.");
  }
}

async function listMyResultsCenterTaskAttempts(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const taskGroupId = String(req.params?.taskGroupId || "").trim();
  if (!taskGroupId) {
    return res.status(400).json({
      message: "`taskGroupId` is required.",
    });
  }

  try {
    const payload = await listResultGroupAttempts(studentUserId, {
      taskGroupId,
      sort: req.query?.sort,
    });
    return res.json(payload);
  } catch (error) {
    return respondResultsCenterError(res, error, "Could not load task attempts.");
  }
}

async function getMyResultsCenterAttemptDetail(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const taskGroupId = String(req.params?.taskGroupId || "").trim();
  const attemptRef = String(
    req.params?.attemptRef
    || req.query?.attemptRef
    || req.query?.attemptNumber
    || req.query?.attemptId
    || "",
  ).trim();

  if (!taskGroupId) {
    return res.status(400).json({
      message: "`taskGroupId` is required.",
    });
  }

  try {
    const payload = await getResultGroupAttemptDetail(studentUserId, {
      taskGroupId,
      attemptRef,
    });
    return res.json(payload);
  } catch (error) {
    return respondResultsCenterError(res, error, "Could not load attempt detail.");
  }
}

async function getMyResultsCenterWritingRedirect(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const taskGroupId = String(req.params?.taskGroupId || "").trim();
  const attemptRef = String(
    req.query?.attemptRef
    || req.query?.attemptNumber
    || req.query?.attemptId
    || "",
  ).trim();

  if (!taskGroupId) {
    return res.status(400).json({
      message: "`taskGroupId` is required.",
    });
  }

  try {
    const payload = await getWritingResultRedirectMeta(studentUserId, {
      taskGroupId,
      attemptRef,
    });
    return res.json(payload);
  } catch (error) {
    return respondResultsCenterError(res, error, "Could not resolve writing redirect.");
  }
}

async function listMyTaskResultHistory(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const activeCategory = normalizeResultsCategory(req.query?.category);
  const rawAttempts = await StudentTaskAttempt.find({
    studentUserId,
    status: "completed",
  })
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .lean();

  if (!Array.isArray(rawAttempts) || rawAttempts.length === 0) {
    return res.json({
      activeCategory,
      filters: RESULTS_CATEGORY_KEYS.map((key) => ({
        key,
        label: getResultsCategoryLabel(key),
        count: 0,
      })),
      count: 0,
      groups: [],
    });
  }

  const lookups = await buildTaskSourceLookupsForAttempts(rawAttempts);
  const groupedByTaskKey = new Map();

  rawAttempts.forEach((rawAttempt) => {
    const summary = summarizeStudentTaskAttemptForClient(rawAttempt);
    if (!summary?.taskType || !summary?.taskRefId) {
      return;
    }

    const attemptItem = buildResultAttemptItem(summary, rawAttempt, lookups);
    const groupKey = `${summary.taskType}::${attemptItem.groupSourceType}::${summary.taskRefId}`;
    const existing = groupedByTaskKey.get(groupKey) || {
      key: groupKey,
      taskType: summary.taskType,
      taskRefId: summary.taskRefId,
      sourceType: attemptItem.groupSourceType,
      category: attemptItem.category,
      taskMode: resolveResultTaskMode(attemptItem.category),
      title: attemptItem.baseTitle,
      latestAttempt: attemptItem,
      attempts: [],
    };

    existing.attempts.push(attemptItem);
    if (!existing.latestAttempt) {
      existing.latestAttempt = attemptItem;
    }
    groupedByTaskKey.set(groupKey, existing);
  });

  const groups = Array.from(groupedByTaskKey.values())
    .map((group) => {
      const latestAttempt = group.latestAttempt || group.attempts[0] || null;
      const attempts = Array.isArray(group.attempts) ? group.attempts : [];
      const attemptsCount = attempts.length;

      return {
        key: group.key,
        taskType: group.taskType,
        taskRefId: group.taskRefId,
        sourceType: group.sourceType,
        category: group.category,
        categoryLabel: getResultsCategoryLabel(group.category),
        taskMode: group.taskMode,
        title: group.title,
        attemptsCount,
        latestAttemptNumber: Number(latestAttempt?.attemptNumber || 1),
        latestScoreLabel: latestAttempt?.scoreLabel || "Completed",
        latestSubmittedAt: latestAttempt?.submittedAt || null,
        latestTimeSpentSeconds: Number(latestAttempt?.totalTimeSpentSeconds || 0),
        latestTimeSpentLabel: latestAttempt?.totalTimeSpentLabel || "0m",
        latestBand: Number.isFinite(Number(latestAttempt?.score?.band))
          ? Number(latestAttempt.score.band)
          : null,
        latestPercentage: Number.isFinite(Number(latestAttempt?.score?.percentage))
          ? Number(latestAttempt.score.percentage)
          : null,
        openLatestTo: latestAttempt?.to || "/student/results",
        attemptsPreview: attempts.slice(0, 5).map((attempt) => ({
          attemptNumber: Number(attempt?.attemptNumber || 1),
          scoreLabel: attempt?.scoreLabel || "Completed",
          submittedAt: attempt?.submittedAt || null,
          totalTimeSpentSeconds: Number(attempt?.totalTimeSpentSeconds || 0),
          totalTimeSpentLabel: attempt?.totalTimeSpentLabel || "0m",
          to: attempt?.to || "/student/results",
          analysisId: attempt?.analysisId || "",
          isLatest: latestAttempt ? String(attempt?.id || "") === String(latestAttempt?.id || "") : false,
        })),
      };
    })
    .sort((left, right) =>
      new Date(right.latestSubmittedAt || 0).valueOf() - new Date(left.latestSubmittedAt || 0).valueOf(),
    );

  const countsByCategory = RESULTS_CATEGORY_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  groups.forEach((group) => {
    const category = normalizeResultsCategory(group?.category);
    if (category !== "all") {
      countsByCategory[category] += 1;
    }
  });
  countsByCategory.all = groups.length;

  const filteredGroups = activeCategory === "all"
    ? groups
    : groups.filter((group) => normalizeResultsCategory(group?.category) === activeCategory);

  return res.json({
    activeCategory,
    filters: RESULTS_CATEGORY_KEYS.map((key) => ({
      key,
      label: getResultsCategoryLabel(key),
      count: Number(countsByCategory[key] || 0),
    })),
    count: filteredGroups.length,
    groups: filteredGroups,
  });
}

async function getMyTaskResultDetail(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const taskType = normalizeDailyTaskType(req.query?.taskType);
  const taskRefId = normalizeDailyTaskRefId(req.query?.taskRefId);
  const sourceType = normalizeSourceType(req.query?.sourceType);
  const requestedAttemptNumber = Number.parseInt(String(req.query?.attemptNumber || ""), 10);

  if (!taskType || !taskRefId) {
    return res.status(400).json({
      message: "`taskType` and `taskRefId` are required.",
    });
  }

  const rawAttempts = await StudentTaskAttempt.find({
    studentUserId,
    status: "completed",
    taskType,
    taskRefId,
  })
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .lean();

  if (!Array.isArray(rawAttempts) || rawAttempts.length === 0) {
    return res.status(404).json({
      message: "No completed attempts were found for this task.",
    });
  }

  const lookups = await buildTaskSourceLookupsForAttempts(rawAttempts);
  const attempts = rawAttempts
    .map((rawAttempt) => {
      const summary = summarizeStudentTaskAttemptForClient(rawAttempt);
      return buildResultAttemptItem(summary, rawAttempt, lookups);
    })
    .filter((item) => {
      if (!sourceType) {
        return true;
      }
      return normalizeSourceType(item?.groupSourceType) === sourceType;
    });

  if (attempts.length === 0) {
    return res.status(404).json({
      message: "No completed attempts were found for the selected task source.",
    });
  }

  const latestAttempt = attempts[0];
  const category = resolveAttemptResultCategory(taskType, latestAttempt?.sourceType, taskRefId);
  const taskMode = resolveResultTaskMode(category);
  const activeAttempt = Number.isFinite(requestedAttemptNumber) && requestedAttemptNumber > 0
    ? attempts.find((attempt) => Number(attempt?.attemptNumber) === requestedAttemptNumber) || latestAttempt
    : latestAttempt;

  return res.json({
    task: {
      taskType,
      taskRefId,
      sourceType: latestAttempt?.groupSourceType || sourceType || "",
      category,
      categoryLabel: getResultsCategoryLabel(category),
      taskMode,
      title: latestAttempt?.baseTitle || `${toReadableLabel(taskType)}: ${taskRefId}`,
      attemptsCount: attempts.length,
      latestAttemptNumber: Number(latestAttempt?.attemptNumber || 1),
      latestSubmittedAt: latestAttempt?.submittedAt || null,
      latestScoreLabel: latestAttempt?.scoreLabel || "Completed",
    },
    activeAttemptNumber: Number(activeAttempt?.attemptNumber || 1),
    activeAttempt,
    attempts,
  });
}

async function updateStudentDailyTasks(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const { units } = req.body || {};

  if (!Array.isArray(units)) {
    return res.status(400).json({
      message: "Body must include `units` as an array.",
    });
  }

  const doc = await StudentDailyTasks.findOneAndUpdate(
    { studentId },
    { $set: { units } },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!doc) {
    return notFound(res, "Daily tasks", studentId);
  }

  return res.json({
    message: "Daily tasks updated",
    studentId,
    units: doc.units,
  });
}

async function updateTaskStatus(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const unitId = req.params.unitId;
  const taskId = req.params.taskId;
  const nextStatus = req.body?.status;

  if (!VALID_TASK_STATUSES.includes(nextStatus)) {
    return res.status(400).json({
      message: `Invalid status. Use one of: ${VALID_TASK_STATUSES.join(", ")}`,
    });
  }

  const doc = await StudentDailyTasks.findOne({ studentId });
  if (!doc) {
    return notFound(res, "Daily tasks", studentId);
  }

  const unit = doc.units.find((item) => item.unitId === unitId);
  if (!unit) {
    return res.status(404).json({ message: `Unit '${unitId}' not found` });
  }

  const task = unit.tasks.find((item) => item.taskId === taskId);
  if (!task) {
    return res.status(404).json({ message: `Task '${taskId}' not found` });
  }

  task.status = nextStatus;

  const activeMinutes = Number(req.body?.activeMinutes);
  const activeSeconds = Number(req.body?.activeSeconds);
  const minutesFromSeconds = Number.isFinite(activeSeconds) && activeSeconds > 0 ? activeSeconds / 60 : 0;
  const taskActiveMinutes = Number.isFinite(activeMinutes) && activeMinutes > 0 ? activeMinutes : minutesFromSeconds;

  if (nextStatus === "completed" && taskActiveMinutes > 0) {
    const user = await getStudentUserByStudentId(studentId);
    if (user && user.isActive) {
      user.studyHeatmap = mergeDailyMinutes(user.studyHeatmap || [], {
        date: getDateKey(),
        minutesSpent: taskActiveMinutes,
        mode: "increment",
      });
      await user.save();
      await syncLegacyStudyActivityFromUser(studentId, user.studyHeatmap);
    } else {
      const analytics = await getOrCreateStudentAnalyticsDoc(studentId);
      const fallbackEntries = normalizeStudyHeatmapEntries(
        (analytics.studyActivity?.entries || []).map((entry) => ({
          date: entry.dateKey,
          minutesSpent: entry.taskActiveMinutes || 0,
        })),
      );
      const mergedFallback = mergeDailyMinutes(fallbackEntries, {
        date: getDateKey(),
        minutesSpent: taskActiveMinutes,
        mode: "increment",
      });
      analytics.studyActivity = {
        entries: mergedFallback.map((entry) => ({
          dateKey: entry.date,
          visited: true,
          taskActiveMinutes: entry.minutesSpent,
        })),
      };
      analytics.heatmap = buildYearHeatmapFromEntries(mergedFallback);
      await analytics.save();
    }
  }

  await doc.save();

  return res.json({
    message: "Task status updated",
    studentId,
    unitId,
    task,
  });
}

async function getStudentAnalytics(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const range = req.query.range || "week";
  const part = req.query.part || "Listening";
  const year = parseHeatmapYear(req.query.year);

  if (!VALID_RANGES.includes(range)) {
    return res.status(400).json({
      message: `Invalid range. Use one of: ${VALID_RANGES.join(", ")}`,
    });
  }

  if (!VALID_PARTS.includes(part)) {
    return res.status(400).json({
      message: `Invalid part. Use one of: ${VALID_PARTS.join(", ")}`,
    });
  }

  if (year === null) {
    return res.status(400).json({
      message: "Invalid `year`. Use a year between 1970 and 9999.",
    });
  }

  const analyticsDoc = await getOrCreateStudentAnalyticsDoc(studentId);
  const analytics = analyticsDoc.toObject();

  const activeRange = analytics.ranges[range];
  const legacyEntries = normalizeStudyHeatmapEntries(
    (analytics.studyActivity?.entries || []).map((entry) => ({
      date: entry.dateKey,
      minutesSpent: entry.taskActiveMinutes || 0,
    })),
  );
  const userEntries = await getHeatmapEntriesForStudent(studentId);
  const activeEntries = Array.isArray(userEntries) ? userEntries : legacyEntries;
  const dynamicHeatmap = buildYearHeatmapFromEntries(activeEntries, year);
  const todaySummary = todaysStudySummary(activeEntries);

  return res.json({
    studentId,
    range,
    part,
    overview: activeRange.overview,
    bandChart: activeRange.bandChart,
    timeChart: activeRange.timeChart,
    weakSections: activeRange.weakSections[part],
    heatmap: dynamicHeatmap.months.length ? dynamicHeatmap : analytics.heatmap,
    entries: activeEntries,
    todaysStudyTimeMinutes: todaySummary.todaysStudyTimeMinutes,
    "today's study time": todaySummary["today's study time"],
    "today's study time :": todaySummary["today's study time :"],
    todayStudyLevel: todaySummary.level,
  });
}

async function getMyStudentAnalytics(req, res) {
  const studentUserId = String(req.auth?.userId || "").trim();
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const analytics = await getDynamicStudentAnalytics(
    studentUserId,
    req.query?.period || req.query?.range || "week",
  );

  return res.json(analytics);
}

async function updateStudentAnalytics(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const { ranges, heatmap } = req.body || {};

  if (!ranges) {
    return res.status(400).json({
      message: "Body must include `ranges`.",
    });
  }

  const updatePayload = { ranges };
  if (heatmap) {
    updatePayload.heatmap = heatmap;
  }

  const analytics = await StudentAnalytics.findOneAndUpdate(
    { studentId },
    { $set: updatePayload },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!analytics) {
    return notFound(res, "Analytics", studentId);
  }

  return res.json({
    message: "Analytics updated",
    analytics,
  });
}

async function markStudyVisit(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const user = await getStudentUserByStudentId(studentId);
  if (!user || !user.isActive) {
    return notFound(res, "Student", studentId);
  }

  const todayKey = getDateKey();
  user.studyHeatmap = mergeDailyMinutes(user.studyHeatmap || [], {
    date: todayKey,
    minutesSpent: 0,
    mode: "max",
  });
  await user.save();
  await syncLegacyStudyActivityFromUser(studentId, user.studyHeatmap);

  const summary = todaysStudySummary(user.studyHeatmap || [], todayKey);
  return res.json({
    message: "Visit tracked.",
    studentId,
    entries: normalizeStudyHeatmapEntries(user.studyHeatmap || []),
    ...summary,
  });
}

async function addTaskStudyTime(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const user = await getStudentUserByStudentId(studentId);
  if (!user || !user.isActive) {
    return notFound(res, "Student", studentId);
  }

  const body = req.body || {};
  const minutesSpentRaw = Number(body.minutesSpent);
  const secondsSpentRaw = Number(body.secondsSpent);
  const date = normalizeDateKey(body.date, getDateKey());

  const derivedMinutesFromSeconds = Number.isFinite(secondsSpentRaw) && secondsSpentRaw > 0
    ? secondsSpentRaw / 60
    : 0;
  const minutesSpent = Number.isFinite(minutesSpentRaw) && minutesSpentRaw > 0
    ? minutesSpentRaw
    : derivedMinutesFromSeconds;

  if (!Number.isFinite(minutesSpent) || minutesSpent <= 0) {
    return res.status(400).json({
      message: "Provide positive `minutesSpent` or `secondsSpent`.",
    });
  }

  user.studyHeatmap = mergeDailyMinutes(user.studyHeatmap || [], {
    date,
    minutesSpent,
    mode: "increment",
  });
  await user.save();
  await syncLegacyStudyActivityFromUser(studentId, user.studyHeatmap);

  const summary = todaysStudySummary(user.studyHeatmap || [], date);

  return res.json({
    message: "Task study time tracked.",
    studentId,
    trackedMinutes: Number(minutesSpent.toFixed(1)),
    entries: normalizeStudyHeatmapEntries(user.studyHeatmap || []),
    ...summary,
  });
}

async function getStudyHeatmap(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const year = parseHeatmapYear(req.query.year);

  if (year === null) {
    return res.status(400).json({
      message: "Invalid `year`. Use a year between 1970 and 9999.",
    });
  }

  const user = await getStudentUserByStudentId(studentId, "+studyHeatmap");
  if (!user || !user.isActive) {
    return notFound(res, "Student", studentId);
  }

  const entries = normalizeStudyHeatmapEntries(user.studyHeatmap || []);
  const heatmap = buildYearHeatmapFromEntries(entries, year);
  const summary = todaysStudySummary(entries);

  return res.json({
    studentId,
    heatmap,
    entries,
    todaysStudyTimeMinutes: summary.todaysStudyTimeMinutes,
    "today's study time": summary["today's study time"],
    "today's study time :": summary["today's study time :"],
    todayStudyLevel: summary.level,
  });
}

async function markMyStudyVisit(req, res) {
  req.params.studentId = normalizeStudentId(req.auth?.email);
  return markStudyVisit(req, res);
}

async function addMyTaskStudyTime(req, res) {
  req.params.studentId = normalizeStudentId(req.auth?.email);
  return addTaskStudyTime(req, res);
}

async function getMyStudyHeatmap(req, res) {
  req.params.studentId = normalizeStudentId(req.auth?.email);
  return getStudyHeatmap(req, res);
}

async function seedStudentData(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const seededHeatmap = buildYearHeatmapFromEntries([]);
  const seededStudyActivity = { entries: [] };

  const [profile, dailyTasks, analytics] = await Promise.all([
    StudentProfile.findOneAndUpdate(
      { studentId },
      { $set: { studentId, ...studentProfileSeed } },
      { new: true, upsert: true, runValidators: true },
    ).lean(),
    StudentDailyTasks.findOneAndUpdate(
      { studentId },
      { $set: { studentId, ...studentDailyTasksSeed } },
      { new: true, upsert: true, runValidators: true },
    ).lean(),
    StudentAnalytics.findOneAndUpdate(
      { studentId },
      { $set: { studentId, ...studentAnalyticsSeed, heatmap: seededHeatmap, studyActivity: seededStudyActivity } },
      { new: true, upsert: true, runValidators: true },
    ).lean(),
  ]);

  await User.updateOne(
    { email: studentId, role: "student" },
    { $set: { studyHeatmap: [] } },
  );

  const studentUser = await User.findOne({ email: studentId, role: "student" }, { _id: 1 }).lean();
  if (studentUser?._id) {
    const studentUserId = String(studentUser._id);
    await Promise.all([
      StudentTaskAttempt.deleteMany({ studentUserId }),
      StudentUnitProgress.deleteMany({ studentUserId }),
    ]);
  }

  return res.status(201).json({
    message: "Student seed data is ready.",
    studentId,
    profile,
    dailyTasks,
    analytics,
  });
}

async function listStudents(req, res) {
  const students = await StudentProfile.find({}, { studentId: 1, fullName: 1, email: 1 })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ students });
}

module.exports = {
  getMyStudentProfile,
  updateMyAccountProfile,
  updateMyAccountPassword,
  getStudentProfile,
  updateStudentProfile,
  getStudentDailyTasks,
  getMyStudentDailyTasks,
  getMyStudentDashboard,
  createMyDailyTaskAttempt,
  getMyRecentCompletedDailyTasks,
  listMyTaskAttempts,
  listMyResultsCenterGroups,
  listMyResultsCenterTaskAttempts,
  getMyResultsCenterAttemptDetail,
  getMyResultsCenterWritingRedirect,
  listMyTaskResultHistory,
  getMyTaskResultDetail,
  markMyDailyTaskCompleted,
  updateStudentDailyTasks,
  updateTaskStatus,
  getStudentAnalytics,
  getMyStudentAnalytics,
  updateStudentAnalytics,
  markStudyVisit,
  addTaskStudyTime,
  getStudyHeatmap,
  markMyStudyVisit,
  addMyTaskStudyTime,
  getMyStudyHeatmap,
  seedStudentData,
  listStudents,
};
