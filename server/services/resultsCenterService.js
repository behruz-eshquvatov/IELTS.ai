const mongoose = require("mongoose");
const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const ListeningTest = require("../models/listeningTestModel");
const ListeningBlock = require("../models/listeningBlockModel");
const WritingTask1Item = require("../models/writingTask1ItemModel");
const WritingTask2Item = require("../models/writingTask2ItemModel");
const WritingTask1Analysis = require("../models/writingTask1AnalysisModel");
const WritingTask2Analysis = require("../models/writingTask2AnalysisModel");

const READING_TESTS_COLLECTION = "reading_tests";
const READING_PASSAGES_COLLECTION = "reading_passages";
const DEFAULT_LISTENING_BLOCKS_COLLECTION =
  ListeningBlock.collection.name || "listening_blocks";
const LEGACY_LISTENING_BLOCKS_COLLECTION = "listeninig_blocks";

const RESULT_CATEGORIES = {
  WRITING_TASK1: "writing_task1",
  WRITING_TASK2: "writing_task2",
  READING_FULL_TEST: "reading_full_test",
  LISTENING_FULL_TEST: "listening_full_test",
  READING_QUESTION_TASK: "reading_question_task",
  LISTENING_QUESTION_TASK: "listening_question_task",
};

const RESULTS_CENTER_FILTER_KEYS = [
  "all",
  RESULT_CATEGORIES.WRITING_TASK1,
  RESULT_CATEGORIES.WRITING_TASK2,
  RESULT_CATEGORIES.READING_FULL_TEST,
  RESULT_CATEGORIES.LISTENING_FULL_TEST,
  "part_by_part",
  "question_type_task",
  RESULT_CATEGORIES.READING_QUESTION_TASK,
  RESULT_CATEGORIES.LISTENING_QUESTION_TASK,
];

const RESULTS_CENTER_FILTER_LABELS = {
  all: "ALL",
  [RESULT_CATEGORIES.WRITING_TASK1]: "WRITING T1",
  [RESULT_CATEGORIES.WRITING_TASK2]: "WRITING T2",
  [RESULT_CATEGORIES.READING_FULL_TEST]: "READING FULL TESTS",
  [RESULT_CATEGORIES.LISTENING_FULL_TEST]: "LISTENING FULL TESTS",
  part_by_part: "PART BY PART",
  question_type_task: "QUESTION TYPE TASKS",
};

const FILTER_ALIASES = {
  writing_task1: RESULT_CATEGORIES.WRITING_TASK1,
  writing_task2: RESULT_CATEGORIES.WRITING_TASK2,
  reading_full: RESULT_CATEGORIES.READING_FULL_TEST,
  reading_full_test: RESULT_CATEGORIES.READING_FULL_TEST,
  listening_full: RESULT_CATEGORIES.LISTENING_FULL_TEST,
  listening_full_test: RESULT_CATEGORIES.LISTENING_FULL_TEST,
  part_by_part: "part_by_part",
  listening_part: "part_by_part",
  question_type_task: "question_type_task",
  reading_question: RESULT_CATEGORIES.READING_QUESTION_TASK,
  reading_question_task: RESULT_CATEGORIES.READING_QUESTION_TASK,
  listening_question: RESULT_CATEGORIES.LISTENING_QUESTION_TASK,
  listening_question_task: RESULT_CATEGORIES.LISTENING_QUESTION_TASK,
};

function normalizeText(value, fallback = "", maxLength = 320) {
  const normalized = String(value || "")
    .trim()
    .slice(0, maxLength);
  return (
    normalized ||
    String(fallback || "")
      .trim()
      .slice(0, maxLength)
  );
}

function normalizeTaskType(value) {
  const safe = normalizeText(value, "", 60).toLowerCase();
  return ["reading", "listening", "writing_task1", "writing_task2"].includes(
    safe,
  )
    ? safe
    : "";
}

function normalizeSourceType(value) {
  return normalizeText(value, "", 120).toLowerCase().replace(/\s+/g, "_");
}

function normalizeTaskRefId(value) {
  return normalizeText(value, "", 200);
}

function normalizeAttemptCategory(value) {
  const safe = normalizeText(value, "", 40).toLowerCase();
  return ["daily", "additional"].includes(safe) ? safe : "additional";
}

function normalizeStudentUserId(value) {
  return normalizeText(value, "", 120);
}

function normalizeResultsCenterFilter(value) {
  const safe = normalizeText(value, "all", 80).toLowerCase();
  return FILTER_ALIASES[safe] || "all";
}

function isPartByPartResult(group = {}) {
  const safeCategory = normalizeText(group?.taskCategory, "", 80).toLowerCase();
  const safeSourceType = normalizeSourceType(group?.sourceType);
  const safeTaskRefId = normalizeTaskRefId(group?.taskRefId);

  return (
    safeCategory === RESULT_CATEGORIES.LISTENING_QUESTION_TASK &&
    (safeSourceType === "listening_part" || safeTaskRefId.includes("::part:"))
  );
}

function doesCategoryMatchFilter(taskCategory, filterKey) {
  const safeCategory = normalizeText(taskCategory, "", 80).toLowerCase();
  const safeFilter = normalizeResultsCenterFilter(filterKey);
  if (safeFilter === "all") {
    return true;
  }

  if (safeFilter === "question_type_task") {
    return (
      safeCategory === RESULT_CATEGORIES.READING_QUESTION_TASK ||
      safeCategory === RESULT_CATEGORIES.LISTENING_QUESTION_TASK
    );
  }

  return safeCategory === safeFilter;
}

function doesGroupMatchFilter(group, filterKey) {
  const safeFilter = normalizeResultsCenterFilter(filterKey);
  if (safeFilter === "part_by_part") {
    return isPartByPartResult(group);
  }

  return doesCategoryMatchFilter(group?.taskCategory, safeFilter);
}

function toReadableLabel(value) {
  const safe = normalizeText(value, "", 120);
  if (!safe) {
    return "";
  }

  return safe
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSafeIsoDate(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toISOString();
}

function summarizeScore(score = {}) {
  const safe = score && typeof score === "object" ? score : {};
  return {
    band: Number.isFinite(Number(safe?.band)) ? Number(safe.band) : null,
    percentage: Number.isFinite(Number(safe?.percentage))
      ? Number(safe.percentage)
      : null,
    correctCount: Number.isFinite(Number(safe?.correctCount))
      ? Number(safe.correctCount)
      : null,
    incorrectCount: Number.isFinite(Number(safe?.incorrectCount))
      ? Number(safe.incorrectCount)
      : null,
    totalQuestions: Number.isFinite(Number(safe?.totalQuestions))
      ? Number(safe.totalQuestions)
      : null,
  };
}

function buildScoreLabel(score = {}) {
  const safeScore = summarizeScore(score);
  if (
    Number.isFinite(Number(safeScore.correctCount)) &&
    Number.isFinite(Number(safeScore.totalQuestions)) &&
    Number(safeScore.totalQuestions) > 0
  ) {
    if (Number.isFinite(Number(safeScore.band))) {
      return `${safeScore.correctCount}/${safeScore.totalQuestions} - band ${Number(safeScore.band).toFixed(1)}`;
    }
    return `${safeScore.correctCount}/${safeScore.totalQuestions}`;
  }

  if (Number.isFinite(Number(safeScore.band))) {
    return `Band ${Number(safeScore.band).toFixed(1)}`;
  }

  if (Number.isFinite(Number(safeScore.percentage))) {
    return `${Math.round(Number(safeScore.percentage))}%`;
  }

  return "Completed";
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

function parseListeningPartTaskRefId(taskRefId) {
  const safeTaskRefId = normalizeTaskRefId(taskRefId);
  const match = safeTaskRefId.match(/^(.*)::part:(\d+)$/i);
  if (!match) {
    return {
      testId: safeTaskRefId,
      partNumber: null,
    };
  }

  const partNumber = Number.parseInt(String(match[2] || ""), 10);
  return {
    testId: normalizeTaskRefId(match[1]),
    partNumber:
      Number.isFinite(partNumber) && partNumber > 0 ? partNumber : null,
  };
}

function resolveAttemptTaskCategory(taskType, sourceType, taskRefId = "") {
  const safeTaskType = normalizeTaskType(taskType);
  const safeSourceType = normalizeSourceType(sourceType);
  const safeTaskRefId = normalizeTaskRefId(taskRefId);

  if (safeTaskType === "writing_task1") {
    return RESULT_CATEGORIES.WRITING_TASK1;
  }

  if (safeTaskType === "writing_task2") {
    return RESULT_CATEGORIES.WRITING_TASK2;
  }

  if (safeTaskType === "reading") {
    if (
      safeSourceType === "reading_passage" ||
      safeSourceType === "reading_question_family"
    ) {
      return RESULT_CATEGORIES.READING_QUESTION_TASK;
    }
    return RESULT_CATEGORIES.READING_FULL_TEST;
  }

  if (safeTaskType === "listening") {
    if (
      safeSourceType === "listening_block" ||
      safeSourceType === "listening_question_family" ||
      safeSourceType === "listening_part" ||
      safeTaskRefId.includes("::part:")
    ) {
      return RESULT_CATEGORIES.LISTENING_QUESTION_TASK;
    }
    return RESULT_CATEGORIES.LISTENING_FULL_TEST;
  }

  return RESULT_CATEGORIES.READING_QUESTION_TASK;
}

function resolveGroupSourceType(taskCategory, sourceType) {
  const safeCategory = normalizeText(taskCategory, "", 80).toLowerCase();
  const safeSourceType = normalizeSourceType(sourceType);
  if (safeCategory === RESULT_CATEGORIES.READING_FULL_TEST) {
    return "reading_full";
  }

  if (safeCategory === RESULT_CATEGORIES.LISTENING_FULL_TEST) {
    return "listening_full";
  }

  if (safeCategory === RESULT_CATEGORIES.WRITING_TASK1) {
    return "writing_task1";
  }

  if (safeCategory === RESULT_CATEGORIES.WRITING_TASK2) {
    return "writing_task2";
  }

  return safeSourceType || "question_type_task";
}

function resolveTaskTypeFromCategory(taskCategory) {
  const safeCategory = normalizeText(taskCategory, "", 80).toLowerCase();
  if (
    safeCategory === RESULT_CATEGORIES.READING_FULL_TEST ||
    safeCategory === RESULT_CATEGORIES.READING_QUESTION_TASK
  ) {
    return "reading";
  }

  if (
    safeCategory === RESULT_CATEGORIES.LISTENING_FULL_TEST ||
    safeCategory === RESULT_CATEGORIES.LISTENING_QUESTION_TASK
  ) {
    return "listening";
  }

  if (safeCategory === RESULT_CATEGORIES.WRITING_TASK1) {
    return "writing_task1";
  }

  if (safeCategory === RESULT_CATEGORIES.WRITING_TASK2) {
    return "writing_task2";
  }

  return "";
}

function resolveTaskMode(taskCategory) {
  const safeCategory = normalizeText(taskCategory, "", 80).toLowerCase();
  if (
    safeCategory === RESULT_CATEGORIES.READING_FULL_TEST ||
    safeCategory === RESULT_CATEGORIES.LISTENING_FULL_TEST
  ) {
    return "full";
  }

  if (
    safeCategory === RESULT_CATEGORIES.READING_QUESTION_TASK ||
    safeCategory === RESULT_CATEGORIES.LISTENING_QUESTION_TASK
  ) {
    return "question";
  }

  return "writing";
}

function buildTaskGroupId({ taskCategory, sourceType, taskRefId }) {
  const safeCategory = normalizeText(taskCategory, "", 80).toLowerCase();
  const safeSourceType = normalizeText(sourceType, "", 120).toLowerCase();
  const safeTaskRefId = normalizeTaskRefId(taskRefId);
  return `${safeCategory}::${safeSourceType}::${safeTaskRefId}`;
}

function parseTaskGroupId(taskGroupIdInput) {
  const decoded = (() => {
    const safe = String(taskGroupIdInput || "").trim();
    if (!safe) {
      return "";
    }

    try {
      return decodeURIComponent(safe);
    } catch {
      return safe;
    }
  })();
  const [category = "", sourceType = "", ...restParts] = decoded.split("::");
  const taskRefId = restParts.join("::");
  const safeCategory = normalizeText(category, "", 80).toLowerCase();
  const safeSourceType = normalizeText(sourceType, "", 120).toLowerCase();
  const safeTaskRefId = normalizeTaskRefId(taskRefId);
  if (!safeCategory || !safeSourceType || !safeTaskRefId) {
    return null;
  }

  if (!Object.values(RESULT_CATEGORIES).includes(safeCategory)) {
    return null;
  }

  const taskType = resolveTaskTypeFromCategory(safeCategory);
  if (!taskType) {
    return null;
  }

  return {
    taskGroupId: buildTaskGroupId({
      taskCategory: safeCategory,
      sourceType: safeSourceType,
      taskRefId: safeTaskRefId,
    }),
    taskCategory: safeCategory,
    sourceType: safeSourceType,
    taskRefId: safeTaskRefId,
    taskType,
    taskMode: resolveTaskMode(safeCategory),
  };
}

function sanitizeIncorrectItems(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, 80).map((item) => ({
    section: normalizeSourceType(item?.section),
    questionFamily: normalizeSourceType(item?.questionFamily),
    blockType: normalizeSourceType(item?.blockType),
    blockId: normalizeTaskRefId(item?.blockId),
    blockTitle: normalizeText(item?.blockTitle, "", 180),
    questionNumber: Number.isFinite(Number(item?.questionNumber))
      ? Number(item.questionNumber)
      : null,
    studentAnswer: normalizeText(item?.studentAnswer, "", 240),
    acceptedAnswers: Array.isArray(item?.acceptedAnswers)
      ? item.acceptedAnswers
          .map((entry) => normalizeText(entry, "", 120))
          .filter(Boolean)
          .slice(0, 8)
      : [],
    isCorrect: Boolean(item?.isCorrect),
  }));
}

function sanitizeEvaluation(value = {}) {
  const safe = value && typeof value === "object" ? value : {};
  const totalQuestions = Number.isFinite(Number(safe?.totalQuestions))
    ? Number(safe.totalQuestions)
    : 0;
  const correctCount = Number.isFinite(Number(safe?.correctCount))
    ? Number(safe.correctCount)
    : 0;
  const incorrectCount = Number.isFinite(Number(safe?.incorrectCount))
    ? Number(safe.incorrectCount)
    : Math.max(0, totalQuestions - correctCount);
  const percentage = Number.isFinite(Number(safe?.percentage))
    ? Number(safe.percentage)
    : totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  return {
    totalQuestions: Math.max(0, Math.round(totalQuestions)),
    correctCount: Math.max(0, Math.round(correctCount)),
    incorrectCount: Math.max(0, Math.round(incorrectCount)),
    percentage: Math.max(0, Math.min(100, Math.round(percentage))),
    band: Number.isFinite(Number(safe?.band))
      ? Math.max(0, Math.min(9, Number(safe.band)))
      : null,
    answerItems: sanitizeIncorrectItems(safe?.answerItems),
    incorrectItems: sanitizeIncorrectItems(safe?.incorrectItems),
  };
}

function sanitizePassageTiming(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => ({
      passageNumber: Number.isFinite(Number(item?.passageNumber))
        ? Number(item.passageNumber)
        : index + 1,
      timeSpentSeconds: Math.max(
        0,
        Math.round(Number(item?.timeSpentSeconds) || 0),
      ),
    }))
    .filter(
      (entry) =>
        Number.isFinite(entry.passageNumber) && entry.passageNumber > 0,
    );
}

function sanitizeBlockResults(items = []) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 40)
    .map((item) => ({
      blockId: normalizeTaskRefId(item?.blockId),
      section: normalizeSourceType(item?.section),
      questionFamily: normalizeSourceType(item?.questionFamily),
      blockType: normalizeSourceType(item?.blockType),
      blockTitle: normalizeText(item?.blockTitle, "", 180),
      correctCount: Math.max(0, Math.round(Number(item?.correctCount) || 0)),
      totalQuestions: Math.max(
        0,
        Math.round(Number(item?.totalQuestions) || 0),
      ),
      percentage: Math.max(0, Math.round(Number(item?.percentage) || 0)),
      answerItems: sanitizeIncorrectItems(item?.answerItems),
      incorrectItems: sanitizeIncorrectItems(item?.incorrectItems),
    }))
    .filter((entry) => entry.blockId);
}

function extractWritingAnalysisId(rawAttempt = {}) {
  const sourceRefs =
    rawAttempt?.sourceRefs && typeof rawAttempt.sourceRefs === "object"
      ? rawAttempt.sourceRefs
      : {};
  const payload =
    rawAttempt?.payload && typeof rawAttempt.payload === "object"
      ? rawAttempt.payload
      : {};
  const taskType = normalizeTaskType(rawAttempt?.taskType);

  if (taskType === "writing_task1") {
    return normalizeTaskRefId(
      sourceRefs?.writingTask1AnalysisId ||
        payload?.analysis?.id ||
        payload?.analysisId,
    );
  }

  if (taskType === "writing_task2") {
    return normalizeTaskRefId(
      sourceRefs?.writingTask2AnalysisId ||
        payload?.analysis?.id ||
        payload?.submission?.analysisId ||
        payload?.analysisId,
    );
  }

  return "";
}

function extractAttemptPayloadSummary(rawAttempt = {}) {
  const payload =
    rawAttempt?.payload && typeof rawAttempt.payload === "object"
      ? rawAttempt.payload
      : {};
  const submission =
    payload?.submission && typeof payload.submission === "object"
      ? payload.submission
      : {};
  const analysis =
    payload?.analysis && typeof payload.analysis === "object"
      ? payload.analysis
      : {};

  return {
    route: normalizeText(payload?.route || payload?.navigation?.to, "", 520),
    practiceKey: normalizeSourceType(
      payload?.practiceKey || submission?.practiceKey,
    ),
    partNumber: Number.isFinite(Number(submission?.partNumber))
      ? Number(submission.partNumber)
      : null,
    wordsCount: Number.isFinite(Number(submission?.wordsCount))
      ? Number(submission.wordsCount)
      : Number.isFinite(Number(rawAttempt?.score?.totalWords))
        ? Number(rawAttempt.score.totalWords)
        : null,
    evaluation: sanitizeEvaluation(
      payload?.evaluation || submission?.evaluation || {},
    ),
    passageTiming: sanitizePassageTiming(
      payload?.passageTiming || submission?.passageTiming || [],
    ),
    blockResults: sanitizeBlockResults(
      payload?.blockResults || submission?.blockResults || [],
    ),
    analysisSummary: normalizeText(analysis?.summary, "", 400),
    diagnosis:
      analysis?.diagnosis && typeof analysis.diagnosis === "object"
        ? analysis.diagnosis
        : {},
    analysisStatus: normalizeText(analysis?.status, "", 40).toLowerCase(),
  };
}

async function resolveListeningBlocksCollectionName() {
  const db = mongoose.connection.db;
  const hasDefaultCollection = Boolean(
    await db
      .listCollections(
        { name: DEFAULT_LISTENING_BLOCKS_COLLECTION },
        { nameOnly: true },
      )
      .next(),
  );
  if (hasDefaultCollection) {
    const count = await db
      .collection(DEFAULT_LISTENING_BLOCKS_COLLECTION)
      .estimatedDocumentCount();
    if (count > 0) {
      return DEFAULT_LISTENING_BLOCKS_COLLECTION;
    }
  }

  const hasLegacyCollection = Boolean(
    await db
      .listCollections(
        { name: LEGACY_LISTENING_BLOCKS_COLLECTION },
        { nameOnly: true },
      )
      .next(),
  );
  if (hasLegacyCollection) {
    const count = await db
      .collection(LEGACY_LISTENING_BLOCKS_COLLECTION)
      .estimatedDocumentCount();
    if (count > 0) {
      return LEGACY_LISTENING_BLOCKS_COLLECTION;
    }
  }

  return DEFAULT_LISTENING_BLOCKS_COLLECTION;
}

async function buildTaskMetadataLookups(rawAttempts = []) {
  const writingTask1Ids = new Set();
  const writingTask2Ids = new Set();
  const readingTestIds = new Set();
  const readingPassageIds = new Set();
  const listeningTestIds = new Set();
  const listeningBlockIds = new Set();

  (Array.isArray(rawAttempts) ? rawAttempts : []).forEach((attempt) => {
    const taskType = normalizeTaskType(attempt?.taskType);
    const sourceType = normalizeSourceType(attempt?.sourceType);
    const taskRefId = normalizeTaskRefId(attempt?.taskRefId);
    const taskCategory = resolveAttemptTaskCategory(
      taskType,
      sourceType,
      taskRefId,
    );
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

    if (taskCategory === RESULT_CATEGORIES.READING_FULL_TEST) {
      readingTestIds.add(taskRefId);
      return;
    }

    if (taskCategory === RESULT_CATEGORIES.READING_QUESTION_TASK) {
      readingPassageIds.add(taskRefId);
      return;
    }

    if (taskCategory === RESULT_CATEGORIES.LISTENING_FULL_TEST) {
      listeningTestIds.add(taskRefId);
      return;
    }

    if (taskCategory === RESULT_CATEGORIES.LISTENING_QUESTION_TASK) {
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
  const listeningBlocksCollectionName =
    await resolveListeningBlocksCollectionName();

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
      ? db
          .collection(READING_TESTS_COLLECTION)
          .find(
            { _id: { $in: Array.from(readingTestIds) } },
            { projection: { _id: 1, title: 1, module: 1, book: 1, test: 1 } },
          )
          .toArray()
      : Promise.resolve([]),
    readingPassageIds.size > 0
      ? db
          .collection(READING_PASSAGES_COLLECTION)
          .find(
            { _id: { $in: Array.from(readingPassageIds) } },
            { projection: { _id: 1, title: 1, passageTitle: 1, heading: 1 } },
          )
          .toArray()
      : Promise.resolve([]),
    listeningTestIds.size > 0
      ? ListeningTest.find(
          { _id: { $in: Array.from(listeningTestIds) } },
          { _id: 1, title: 1, section: 1, module: 1 },
        ).lean()
      : Promise.resolve([]),
    listeningBlockIds.size > 0
      ? db
          .collection(listeningBlocksCollectionName)
          .find(
            { _id: { $in: Array.from(listeningBlockIds) } },
            {
              projection: {
                _id: 1,
                blockType: 1,
                questionFamily: 1,
                display: 1,
              },
            },
          )
          .toArray()
      : Promise.resolve([]),
  ]);

  const toMapById = (items = []) =>
    new Map(
      (Array.isArray(items) ? items : []).map((item) => [
        normalizeTaskRefId(item?._id),
        item,
      ]),
    );

  return {
    writingTask1ById: toMapById(writingTask1Docs),
    writingTask2ById: toMapById(writingTask2Docs),
    readingTestsById: toMapById(readingTestDocs),
    readingPassagesById: toMapById(readingPassageDocs),
    listeningTestsById: toMapById(listeningTestDocs),
    listeningBlocksById: toMapById(listeningBlockDocs),
  };
}

function buildReadableTaskTitle(rawAttempt = {}, lookups = {}) {
  const taskType = normalizeTaskType(rawAttempt?.taskType);
  const taskRefId = normalizeTaskRefId(rawAttempt?.taskRefId);
  const sourceType = normalizeSourceType(rawAttempt?.sourceType);
  const taskCategory = resolveAttemptTaskCategory(
    taskType,
    sourceType,
    taskRefId,
  );
  const taskLabel = normalizeText(rawAttempt?.taskLabel, "", 300);
  const payloadSummary = extractAttemptPayloadSummary(rawAttempt);

  if (taskCategory === RESULT_CATEGORIES.WRITING_TASK1) {
    const itemDoc = lookups?.writingTask1ById?.get(taskRefId) || null;
    const topic = normalizeText(
      itemDoc?.questionTopic || itemDoc?.title || taskLabel || taskRefId,
      "",
      280,
    );
    return `Writing Task 1 - ${topic}`;
  }

  if (taskCategory === RESULT_CATEGORIES.WRITING_TASK2) {
    const itemDoc = lookups?.writingTask2ById?.get(taskRefId) || null;
    const topic = normalizeText(
      itemDoc?.questionTopic || itemDoc?.title || taskLabel || taskRefId,
      "",
      280,
    );
    return `Writing Task 2 - ${topic}`;
  }

  if (taskCategory === RESULT_CATEGORIES.READING_FULL_TEST) {
    const testDoc = lookups?.readingTestsById?.get(taskRefId) || null;
    const fromNumbers =
      Number.isFinite(Number(testDoc?.book)) &&
      Number.isFinite(Number(testDoc?.test))
        ? `Cambridge ${Number(testDoc.book)} Test ${Number(testDoc.test)}`
        : "";
    const title = normalizeText(
      testDoc?.title || fromNumbers || taskLabel || taskRefId,
      "",
      240,
    );
    return `Reading Full Test - ${title}`;
  }

  if (taskCategory === RESULT_CATEGORIES.LISTENING_FULL_TEST) {
    const testDoc = lookups?.listeningTestsById?.get(taskRefId) || null;
    const title = normalizeText(
      testDoc?.title || taskLabel || taskRefId,
      "",
      240,
    );
    return `Listening Full Test - ${title}`;
  }

  if (taskCategory === RESULT_CATEGORIES.READING_QUESTION_TASK) {
    const passageDoc = lookups?.readingPassagesById?.get(taskRefId) || null;
    const passageTitle = normalizeText(
      passageDoc?.title ||
        passageDoc?.passageTitle ||
        passageDoc?.heading ||
        taskLabel ||
        taskRefId,
      "",
      220,
    );
    if (sourceType === "reading_question_family") {
      const familyLabel = toReadableLabel(
        payloadSummary?.practiceKey || "question family",
      );
      return `Reading Question Task - ${familyLabel} - ${passageTitle}`;
    }
    return `Reading Question Task - ${passageTitle}`;
  }

  if (taskCategory === RESULT_CATEGORIES.LISTENING_QUESTION_TASK) {
    if (sourceType === "listening_part" || taskRefId.includes("::part:")) {
      const partMeta = parseListeningPartTaskRefId(taskRefId);
      const testDoc = lookups?.listeningTestsById?.get(partMeta.testId) || null;
      const testTitle = normalizeText(
        testDoc?.title || partMeta.testId || taskLabel || taskRefId,
        "",
        220,
      );
      const partLabel = Number.isFinite(partMeta.partNumber)
        ? `Part ${partMeta.partNumber}`
        : "Part";
      return `Listening Question Task - ${partLabel} - ${testTitle}`;
    }

    const blockDoc = lookups?.listeningBlocksById?.get(taskRefId) || null;
    const blockTitle = normalizeText(
      blockDoc?.display?.title || taskLabel || taskRefId,
      "",
      220,
    );
    const family = normalizeText(
      blockDoc?.questionFamily ||
        payloadSummary?.practiceKey ||
        "question type",
      "",
      120,
    );
    return `Listening Question Task - ${toReadableLabel(family)} - ${blockTitle}`;
  }

  return taskLabel || `${toReadableLabel(taskType)} - ${taskRefId}`;
}

function buildTaskMetadata(rawAttempt = {}, lookups = {}) {
  const taskType = normalizeTaskType(rawAttempt?.taskType);
  const taskRefId = normalizeTaskRefId(rawAttempt?.taskRefId);
  const sourceType = normalizeSourceType(rawAttempt?.sourceType);
  const taskCategory = resolveAttemptTaskCategory(
    taskType,
    sourceType,
    taskRefId,
  );
  const payloadSummary = extractAttemptPayloadSummary(rawAttempt);

  if (taskCategory === RESULT_CATEGORIES.READING_FULL_TEST) {
    const doc = lookups?.readingTestsById?.get(taskRefId) || {};
    return {
      testTitle: normalizeText(doc?.title, "", 220),
      module: normalizeText(doc?.module, "", 120),
      book: Number.isFinite(Number(doc?.book)) ? Number(doc.book) : null,
      test: Number.isFinite(Number(doc?.test)) ? Number(doc.test) : null,
    };
  }

  if (taskCategory === RESULT_CATEGORIES.LISTENING_FULL_TEST) {
    const doc = lookups?.listeningTestsById?.get(taskRefId) || {};
    return {
      testTitle: normalizeText(doc?.title, "", 220),
      module: normalizeText(doc?.module, "", 120),
      section: normalizeText(doc?.section, "", 120),
    };
  }

  if (taskCategory === RESULT_CATEGORIES.READING_QUESTION_TASK) {
    const doc = lookups?.readingPassagesById?.get(taskRefId) || {};
    return {
      passageTitle: normalizeText(
        doc?.title || doc?.passageTitle || doc?.heading,
        "",
        220,
      ),
      questionFamily: toReadableLabel(payloadSummary?.practiceKey || ""),
    };
  }

  if (taskCategory === RESULT_CATEGORIES.LISTENING_QUESTION_TASK) {
    if (sourceType === "listening_part" || taskRefId.includes("::part:")) {
      const partMeta = parseListeningPartTaskRefId(taskRefId);
      const testDoc = lookups?.listeningTestsById?.get(partMeta.testId) || {};
      return {
        testId: partMeta.testId,
        testTitle: normalizeText(testDoc?.title, "", 220),
        partNumber: partMeta.partNumber,
      };
    }

    const doc = lookups?.listeningBlocksById?.get(taskRefId) || {};
    return {
      blockTitle: normalizeText(doc?.display?.title, "", 220),
      blockType: normalizeSourceType(doc?.blockType),
      questionFamily: normalizeSourceType(
        doc?.questionFamily || payloadSummary?.practiceKey,
      ),
    };
  }

  if (taskCategory === RESULT_CATEGORIES.WRITING_TASK1) {
    const doc = lookups?.writingTask1ById?.get(taskRefId) || {};
    return {
      questionTopic: normalizeText(doc?.questionTopic || doc?.title, "", 300),
      visualType: normalizeSourceType(doc?.visualType),
    };
  }

  if (taskCategory === RESULT_CATEGORIES.WRITING_TASK2) {
    const doc = lookups?.writingTask2ById?.get(taskRefId) || {};
    return {
      questionTopic: normalizeText(doc?.questionTopic || doc?.title, "", 300),
      essayType: normalizeSourceType(doc?.essayType),
    };
  }

  return {};
}

function buildAttemptNavigation(attempt) {
  const taskCategory = normalizeText(
    attempt?.taskCategory,
    "",
    80,
  ).toLowerCase();
  const taskRefId = normalizeTaskRefId(attempt?.taskRefId);
  const safeTaskRefId = encodeURIComponent(taskRefId || "");
  const analysisId = normalizeTaskRefId(attempt?.analysisId);
  const analysisQuery = analysisId
    ? `&analysisId=${encodeURIComponent(analysisId)}`
    : "";

  if (taskCategory === RESULT_CATEGORIES.WRITING_TASK1) {
    return {
      type: "writing_redirect",
      route: `/student/tests/writingTask1/result?set=${safeTaskRefId}${analysisQuery}`,
      analysisId,
    };
  }

  if (taskCategory === RESULT_CATEGORIES.WRITING_TASK2) {
    return {
      type: "writing_redirect",
      route: `/student/tests/writingTask2/result?set=${safeTaskRefId}${analysisQuery}`,
      analysisId,
    };
  }

  const taskType = normalizeTaskType(attempt?.taskType);
  const domain = taskType === "reading" ? "reading" : "listening";
  const taskMode = resolveTaskMode(taskCategory);
  const groupAttemptNumber = Number.isFinite(
    Number(attempt?.groupAttemptNumber),
  )
    ? Number(attempt.groupAttemptNumber)
    : 1;
  const sourceType = encodeURIComponent(
    normalizeText(attempt?.sourceType, "", 120),
  );
  const taskGroupId = encodeURIComponent(
    normalizeText(attempt?.taskGroupId, "", 420),
  );
  return {
    type: "results_history",
    route: `/student/results/${domain}/${taskMode}/${safeTaskRefId}/attempt-${groupAttemptNumber}?sourceType=${sourceType}&taskGroupId=${taskGroupId}`,
    analysisId: "",
  };
}

function summarizeAttemptFromDoc(rawAttempt = {}, lookups = {}) {
  const taskType = normalizeTaskType(rawAttempt?.taskType);
  const taskRefId = normalizeTaskRefId(rawAttempt?.taskRefId);
  const sourceType = normalizeSourceType(rawAttempt?.sourceType);
  const taskCategory = resolveAttemptTaskCategory(
    taskType,
    sourceType,
    taskRefId,
  );
  const groupSourceType = resolveGroupSourceType(taskCategory, sourceType);
  const taskGroupId = buildTaskGroupId({
    taskCategory,
    sourceType: groupSourceType,
    taskRefId,
  });
  const score = summarizeScore(rawAttempt?.score || {});
  const payloadSummary = extractAttemptPayloadSummary(rawAttempt);
  const analysisId = extractWritingAnalysisId(rawAttempt);

  return {
    attemptId: normalizeTaskRefId(rawAttempt?._id),
    taskGroupId,
    taskCategory,
    taskCategoryLabel:
      RESULTS_CENTER_FILTER_LABELS[taskCategory] ||
      toReadableLabel(taskCategory),
    taskType,
    taskRefId,
    sourceType: groupSourceType,
    originalSourceType: sourceType,
    taskMode: resolveTaskMode(taskCategory),
    readableTitle: buildReadableTaskTitle(rawAttempt, lookups),
    taskMeta: buildTaskMetadata(rawAttempt, lookups),
    attemptCategory: normalizeAttemptCategory(rawAttempt?.attemptCategory),
    status: normalizeText(rawAttempt?.status, "completed", 40),
    attemptNumber: Number.isFinite(Number(rawAttempt?.attemptNumber))
      ? Number(rawAttempt.attemptNumber)
      : 1,
    submitReason: normalizeText(rawAttempt?.submitReason, "manual", 80),
    forceReason: normalizeText(rawAttempt?.forceReason, "", 240),
    isAutoSubmitted: Boolean(rawAttempt?.isAutoSubmitted),
    submittedAt: toSafeIsoDate(
      rawAttempt?.submittedAt || rawAttempt?.createdAt,
    ),
    totalTimeSpentSeconds: Math.max(
      0,
      Math.round(Number(rawAttempt?.totalTimeSpentSeconds) || 0),
    ),
    totalTimeSpentLabel: formatDurationLabel(rawAttempt?.totalTimeSpentSeconds),
    score,
    scoreLabel: buildScoreLabel(score),
    payloadSummary,
    analysisId,
    sourceRefs:
      rawAttempt?.sourceRefs && typeof rawAttempt.sourceRefs === "object"
        ? rawAttempt.sourceRefs
        : {},
  };
}

function assignStableGroupAttemptNumbers(attempts = []) {
  const safeAttempts = Array.isArray(attempts) ? [...attempts] : [];
  const chronological = safeAttempts.sort((left, right) => {
    const leftTime = new Date(left?.submittedAt || 0).valueOf();
    const rightTime = new Date(right?.submittedAt || 0).valueOf();
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String(left?.attemptId || "").localeCompare(
      String(right?.attemptId || ""),
    );
  });

  chronological.forEach((attempt, index) => {
    // eslint-disable-next-line no-param-reassign
    attempt.groupAttemptNumber = index + 1;
  });

  return chronological
    .sort((left, right) => {
      const rightTime = new Date(right?.submittedAt || 0).valueOf();
      const leftTime = new Date(left?.submittedAt || 0).valueOf();
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }
      return String(right?.attemptId || "").localeCompare(
        String(left?.attemptId || ""),
      );
    })
    .map((attempt) => ({
      ...attempt,
      navigation: buildAttemptNavigation(attempt),
    }));
}

function buildGroupSummary(group) {
  const attempts = assignStableGroupAttemptNumbers(group?.attempts || []);
  const latestAttempt = attempts[0] || null;
  const attemptCount = attempts.length;
  const attemptCategoryBreakdown = attempts.reduce(
    (acc, attempt) => {
      if (attempt?.attemptCategory === "daily") {
        acc.daily += 1;
      } else {
        acc.additional += 1;
      }
      return acc;
    },
    { daily: 0, additional: 0 },
  );

  return {
    taskGroupId: group.taskGroupId,
    taskCategory: group.taskCategory,
    taskCategoryLabel:
      RESULTS_CENTER_FILTER_LABELS[group.taskCategory] ||
      toReadableLabel(group.taskCategory),
    taskType: group.taskType,
    taskRefId: group.taskRefId,
    sourceType: group.sourceType,
    readableTitle: group.readableTitle,
    taskMode: group.taskMode,
    taskMeta: group.taskMeta || {},
    attemptCount,
    attemptCategoryBreakdown,
    latestAttempt,
    latestScore: latestAttempt?.score || {},
    latestScoreLabel: latestAttempt?.scoreLabel || "Completed",
    latestTimeSpentSeconds: Number(latestAttempt?.totalTimeSpentSeconds || 0),
    latestSubmittedAt: latestAttempt?.submittedAt || null,
    navigation: latestAttempt?.navigation || {
      route: "/student/results",
      type: "results_history",
    },
    attempts,
  };
}

async function fetchCompletedAttemptsForStudent(studentUserId) {
  const safeStudentUserId = normalizeStudentUserId(studentUserId);
  if (!safeStudentUserId) {
    throw new Error("studentUserId is required.");
  }

  return StudentTaskAttempt.find({
    studentUserId: safeStudentUserId,
    status: "completed",
  })
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .lean();
}

async function buildGroupedResults(studentUserId) {
  const rawAttempts = await fetchCompletedAttemptsForStudent(studentUserId);
  if (!Array.isArray(rawAttempts) || rawAttempts.length === 0) {
    return {
      groupedResults: [],
      rawAttempts: [],
    };
  }

  const lookups = await buildTaskMetadataLookups(rawAttempts);
  const groupMap = new Map();

  rawAttempts.forEach((rawAttempt) => {
    const attempt = summarizeAttemptFromDoc(rawAttempt, lookups);
    const existing = groupMap.get(attempt.taskGroupId) || {
      taskGroupId: attempt.taskGroupId,
      taskCategory: attempt.taskCategory,
      taskType: attempt.taskType,
      taskRefId: attempt.taskRefId,
      sourceType: attempt.sourceType,
      readableTitle: attempt.readableTitle,
      taskMode: attempt.taskMode,
      taskMeta: attempt.taskMeta || {},
      attempts: [],
    };

    existing.attempts.push(attempt);
    if (!existing.readableTitle) {
      existing.readableTitle = attempt.readableTitle;
    }
    groupMap.set(attempt.taskGroupId, existing);
  });

  const groupedResults = Array.from(groupMap.values())
    .map((group) => buildGroupSummary(group))
    .sort(
      (left, right) =>
        new Date(right?.latestSubmittedAt || 0).valueOf() -
        new Date(left?.latestSubmittedAt || 0).valueOf(),
    );

  return {
    groupedResults,
    rawAttempts,
  };
}

function buildFilterSummaries(groupedResults = []) {
  const counts = RESULTS_CENTER_FILTER_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});

  (Array.isArray(groupedResults) ? groupedResults : []).forEach((group) => {
    const category = normalizeText(group?.taskCategory, "", 80).toLowerCase();
    if (counts[category] !== undefined) {
      counts[category] += 1;
    }
    if (
      category === RESULT_CATEGORIES.READING_QUESTION_TASK ||
      category === RESULT_CATEGORIES.LISTENING_QUESTION_TASK
    ) {
      counts.question_type_task += 1;
    }
    if (isPartByPartResult(group)) {
      counts.part_by_part += 1;
    }
  });
  counts.all = (Array.isArray(groupedResults) ? groupedResults : []).length;

  return RESULTS_CENTER_FILTER_KEYS.map((key) => ({
    key,
    label: RESULTS_CENTER_FILTER_LABELS[key] || toReadableLabel(key),
    count: Number(counts[key] || 0),
  }));
}

async function listResultsCenterGroups(studentUserId, options = {}) {
  const activeFilter = normalizeResultsCenterFilter(options?.category);
  const { groupedResults } = await buildGroupedResults(studentUserId);
  const filters = buildFilterSummaries(groupedResults);
  const groups = groupedResults.filter((group) => doesGroupMatchFilter(group, activeFilter));

  return {
    activeFilter,
    filters,
    count: groups.length,
    groups,
  };
}

async function listResultGroupAttempts(studentUserId, options = {}) {
  const parsedGroup = parseTaskGroupId(options?.taskGroupId);
  if (!parsedGroup) {
    const error = new Error("Invalid taskGroupId.");
    error.httpStatus = 400;
    throw error;
  }

  const safeStudentUserId = normalizeStudentUserId(studentUserId);
  const rawAttempts = await StudentTaskAttempt.find({
    studentUserId: safeStudentUserId,
    status: "completed",
    taskType: parsedGroup.taskType,
    taskRefId: parsedGroup.taskRefId,
  })
    .sort({ submittedAt: -1, createdAt: -1, _id: -1 })
    .lean();

  if (!Array.isArray(rawAttempts) || rawAttempts.length === 0) {
    const error = new Error(
      "No completed attempts were found for this task group.",
    );
    error.httpStatus = 404;
    throw error;
  }

  const lookups = await buildTaskMetadataLookups(rawAttempts);
  const attempts = rawAttempts
    .map((rawAttempt) => summarizeAttemptFromDoc(rawAttempt, lookups))
    .filter(
      (attempt) =>
        attempt.taskCategory === parsedGroup.taskCategory &&
        attempt.sourceType === parsedGroup.sourceType,
    );

  if (attempts.length === 0) {
    const error = new Error(
      "No completed attempts were found for this specific task source.",
    );
    error.httpStatus = 404;
    throw error;
  }

  const groupSummary = buildGroupSummary({
    ...parsedGroup,
    readableTitle:
      attempts[0]?.readableTitle ||
      `${toReadableLabel(parsedGroup.taskType)} - ${parsedGroup.taskRefId}`,
    taskType: parsedGroup.taskType,
    attempts,
    taskMeta: attempts[0]?.taskMeta || {},
  });

  const sort = normalizeText(options?.sort, "desc", 12).toLowerCase();
  const orderedAttempts =
    sort === "asc"
      ? [...groupSummary.attempts].sort(
          (left, right) =>
            Number(left?.groupAttemptNumber || 0) -
            Number(right?.groupAttemptNumber || 0),
        )
      : groupSummary.attempts;

  return {
    taskGroupId: groupSummary.taskGroupId,
    taskCategory: groupSummary.taskCategory,
    taskCategoryLabel: groupSummary.taskCategoryLabel,
    taskType: groupSummary.taskType,
    taskRefId: groupSummary.taskRefId,
    sourceType: groupSummary.sourceType,
    readableTitle: groupSummary.readableTitle,
    taskMode: groupSummary.taskMode,
    taskMeta: groupSummary.taskMeta,
    attemptCount: groupSummary.attemptCount,
    attemptCategoryBreakdown: groupSummary.attemptCategoryBreakdown,
    latestAttempt: groupSummary.latestAttempt,
    attempts: orderedAttempts,
  };
}

function parseAttemptReference(attemptRefInput) {
  const safe = normalizeText(attemptRefInput, "", 120);
  if (!safe) {
    return { attemptNumber: null, attemptId: "" };
  }

  const slugMatch = safe.match(/^attempt-(\d+)$/i);
  if (slugMatch) {
    const parsed = Number.parseInt(String(slugMatch[1] || ""), 10);
    return {
      attemptNumber: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
      attemptId: "",
    };
  }

  const parsedDirect = Number.parseInt(safe, 10);
  if (
    Number.isFinite(parsedDirect) &&
    String(parsedDirect) === safe &&
    parsedDirect > 0
  ) {
    return {
      attemptNumber: parsedDirect,
      attemptId: "",
    };
  }

  return {
    attemptNumber: null,
    attemptId: safe,
  };
}

function buildWeakAreasFromIncorrectItems(incorrectItems = []) {
  const buckets = new Map();
  (Array.isArray(incorrectItems) ? incorrectItems : []).forEach((item) => {
    const key = toReadableLabel(
      normalizeText(
        item?.questionFamily || item?.blockType || item?.blockTitle,
        "Unknown question type",
        120,
      ),
    );
    const previous = buckets.get(key) || 0;
    buckets.set(key, previous + 1);
  });

  return Array.from(buckets.entries())
    .map(([label, incorrectCount]) => ({ label, incorrectCount }))
    .sort(
      (left, right) =>
        Number(right.incorrectCount || 0) - Number(left.incorrectCount || 0),
    )
    .slice(0, 8);
}

async function enrichWritingAttemptDetail(attempt, studentUserId) {
  const analysisId = normalizeTaskRefId(attempt?.analysisId);
  if (!analysisId) {
    return null;
  }

  const taskCategory = normalizeText(
    attempt?.taskCategory,
    "",
    80,
  ).toLowerCase();
  if (
    taskCategory !== RESULT_CATEGORIES.WRITING_TASK1 &&
    taskCategory !== RESULT_CATEGORIES.WRITING_TASK2
  ) {
    return null;
  }

  const query = { _id: analysisId };
  const model =
    taskCategory === RESULT_CATEGORIES.WRITING_TASK1
      ? WritingTask1Analysis
      : WritingTask2Analysis;
  const analysis = await model
    .findOne(query)
    .select({
      _id: 1,
      studentUserId: 1,
      status: 1,
      overallBand: 1,
      summary: 1,
      diagnosis: 1,
      criteriaScores: 1,
      wordsCount: 1,
      timeSpentSeconds: 1,
      submittedAt: 1,
      failureReason: 1,
    })
    .lean();

  if (!analysis) {
    return null;
  }

  const ownerId = normalizeStudentUserId(analysis?.studentUserId);
  if (ownerId && ownerId !== normalizeStudentUserId(studentUserId)) {
    return null;
  }

  return {
    id: normalizeTaskRefId(analysis?._id),
    status: normalizeText(analysis?.status, "", 40).toLowerCase(),
    overallBand: Number.isFinite(Number(analysis?.overallBand))
      ? Number(analysis.overallBand)
      : null,
    summary: normalizeText(analysis?.summary, "", 400),
    diagnosis:
      analysis?.diagnosis && typeof analysis.diagnosis === "object"
        ? analysis.diagnosis
        : {},
    criteriaScores:
      analysis?.criteriaScores && typeof analysis.criteriaScores === "object"
        ? analysis.criteriaScores
        : {},
    wordsCount: Number.isFinite(Number(analysis?.wordsCount))
      ? Number(analysis.wordsCount)
      : null,
    timeSpentSeconds: Number.isFinite(Number(analysis?.timeSpentSeconds))
      ? Number(analysis.timeSpentSeconds)
      : null,
    submittedAt: toSafeIsoDate(analysis?.submittedAt),
    failureReason: normalizeText(analysis?.failureReason, "", 240),
  };
}

async function getResultGroupAttemptDetail(studentUserId, options = {}) {
  const attemptsPayload = await listResultGroupAttempts(studentUserId, {
    taskGroupId: options?.taskGroupId,
    sort: "desc",
  });

  const { attemptNumber, attemptId } = parseAttemptReference(
    options?.attemptRef || options?.attemptNumber || options?.attemptId,
  );
  const attempts = Array.isArray(attemptsPayload?.attempts)
    ? attemptsPayload.attempts
    : [];
  const latestAttempt = attempts[0] || null;

  let activeAttempt = latestAttempt;
  if (attemptId) {
    activeAttempt =
      attempts.find(
        (attempt) => String(attempt?.attemptId || "") === attemptId,
      ) || activeAttempt;
  } else if (Number.isFinite(attemptNumber) && attemptNumber > 0) {
    activeAttempt =
      attempts.find(
        (attempt) =>
          Number(attempt?.groupAttemptNumber) === Number(attemptNumber) ||
          Number(attempt?.attemptNumber) === Number(attemptNumber),
      ) || activeAttempt;
  }

  if (!activeAttempt) {
    const error = new Error("No attempt detail found.");
    error.httpStatus = 404;
    throw error;
  }

  const evaluation = activeAttempt?.payloadSummary?.evaluation || {};
  const incorrectItems = Array.isArray(evaluation?.incorrectItems)
    ? evaluation.incorrectItems
    : [];
  const weakAreas = buildWeakAreasFromIncorrectItems(incorrectItems);
  const writingAnalysis = await enrichWritingAttemptDetail(
    activeAttempt,
    studentUserId,
  );

  return {
    ...attemptsPayload,
    activeAttemptRef: {
      attemptId: activeAttempt.attemptId,
      groupAttemptNumber: Number(activeAttempt?.groupAttemptNumber || 1),
      attemptNumber: Number(activeAttempt?.attemptNumber || 1),
    },
    activeAttempt: {
      ...activeAttempt,
      writingAnalysis,
    },
    detailSummary: {
      evaluation,
      passageTiming: Array.isArray(activeAttempt?.payloadSummary?.passageTiming)
        ? activeAttempt.payloadSummary.passageTiming
        : [],
      blockResults: Array.isArray(activeAttempt?.payloadSummary?.blockResults)
        ? activeAttempt.payloadSummary.blockResults
        : [],
      weakAreas,
    },
  };
}

async function getWritingResultRedirectMeta(studentUserId, options = {}) {
  const detail = await getResultGroupAttemptDetail(studentUserId, options);
  const taskCategory = normalizeText(
    detail?.taskCategory,
    "",
    80,
  ).toLowerCase();
  if (
    taskCategory !== RESULT_CATEGORIES.WRITING_TASK1 &&
    taskCategory !== RESULT_CATEGORIES.WRITING_TASK2
  ) {
    const error = new Error(
      "Writing redirect is only available for writing task groups.",
    );
    error.httpStatus = 400;
    throw error;
  }

  const activeAttempt = detail?.activeAttempt || {};
  const analysisId = normalizeTaskRefId(activeAttempt?.analysisId);
  const taskRefId = normalizeTaskRefId(detail?.taskRefId);
  const safeTaskRefId = encodeURIComponent(taskRefId || "");
  const analysisQuery = analysisId
    ? `&analysisId=${encodeURIComponent(analysisId)}`
    : "";
  const route =
    taskCategory === RESULT_CATEGORIES.WRITING_TASK1
      ? `/student/tests/writingTask1/result?set=${safeTaskRefId}${analysisQuery}`
      : `/student/tests/writingTask2/result?set=${safeTaskRefId}${analysisQuery}`;

  return {
    taskGroupId: detail.taskGroupId,
    taskCategory,
    taskRefId,
    attemptId: normalizeTaskRefId(activeAttempt?.attemptId),
    groupAttemptNumber: Number(activeAttempt?.groupAttemptNumber || 1),
    analysisId,
    route,
  };
}

module.exports = {
  RESULT_CATEGORIES,
  RESULTS_CENTER_FILTER_KEYS,
  RESULTS_CENTER_FILTER_LABELS,
  normalizeResultsCenterFilter,
  buildTaskGroupId,
  parseTaskGroupId,
  listResultsCenterGroups,
  listResultGroupAttempts,
  getResultGroupAttemptDetail,
  getWritingResultRedirectMeta,
};
