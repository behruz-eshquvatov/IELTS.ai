const mongoose = require("mongoose");
const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const ListeningTest = require("../models/listeningTestModel");
const ListeningBlock = require("../models/listeningBlockModel");
const WritingTask1Item = require("../models/writingTask1ItemModel");
const WritingTask2Item = require("../models/writingTask2ItemModel");

const READING_TESTS_COLLECTION = "reading_tests";
const READING_PASSAGES_COLLECTION = "reading_passages";
const READING_BLOCKS_COLLECTION = "reading_blocks";
const DEFAULT_LISTENING_BLOCKS_COLLECTION = ListeningBlock.collection.name || "listening_blocks";
const LEGACY_LISTENING_BLOCKS_COLLECTION = "listeninig_blocks";

const READING_PRACTICE_FAMILY_MAP = {
  multiple_choice: ["multiple_choice"],
  binary_judgement: ["binary_judgement"],
  matching: ["matching"],
  gap_fill: ["gap_fill"],
  short_answer: ["short_answer"],
  diagram_labeling: ["diagram_labeling"],
};

const READING_PRACTICE_ALIASES = {
  "multiple-choice": "multiple_choice",
  "binary-judgement": "binary_judgement",
  "gap-fill": "gap_fill",
  "short-answer-questions": "short_answer",
  "diagram-label-completion": "diagram_labeling",
  tfng: "binary_judgement",
  yng: "binary_judgement",
  headings: "matching",
  "matching-info": "matching",
  "matching-features": "matching",
  "matching-sentence-endings": "matching",
  "multiple-matching": "matching",
  summary: "gap_fill",
  "sentence-completion": "gap_fill",
  "short-answer": "short_answer",
  diagram: "diagram_labeling",
};

const LISTENING_PRACTICE_BLOCK_TYPE_MAP = {
  multiple_choice: ["multiple_choice_single", "multiple_choice_multi"],
  matching: ["matching"],
  gap_fill: ["form_completion", "note_completion", "table_completion", "sentence_completion"],
  map_diagram_labeling: ["map_labeling", "diagram_labeling"],
};

const LISTENING_PRACTICE_ALIASES = {
  "multiple-choice": "multiple_choice",
  "gap-fill": "gap_fill",
  "map-diagram-labeling": "map_diagram_labeling",
  "map-diagram": "map_diagram_labeling",
  "map-labeling": "map_diagram_labeling",
  "diagram-labeling": "map_diagram_labeling",
  "map/diagram-labeling": "map_diagram_labeling",
  multiple_choice_single: "multiple_choice",
  multiple_choice_multi: "multiple_choice",
  form_completion: "gap_fill",
  note_completion: "gap_fill",
  table_completion: "gap_fill",
  sentence_completion: "gap_fill",
  map_labeling: "map_diagram_labeling",
  diagram_labeling: "map_diagram_labeling",
};

function normalizeText(value, fallback = "", maxLength = 240) {
  const normalized = String(value || "").trim().slice(0, maxLength);
  return normalized || String(fallback || "").trim().slice(0, maxLength);
}

function normalizeTaskRefId(value) {
  return normalizeText(value, "", 200);
}

function normalizeTaskType(value) {
  const safe = normalizeText(value, "", 80).toLowerCase();
  return ["reading", "listening", "writing_task1", "writing_task2"].includes(safe) ? safe : "";
}

function normalizeSourceType(value) {
  return normalizeText(value, "", 120).toLowerCase().replace(/\s+/g, "_");
}

function normalizeStudentUserId(value) {
  return normalizeText(value, "", 120);
}

function toIsoDate(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toISOString();
}

function toFiniteNumber(value, fallback = Number.NaN) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toProgressPayload(entry = {}, sequenceOrder = 1) {
  const status = ["locked", "available", "completed"].includes(entry?.status)
    ? entry.status
    : "locked";
  return {
    sequenceOrder: Math.max(1, Number(sequenceOrder) || 1),
    status,
    accessStatus: status === "locked" ? "locked" : "unlocked",
    isLocked: status === "locked",
    isAvailable: status === "available",
    isCompleted: status === "completed",
    completedAt: toIsoDate(entry?.completedAt),
    latestAttemptNumber: Number.isFinite(Number(entry?.attemptNumber))
      ? Number(entry.attemptNumber)
      : null,
  };
}

function extractPracticeKeyFromAttempt(attempt = {}) {
  const payload = attempt?.payload && typeof attempt.payload === "object" ? attempt.payload : {};
  const submission = payload?.submission && typeof payload.submission === "object" ? payload.submission : {};
  return normalizeSourceType(payload?.practiceKey || submission?.practiceKey);
}

function normalizeReadingPracticeKey(value) {
  const safe = normalizeSourceType(value);
  const resolved = READING_PRACTICE_ALIASES[safe] || safe;
  return READING_PRACTICE_FAMILY_MAP[resolved] ? resolved : "";
}

function normalizeListeningPracticeKey(value) {
  const safe = normalizeSourceType(value);
  const resolved = LISTENING_PRACTICE_ALIASES[safe] || safe;
  return LISTENING_PRACTICE_BLOCK_TYPE_MAP[resolved] ? resolved : "";
}

function compareReadingLikeDocs(left, right) {
  const leftBook = toFiniteNumber(left?.book, Number.NaN);
  const rightBook = toFiniteNumber(right?.book, Number.NaN);
  if (Number.isFinite(leftBook) && Number.isFinite(rightBook) && leftBook !== rightBook) {
    return leftBook - rightBook;
  }

  const leftTest = toFiniteNumber(left?.test, Number.NaN);
  const rightTest = toFiniteNumber(right?.test, Number.NaN);
  if (Number.isFinite(leftTest) && Number.isFinite(rightTest) && leftTest !== rightTest) {
    return leftTest - rightTest;
  }

  const leftPassage = toFiniteNumber(left?.passageNumber, Number.NaN);
  const rightPassage = toFiniteNumber(right?.passageNumber, Number.NaN);
  if (Number.isFinite(leftPassage) && Number.isFinite(rightPassage) && leftPassage !== rightPassage) {
    return leftPassage - rightPassage;
  }

  const leftCreatedAt = new Date(left?.createdAt || 0).valueOf();
  const rightCreatedAt = new Date(right?.createdAt || 0).valueOf();
  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return normalizeTaskRefId(left?._id).localeCompare(normalizeTaskRefId(right?._id));
}

function compareCreatedAtAscending(left, right) {
  const leftCreatedAt = new Date(left?.createdAt || 0).valueOf();
  const rightCreatedAt = new Date(right?.createdAt || 0).valueOf();
  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt - rightCreatedAt;
  }

  return normalizeTaskRefId(left?._id).localeCompare(normalizeTaskRefId(right?._id));
}

function buildSequentialStatusMap(orderedTaskRefs = [], completionMap = new Map()) {
  const statusMap = new Map();
  let canUnlockNext = true;

  orderedTaskRefs.forEach((taskRefId) => {
    const completion = completionMap.get(taskRefId) || null;
    let status = "locked";

    if (completion) {
      status = "completed";
    } else if (canUnlockNext) {
      status = "available";
      canUnlockNext = false;
    }

    statusMap.set(taskRefId, {
      status,
      completedAt: completion?.completedAt || null,
      attemptNumber: Number.isFinite(Number(completion?.attemptNumber))
        ? Number(completion.attemptNumber)
        : null,
    });
  });

  return statusMap;
}

async function resolveListeningBlocksCollectionName() {
  const db = mongoose.connection.db;
  const hasDefaultCollection = Boolean(
    await db.listCollections({ name: DEFAULT_LISTENING_BLOCKS_COLLECTION }, { nameOnly: true }).next(),
  );
  if (hasDefaultCollection) {
    const count = await db.collection(DEFAULT_LISTENING_BLOCKS_COLLECTION).estimatedDocumentCount();
    if (count > 0) {
      return DEFAULT_LISTENING_BLOCKS_COLLECTION;
    }
  }

  const hasLegacyCollection = Boolean(
    await db.listCollections({ name: LEGACY_LISTENING_BLOCKS_COLLECTION }, { nameOnly: true }).next(),
  );
  if (hasLegacyCollection) {
    const count = await db.collection(LEGACY_LISTENING_BLOCKS_COLLECTION).estimatedDocumentCount();
    if (count > 0) {
      return LEGACY_LISTENING_BLOCKS_COLLECTION;
    }
  }

  return DEFAULT_LISTENING_BLOCKS_COLLECTION;
}

async function listPublishedReadingFullTaskRefs() {
  const db = mongoose.connection.db;
  const docs = await db.collection(READING_TESTS_COLLECTION).find(
    { status: "published" },
    { projection: { _id: 1, book: 1, test: 1, createdAt: 1 } },
  ).toArray();

  return docs
    .sort(compareReadingLikeDocs)
    .map((doc) => normalizeTaskRefId(doc?._id))
    .filter(Boolean);
}

async function listPublishedReadingPassageTaskRefs(options = {}) {
  const practiceKey = normalizeReadingPracticeKey(options?.practiceKey);
  const questionFamilies = practiceKey ? READING_PRACTICE_FAMILY_MAP[practiceKey] || [] : [];
  const db = mongoose.connection.db;
  const blocksQuery = { status: "published" };
  if (questionFamilies.length > 0) {
    blocksQuery.questionFamily = { $in: questionFamilies };
  }

  const blockDocs = await db.collection(READING_BLOCKS_COLLECTION).find(
    blocksQuery,
    { projection: { passageId: 1 } },
  ).toArray();
  const passageIds = Array.from(
    new Set(blockDocs.map((doc) => normalizeTaskRefId(doc?.passageId)).filter(Boolean)),
  );
  if (passageIds.length === 0) {
    return [];
  }

  const passageDocs = await db.collection(READING_PASSAGES_COLLECTION).find(
    { _id: { $in: passageIds }, status: "published" },
    { projection: { _id: 1, book: 1, test: 1, passageNumber: 1, createdAt: 1 } },
  ).toArray();

  return passageDocs
    .sort(compareReadingLikeDocs)
    .map((doc) => normalizeTaskRefId(doc?._id))
    .filter(Boolean);
}

async function listPublishedListeningFullTaskRefs() {
  const docs = await ListeningTest.find(
    { status: "published" },
    { _id: 1, createdAt: 1 },
  ).lean();

  return docs
    .sort(compareCreatedAtAscending)
    .map((doc) => normalizeTaskRefId(doc?._id))
    .filter(Boolean);
}

async function listPublishedListeningPartTaskRefs() {
  const tests = await ListeningTest.find(
    { status: "published" },
    { _id: 1, parts: 1, createdAt: 1 },
  ).lean();
  const sortedTests = tests.sort(compareCreatedAtAscending);
  const refs = [];

  sortedTests.forEach((testDoc) => {
    const testId = normalizeTaskRefId(testDoc?._id);
    if (!testId) {
      return;
    }

    const parts = Array.isArray(testDoc?.parts) ? testDoc.parts : [];
    const partNumbers = Array.from(
      new Set(
        parts
          .map((part) => Number.parseInt(String(part?.partNumber || ""), 10))
          .filter((number) => Number.isFinite(number) && number > 0),
      ),
    ).sort((left, right) => left - right);

    partNumbers.forEach((partNumber) => {
      refs.push(`${testId}::part:${partNumber}`);
    });
  });

  return refs;
}

async function listPublishedListeningPracticeBlockTaskRefs(options = {}) {
  const practiceKey = normalizeListeningPracticeKey(options?.practiceKey);
  const blockTypes = practiceKey ? LISTENING_PRACTICE_BLOCK_TYPE_MAP[practiceKey] || [] : [];
  const collectionName = await resolveListeningBlocksCollectionName();
  const collection = mongoose.connection.db.collection(collectionName);
  const query = {};
  if (blockTypes.length > 0) {
    query.blockType = { $in: blockTypes };
  }

  const docs = await collection.find(query, { projection: { _id: 1 } }).sort({ _id: 1 }).toArray();
  return docs
    .map((doc) => normalizeTaskRefId(doc?._id))
    .filter(Boolean);
}

async function listPublishedWritingTask1ExtraTaskRefs(options = {}) {
  const visualType = normalizeSourceType(options?.visualType);
  const query = { status: "published" };
  if (visualType) {
    query.visualType = visualType;
  }

  const docs = await WritingTask1Item.find(query, { _id: 1, createdAt: 1 })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  return docs
    .map((doc) => normalizeTaskRefId(doc?._id))
    .filter(Boolean);
}

async function listPublishedWritingTask2ExtraTaskRefs(options = {}) {
  const essayType = normalizeSourceType(options?.essayType);
  const query = { status: "published" };
  if (essayType) {
    query.essayType = essayType;
  }

  const docs = await WritingTask2Item.find(query, { _id: 1, createdAt: 1 })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  return docs
    .map((doc) => normalizeTaskRefId(doc?._id))
    .filter(Boolean);
}

async function buildAdditionalProgressMap(options = {}) {
  const studentUserId = normalizeStudentUserId(options?.studentUserId);
  const taskType = normalizeTaskType(options?.taskType);
  const sourceType = normalizeSourceType(options?.sourceType);
  const practiceKey = normalizeSourceType(options?.practiceKey);
  const orderedTaskRefs = Array.from(
    new Set((Array.isArray(options?.orderedTaskRefs) ? options.orderedTaskRefs : [])
      .map((entry) => normalizeTaskRefId(entry))
      .filter(Boolean)),
  );

  if (!studentUserId || !taskType || orderedTaskRefs.length === 0) {
    return new Map();
  }

  const attempts = await StudentTaskAttempt.find({
    studentUserId,
    attemptCategory: "additional",
    status: "completed",
    taskType,
    taskRefId: { $in: orderedTaskRefs },
  })
    .sort({ submittedAt: 1, createdAt: 1, _id: 1 })
    .lean();

  const completionMap = new Map();
  attempts.forEach((attempt) => {
    const safeRefId = normalizeTaskRefId(attempt?.taskRefId);
    if (!safeRefId) {
      return;
    }

    if (sourceType && normalizeSourceType(attempt?.sourceType) !== sourceType) {
      return;
    }

    if (practiceKey && extractPracticeKeyFromAttempt(attempt) !== practiceKey) {
      return;
    }

    completionMap.set(safeRefId, {
      completedAt: attempt?.submittedAt || attempt?.createdAt || null,
      attemptNumber: Number.isFinite(Number(attempt?.attemptNumber))
        ? Number(attempt.attemptNumber)
        : null,
    });
  });

  return buildSequentialStatusMap(orderedTaskRefs, completionMap);
}

function createAdditionalTaskLockedError(message, details = {}) {
  const error = new Error(
    normalizeText(message, "Complete the previous additional task to unlock this one.", 240),
  );
  error.httpStatus = 403;
  error.code = "additional_task_locked";
  error.details = details;
  return error;
}

function createAdditionalTaskNotFoundError(message, details = {}) {
  const error = new Error(normalizeText(message, "Additional task was not found in progression.", 240));
  error.httpStatus = 404;
  error.code = "additional_task_not_found";
  error.details = details;
  return error;
}

async function resolveAdditionalSequence(options = {}) {
  const taskType = normalizeTaskType(options?.taskType);
  const sourceType = normalizeSourceType(options?.sourceType);
  const taskRefId = normalizeTaskRefId(options?.taskRefId);
  const payload = options?.payload && typeof options.payload === "object" ? options.payload : {};
  const submission = payload?.submission && typeof payload.submission === "object" ? payload.submission : {};

  if (!taskType || !sourceType || !taskRefId) {
    return null;
  }

  if (taskType === "reading" && sourceType === "reading_full") {
    return {
      taskType,
      sourceType,
      practiceKey: "",
      orderedTaskRefs: await listPublishedReadingFullTaskRefs(),
    };
  }

  if (taskType === "reading" && sourceType === "reading_passage") {
    return {
      taskType,
      sourceType,
      practiceKey: "",
      orderedTaskRefs: await listPublishedReadingPassageTaskRefs(),
    };
  }

  if (taskType === "reading" && sourceType === "reading_question_family") {
    const practiceKey = normalizeReadingPracticeKey(payload?.practiceKey || submission?.practiceKey);
    return {
      taskType,
      sourceType,
      practiceKey,
      orderedTaskRefs: await listPublishedReadingPassageTaskRefs({ practiceKey }),
    };
  }

  if (taskType === "listening" && sourceType === "listening_full") {
    return {
      taskType,
      sourceType,
      practiceKey: "",
      orderedTaskRefs: await listPublishedListeningFullTaskRefs(),
    };
  }

  if (taskType === "listening" && sourceType === "listening_part") {
    return {
      taskType,
      sourceType,
      practiceKey: "",
      orderedTaskRefs: await listPublishedListeningPartTaskRefs(),
    };
  }

  if (taskType === "listening" && sourceType === "listening_question_family") {
    const practiceKey = normalizeListeningPracticeKey(payload?.practiceKey || submission?.practiceKey);
    return {
      taskType,
      sourceType,
      practiceKey,
      orderedTaskRefs: await listPublishedListeningPracticeBlockTaskRefs({ practiceKey }),
    };
  }

  if (taskType === "listening" && sourceType === "listening_block") {
    return {
      taskType,
      sourceType,
      practiceKey: "",
      orderedTaskRefs: await listPublishedListeningPracticeBlockTaskRefs(),
    };
  }

  if (taskType === "writing_task1" && sourceType === "writing_task1_extra") {
    const item = await WritingTask1Item.findOne(
      { _id: taskRefId, status: "published" },
      { _id: 1, visualType: 1 },
    ).lean();
    if (!item) {
      return {
        taskType,
        sourceType,
        practiceKey: "",
        orderedTaskRefs: [],
      };
    }

    const visualType = normalizeSourceType(item?.visualType);
    return {
      taskType,
      sourceType,
      practiceKey: "",
      orderedTaskRefs: await listPublishedWritingTask1ExtraTaskRefs({ visualType }),
    };
  }

  if (taskType === "writing_task2" && sourceType === "writing_task2_extra") {
    const item = await WritingTask2Item.findOne(
      { _id: taskRefId, status: "published" },
      { _id: 1, essayType: 1 },
    ).lean();
    if (!item) {
      return {
        taskType,
        sourceType,
        practiceKey: "",
        orderedTaskRefs: [],
      };
    }

    const essayType = normalizeSourceType(item?.essayType);
    return {
      taskType,
      sourceType,
      practiceKey: "",
      orderedTaskRefs: await listPublishedWritingTask2ExtraTaskRefs({ essayType }),
    };
  }

  return null;
}

async function assertAdditionalTaskUnlocked(options = {}) {
  const studentUserId = normalizeStudentUserId(options?.studentUserId);
  const taskType = normalizeTaskType(options?.taskType);
  const taskRefId = normalizeTaskRefId(options?.taskRefId);
  const sourceType = normalizeSourceType(options?.sourceType);
  const payload = options?.payload && typeof options.payload === "object" ? options.payload : {};

  if (!studentUserId || !taskType || !taskRefId || !sourceType) {
    return null;
  }

  const sequence = await resolveAdditionalSequence({
    taskType,
    sourceType,
    taskRefId,
    payload,
  });
  if (!sequence) {
    return null;
  }

  const orderedTaskRefs = Array.isArray(sequence?.orderedTaskRefs) ? sequence.orderedTaskRefs : [];
  if (orderedTaskRefs.length === 0) {
    throw createAdditionalTaskNotFoundError(
      "Additional task is unavailable or not published.",
      { taskType, sourceType, taskRefId },
    );
  }

  const progressMap = await buildAdditionalProgressMap({
    studentUserId,
    taskType: sequence.taskType,
    sourceType: sequence.sourceType,
    practiceKey: sequence.practiceKey,
    orderedTaskRefs,
  });

  const targetState = progressMap.get(taskRefId);
  if (!targetState) {
    throw createAdditionalTaskNotFoundError(
      "Additional task is not part of the active progression sequence.",
      { taskType, sourceType, taskRefId },
    );
  }

  if (targetState.status === "locked") {
    const nextAvailableTaskRef = orderedTaskRefs.find(
      (candidateTaskRefId) => progressMap.get(candidateTaskRefId)?.status === "available",
    ) || "";
    throw createAdditionalTaskLockedError(
      "This additional task is locked. Complete the previous task first.",
      {
        taskType,
        sourceType,
        taskRefId,
        nextAvailableTaskRef,
      },
    );
  }

  return {
    ...toProgressPayload(targetState, Math.max(1, orderedTaskRefs.indexOf(taskRefId) + 1)),
    orderedTaskRefs,
  };
}

module.exports = {
  normalizeReadingPracticeKey,
  normalizeListeningPracticeKey,
  toProgressPayload,
  listPublishedReadingFullTaskRefs,
  listPublishedReadingPassageTaskRefs,
  listPublishedListeningFullTaskRefs,
  listPublishedListeningPartTaskRefs,
  listPublishedListeningPracticeBlockTaskRefs,
  listPublishedWritingTask1ExtraTaskRefs,
  listPublishedWritingTask2ExtraTaskRefs,
  buildAdditionalProgressMap,
  resolveAdditionalSequence,
  assertAdditionalTaskUnlocked,
};
