const mongoose = require("mongoose");
const ListeningTest = require("../models/listeningTestModel");
const ListeningAudio = require("../models/listeningAudioModel");
const { recordStudentTaskAttempt } = require("../services/dailyTaskProgressService");
const {
  toProgressPayload,
  listPublishedListeningFullTaskRefs,
  listPublishedListeningPartTaskRefs,
  buildAdditionalProgressMap,
  assertAdditionalTaskUnlocked,
} = require("../services/additionalTaskProgressService");

const LEGACY_LISTENING_BLOCKS_COLLECTION = "listeninig_blocks";
const DEFAULT_LISTENING_BLOCKS_COLLECTION = "listening_blocks";
const BLOCK_RANGE_ID_PATTERN = /^(.*)_(\d+)-(\d+)$/;
const ATTEMPT_CATEGORIES = ["daily", "additional"];

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeAttemptCategory(value) {
  const safe = normalizeValue(value).toLowerCase();
  return ATTEMPT_CATEGORIES.includes(safe) ? safe : "";
}

function normalizeSourceType(value) {
  return normalizeValue(value).toLowerCase().replace(/\s+/g, "_");
}

function buildPaginationParams(query) {
  const requestedPage = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100);
  return { requestedPage, limit };
}

function buildPartSummary(parts = []) {
  const safeParts = Array.isArray(parts) ? parts : [];
  const totalBlocks = safeParts.reduce((sum, part) => {
    const blocks = Array.isArray(part?.blocks) ? part.blocks.length : 0;
    return sum + blocks;
  }, 0);

  return {
    partsCount: safeParts.length,
    totalBlocks,
  };
}

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseBlockQuestionRange(blockId) {
  const safeBlockId = normalizeValue(blockId);
  if (!safeBlockId) {
    return null;
  }

  const match = safeBlockId.match(BLOCK_RANGE_ID_PATTERN);
  if (!match) {
    return null;
  }

  const start = Number.parseInt(match[2], 10);
  const end = Number.parseInt(match[3], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null;
  }

  return {
    prefix: String(match[1] || "").trim(),
    start,
    end,
  };
}

function toQuestionRange(value) {
  const start = toFiniteNumber(value?.start);
  const end = toFiniteNumber(value?.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return {};
  }

  return { start, end };
}

function resolvePartQuestionRange(part = {}, partBlocks = []) {
  const explicitRange = toQuestionRange(part?.questionRange);
  if (Number.isFinite(explicitRange.start) && Number.isFinite(explicitRange.end)) {
    return explicitRange;
  }

  const starts = partBlocks
    .map((block) => Number(block?.questionRange?.start))
    .filter((value) => Number.isFinite(value));
  const ends = partBlocks
    .map((block) => Number(block?.questionRange?.end))
    .filter((value) => Number.isFinite(value));

  if (!starts.length || !ends.length) {
    return {};
  }

  return {
    start: Math.min(...starts),
    end: Math.max(...ends),
  };
}

function belongsToTestPrefix(blockId, testId) {
  const safeBlockId = normalizeValue(blockId);
  const safeTestId = normalizeValue(testId);
  if (!safeBlockId || !safeTestId) {
    return false;
  }

  return safeBlockId.startsWith(`${safeTestId}_`);
}

function flattenBlockIds(parts = [], testId = "") {
  const ids = [];
  const safeTestId = normalizeValue(testId);
  for (const part of parts || []) {
    const blocks = Array.isArray(part?.blocks) ? part.blocks : [];
    for (const block of blocks) {
      const blockId = normalizeValue(block?.blockId);
      if (blockId) {
        if (safeTestId && !belongsToTestPrefix(blockId, safeTestId)) {
          continue;
        }
        ids.push(blockId);
      }
    }
  }
  return Array.from(new Set(ids));
}

function flattenAudioRefs(parts = [], testId = "") {
  const ids = [];
  const safeTestId = normalizeValue(testId);
  for (const part of parts || []) {
    const blocks = Array.isArray(part?.blocks) ? part.blocks : [];
    for (const block of blocks) {
      const blockId = normalizeValue(block?.blockId);
      if (!blockId) {
        continue;
      }

      if (safeTestId && !belongsToTestPrefix(blockId, safeTestId)) {
        continue;
      }

      const audioRef = normalizeValue(block?.audioRef || blockId);
      if (audioRef) {
        ids.push(audioRef);
      }
    }
  }

  return Array.from(new Set(ids));
}

function comparePartBlocks(left, right) {
  const leftOrder = Number(left?.order);
  const rightOrder = Number(right?.order);
  const leftOrderIsFinite = Number.isFinite(leftOrder);
  const rightOrderIsFinite = Number.isFinite(rightOrder);
  if (leftOrderIsFinite || rightOrderIsFinite) {
    if (leftOrderIsFinite && !rightOrderIsFinite) {
      return -1;
    }

    if (!leftOrderIsFinite && rightOrderIsFinite) {
      return 1;
    }

    const orderDiff = leftOrder - rightOrder;
    if (orderDiff !== 0) {
      return orderDiff;
    }
  }

  const leftStart = Number(left?.questionRange?.start);
  const rightStart = Number(right?.questionRange?.start);
  const leftStartIsFinite = Number.isFinite(leftStart);
  const rightStartIsFinite = Number.isFinite(rightStart);
  if (leftStartIsFinite || rightStartIsFinite) {
    if (leftStartIsFinite && !rightStartIsFinite) {
      return -1;
    }

    if (!leftStartIsFinite && rightStartIsFinite) {
      return 1;
    }

    const startDiff = leftStart - rightStart;
    if (startDiff !== 0) {
      return startDiff;
    }
  }

  const leftEnd = Number(left?.questionRange?.end);
  const rightEnd = Number(right?.questionRange?.end);
  const leftEndIsFinite = Number.isFinite(leftEnd);
  const rightEndIsFinite = Number.isFinite(rightEnd);
  if (leftEndIsFinite || rightEndIsFinite) {
    if (leftEndIsFinite && !rightEndIsFinite) {
      return -1;
    }

    if (!leftEndIsFinite && rightEndIsFinite) {
      return 1;
    }

    const endDiff = leftEnd - rightEnd;
    if (endDiff !== 0) {
      return endDiff;
    }
  }

  return String(left?.blockId || "").localeCompare(String(right?.blockId || ""));
}

function compareParts(left, right) {
  const leftPartNumber = Number(left?.partNumber);
  const rightPartNumber = Number(right?.partNumber);
  const leftPartNumberIsFinite = Number.isFinite(leftPartNumber);
  const rightPartNumberIsFinite = Number.isFinite(rightPartNumber);
  if (leftPartNumberIsFinite || rightPartNumberIsFinite) {
    if (leftPartNumberIsFinite && !rightPartNumberIsFinite) {
      return -1;
    }

    if (!leftPartNumberIsFinite && rightPartNumberIsFinite) {
      return 1;
    }

    const partDiff = leftPartNumber - rightPartNumber;
    if (partDiff !== 0) {
      return partDiff;
    }
  }

  const leftStart = Number(left?.__sortStart);
  const rightStart = Number(right?.__sortStart);
  const leftStartIsFinite = Number.isFinite(leftStart);
  const rightStartIsFinite = Number.isFinite(rightStart);
  if (leftStartIsFinite || rightStartIsFinite) {
    if (leftStartIsFinite && !rightStartIsFinite) {
      return -1;
    }

    if (!leftStartIsFinite && rightStartIsFinite) {
      return 1;
    }

    const startDiff = leftStart - rightStart;
    if (startDiff !== 0) {
      return startDiff;
    }
  }

  return String(left?.partNumber || "").localeCompare(String(right?.partNumber || ""));
}

function enrichTestParts(parts = [], blocksById = new Map(), audioIds = new Set(), testId = "") {
  const safeTestId = normalizeValue(testId);
  return (Array.isArray(parts) ? parts : [])
    .map((part) => {
      const sortedPartBlocks = (Array.isArray(part?.blocks) ? part.blocks : [])
        .map((partBlock) => {
          const blockId = normalizeValue(partBlock.blockId);
          if (safeTestId && !belongsToTestPrefix(blockId, safeTestId)) {
            return null;
          }
          const audioRef = normalizeValue(partBlock?.audioRef || blockId);

          const parsedRange = parseBlockQuestionRange(blockId);
          const blockMeta = blocksById.get(blockId);
          const questionsCount = Array.isArray(blockMeta?.questions) ? blockMeta.questions.length : 0;
          const order = Number.isFinite(Number(partBlock?.order))
            ? Number(partBlock.order)
            : null;

          return {
            blockId,
            audioId: audioRef || blockId,
            audioRef: audioRef || blockId,
            order,
            questionRange: parsedRange
              ? {
                start: parsedRange.start,
                end: parsedRange.end,
              }
              : {},
            hasAudio: audioIds.has(audioRef || blockId),
            blockType: blockMeta?.blockType || "",
            questionFamily: blockMeta?.questionFamily || "",
            displayTitle: blockMeta?.display?.title || "",
            instruction: blockMeta?.instruction || {},
            questionsCount,
          };
        })
        .filter((entry) => Boolean(entry.blockId))
        .sort(comparePartBlocks);

      const questionRange = resolvePartQuestionRange(part, sortedPartBlocks);
      const sortStart = Number.isFinite(Number(questionRange?.start))
        ? Number(questionRange.start)
        : Number(sortedPartBlocks[0]?.questionRange?.start);

      return {
        partNumber: Number.isFinite(Number(part?.partNumber)) ? Number(part.partNumber) : null,
        questionRange,
        blocks: sortedPartBlocks,
        __sortStart: Number.isFinite(sortStart) ? sortStart : null,
      };
    })
    .filter((part) => Number.isFinite(Number(part?.partNumber)))
    .sort(compareParts)
    .map((part) => {
      const nextPart = { ...part };
      delete nextPart.__sortStart;
      return nextPart;
    });
}

function sanitizeListeningEvaluationPayload(value) {
  const safe = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const totalQuestions = Math.max(0, Math.round(Number(safe?.totalQuestions) || 0));
  const correctCount = Math.max(0, Math.round(Number(safe?.correctCount) || 0));
  const incorrectCountFromBody = Number(safe?.incorrectCount);
  const incorrectCount = Number.isFinite(incorrectCountFromBody) && incorrectCountFromBody >= 0
    ? Math.round(incorrectCountFromBody)
    : Math.max(0, totalQuestions - correctCount);
  const percentageFromBody = Number(safe?.percentage);
  const percentage = Number.isFinite(percentageFromBody) && percentageFromBody >= 0
    ? Math.round(percentageFromBody)
    : totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  return {
    totalQuestions,
    correctCount,
    incorrectCount,
    percentage: Math.max(0, Math.min(percentage, 100)),
    band: Number.isFinite(Number(safe?.band))
      ? Math.max(0, Math.min(9, Number(safe.band)))
      : null,
    incorrectItems: Array.isArray(safe?.incorrectItems) ? safe.incorrectItems : [],
  };
}

async function getListeningBlocksCollectionName() {
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

async function listListeningTests(req, res) {
  const status = normalizeValue(req.query.status);
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const { requestedPage, limit } = buildPaginationParams(req.query);
  const total = await ListeningTest.countDocuments(filter);
  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * limit;

  const tests = await ListeningTest.find(filter)
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const studentUserId = normalizeValue(req.auth?.userId);
  const orderedTaskRefs = await listPublishedListeningFullTaskRefs();
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "listening",
      sourceType: "listening_full",
      orderedTaskRefs,
    })
    : new Map();

  const list = tests.map((test, index) => {
    const taskRefId = normalizeValue(test?._id);
    const sequenceOrder = Math.max(1, orderedTaskRefs.indexOf(taskRefId) + 1 || index + 1);
    const progress = toProgressPayload(progressMap.get(taskRefId), sequenceOrder);
    const summary = buildPartSummary(test.parts);
    return {
      _id: test._id,
      title: test.title,
      section: test.section,
      module: test.module,
      totalQuestions: test.totalQuestions,
      status: test.status,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
      progressStatus: progress.status,
      accessStatus: progress.accessStatus,
      progression: progress,
      ...summary,
    };
  });

  return res.json({
    count: list.length,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages,
    },
    tests: list,
  });
}

async function getListeningTestById(req, res) {
  const testId = normalizeValue(req.params.testId);
  const test = await ListeningTest.findById(testId).lean();

  if (!test) {
    return res.status(404).json({
      message: `Listening test '${testId}' not found.`,
    });
  }

  const blockIds = flattenBlockIds(test.parts, test._id);
  const audioBlockIds = flattenAudioRefs(test.parts, test._id);
  const blocksCollectionName = await getListeningBlocksCollectionName();
  const blocksCollection = mongoose.connection.db.collection(blocksCollectionName);
  const blocks = blockIds.length
    ? await blocksCollection
      .find(
        { _id: { $in: blockIds } },
        {
          projection: {
            _id: 1,
            blockType: 1,
            questionFamily: 1,
            instruction: 1,
            "display.title": 1,
            questions: 1,
          },
        },
      )
      .toArray()
    : [];
  const blocksById = new Map(blocks.map((block) => [block._id, block]));

  const audioDocs = audioBlockIds.length
    ? await ListeningAudio.find({ _id: { $in: audioBlockIds } }, { _id: 1 }).lean()
    : [];
  const audioIds = new Set(audioDocs.map((audio) => audio._id));

  const enrichedParts = enrichTestParts(test.parts, blocksById, audioIds, test._id);
  const studentUserId = normalizeValue(req.auth?.userId);
  const orderedTaskRefs = await listPublishedListeningFullTaskRefs();
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "listening",
      sourceType: "listening_full",
      orderedTaskRefs,
    })
    : new Map();
  const sequenceOrder = Math.max(1, orderedTaskRefs.indexOf(testId) + 1);
  const progress = toProgressPayload(progressMap.get(testId), sequenceOrder);

  return res.json({
    test: {
      ...test,
      parts: enrichedParts,
      progressStatus: progress.status,
      accessStatus: progress.accessStatus,
      progression: progress,
    },
    sourceCollection: {
      listeningTests: "listening_tests",
      listeningBlocks: blocksCollectionName,
      listeningAudios: "listening_audios",
    },
  });
}

async function listListeningPartGroups(req, res) {
  const status = normalizeValue(req.query.status);
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const tests = await ListeningTest.find(filter)
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .lean();

  const allBlockIds = tests.flatMap((test) => flattenBlockIds(test?.parts, test?._id));
  const allAudioBlockIds = tests.flatMap((test) => flattenAudioRefs(test?.parts, test?._id));
  const blocksCollectionName = await getListeningBlocksCollectionName();
  const blocksCollection = mongoose.connection.db.collection(blocksCollectionName);

  const blocks = allBlockIds.length
    ? await blocksCollection
      .find(
        { _id: { $in: allBlockIds } },
        {
          projection: {
            _id: 1,
            blockType: 1,
            questionFamily: 1,
            instruction: 1,
            "display.title": 1,
            questions: 1,
          },
        },
      )
      .toArray()
    : [];
  const blocksById = new Map(blocks.map((block) => [block._id, block]));

  const audioDocs = allAudioBlockIds.length
    ? await ListeningAudio.find({ _id: { $in: allAudioBlockIds } }, { _id: 1 }).lean()
    : [];
  const audioIds = new Set(audioDocs.map((audio) => audio._id));

  const groups = tests.flatMap((test) => {
    const enrichedParts = enrichTestParts(test.parts, blocksById, audioIds, test._id);

    return enrichedParts.map((part) => ({
      taskId: `${test._id}::${part.partNumber}`,
      testId: test._id,
      testTitle: test.title || test._id,
      module: test.module || "",
      status: test.status || "",
      partNumber: part.partNumber,
      questionRange: part.questionRange || {},
      blocks: part.blocks,
      blocksCount: part.blocks.length,
      totalQuestionsInBlocks: part.blocks.reduce(
        (sum, block) => sum + (Number(block?.questionsCount) || 0),
        0,
      ),
      updatedAt: test.updatedAt || null,
      createdAt: test.createdAt || null,
    }));
  });
  const studentUserId = normalizeValue(req.auth?.userId);
  const orderedTaskRefs = await listPublishedListeningPartTaskRefs();
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "listening",
      sourceType: "listening_part",
      orderedTaskRefs,
    })
    : new Map();
  const enrichedGroups = groups.map((group, index) => {
    const taskRefId = `${normalizeValue(group?.testId)}::part:${Number(group?.partNumber) || 0}`;
    const sequenceOrder = Math.max(1, orderedTaskRefs.indexOf(taskRefId) + 1 || index + 1);
    const progress = toProgressPayload(progressMap.get(taskRefId), sequenceOrder);
    return {
      ...group,
      progressStatus: progress.status,
      accessStatus: progress.accessStatus,
      progression: progress,
      taskRefId,
    };
  });

  return res.json({
    count: enrichedGroups.length,
    filters: {
      status: status || null,
    },
    groups: enrichedGroups,
    sourceCollection: {
      listeningTests: "listening_tests",
      listeningBlocks: blocksCollectionName,
      listeningAudios: "listening_audios",
    },
  });
}

async function getListeningTestPartById(req, res) {
  const testId = normalizeValue(req.params.testId);
  const partNumber = Number.parseInt(req.params.partNumber, 10);
  if (!Number.isFinite(partNumber) || partNumber <= 0) {
    return res.status(400).json({
      message: "Part number must be a positive number.",
    });
  }

  const status = normalizeValue(req.query.status);
  const filter = { _id: testId };
  if (status) {
    filter.status = status;
  }

  const test = await ListeningTest.findOne(filter).lean();
  if (!test) {
    return res.status(404).json({
      message: `Listening test '${testId}' not found.`,
    });
  }

  const blocksCollectionName = await getListeningBlocksCollectionName();
  const blocksCollection = mongoose.connection.db.collection(blocksCollectionName);
  const blockIds = flattenBlockIds(test.parts, test._id);
  const audioBlockIds = flattenAudioRefs(test.parts, test._id);
  const blocks = blockIds.length
    ? await blocksCollection
      .find(
        { _id: { $in: blockIds } },
        {
          projection: {
            _id: 1,
            blockType: 1,
            questionFamily: 1,
            instruction: 1,
            "display.title": 1,
            questions: 1,
          },
        },
      )
      .toArray()
    : [];
  const blocksById = new Map(blocks.map((block) => [block._id, block]));

  const audioDocs = audioBlockIds.length
    ? await ListeningAudio.find({ _id: { $in: audioBlockIds } }, { _id: 1 }).lean()
    : [];
  const audioIds = new Set(audioDocs.map((audio) => audio._id));

  const enrichedParts = enrichTestParts(test.parts, blocksById, audioIds, test._id);
  const part = enrichedParts.find((entry) => Number(entry?.partNumber) === partNumber);
  if (!part) {
    return res.status(404).json({
      message: `Part ${partNumber} was not found for listening test '${testId}'.`,
    });
  }
  const studentUserId = normalizeValue(req.auth?.userId);
  const taskRefId = `${testId}::part:${partNumber}`;
  const orderedTaskRefs = await listPublishedListeningPartTaskRefs();
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "listening",
      sourceType: "listening_part",
      orderedTaskRefs,
    })
    : new Map();
  const progress = toProgressPayload(progressMap.get(taskRefId), Math.max(1, orderedTaskRefs.indexOf(taskRefId) + 1));

  return res.json({
    test: {
      _id: test._id,
      title: test.title || test._id,
      module: test.module || "",
      status: test.status || "",
    },
    part: {
      ...part,
      taskId: `${test._id}::${part.partNumber}`,
      testId: test._id,
      testTitle: test.title || test._id,
      blocksCount: Array.isArray(part?.blocks) ? part.blocks.length : 0,
      taskRefId,
      progressStatus: progress.status,
      accessStatus: progress.accessStatus,
      progression: progress,
    },
    sourceCollection: {
      listeningTests: "listening_tests",
      listeningBlocks: blocksCollectionName,
      listeningAudios: "listening_audios",
    },
  });
}

async function submitListeningTestAttempt(req, res) {
  const studentUserId = normalizeValue(req.auth?.userId);
  if (!studentUserId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const studentEmail = normalizeValue(req.auth?.email).toLowerCase();
  const testId = normalizeValue(req.params.testId);
  if (!testId) {
    return res.status(400).json({
      message: "Listening test id is required.",
    });
  }

  const test = await ListeningTest.findById(testId).lean();
  if (!test) {
    return res.status(404).json({
      message: `Listening test '${testId}' not found.`,
    });
  }

  const submitReason = normalizeValue(req.body?.submitReason) || "manual";
  const forceReason = normalizeValue(req.body?.forceReason);
  const attemptCategory = normalizeAttemptCategory(req.body?.attemptCategory);
  const sourceType = normalizeSourceType(req.body?.sourceType);
  const resolvedAttemptCategory = attemptCategory || (sourceType === "daily_unit" ? "daily" : "additional");
  const submittedAt = req.body?.submittedAt ? new Date(req.body.submittedAt) : new Date();
  const safeSubmittedAt = Number.isNaN(submittedAt.valueOf()) ? new Date() : submittedAt;
  const totalTimeSpentSeconds = Math.max(
    0,
    Math.round(Number(req.body?.timeSpentSeconds) || 0),
  );
  const evaluation = sanitizeListeningEvaluationPayload(req.body?.evaluation);
  const blockResults = Array.isArray(req.body?.blockResults) ? req.body.blockResults : [];

  if (resolvedAttemptCategory === "additional") {
    try {
      await assertAdditionalTaskUnlocked({
        studentUserId,
        taskType: "listening",
        taskRefId: testId,
        sourceType: "listening_full",
      });
    } catch (error) {
      const statusCode = Number(error?.httpStatus) || 403;
      return res.status(statusCode).json({
        message: error?.message || "This additional task is locked.",
      });
    }
  }

  try {
    const attempt = await recordStudentTaskAttempt({
      studentUserId,
      studentEmail,
      attemptCategory: resolvedAttemptCategory,
      sourceType,
      taskType: "listening",
      taskRefId: testId,
      taskLabel: normalizeValue(test?.title) || testId,
      submitReason,
      forceReason,
      isAutoSubmitted: submitReason !== "manual",
      submittedAt: safeSubmittedAt,
      totalTimeSpentSeconds,
      score: {
        band: evaluation.band,
        percentage: evaluation.percentage,
        correctCount: evaluation.correctCount,
        incorrectCount: evaluation.incorrectCount,
        totalQuestions: evaluation.totalQuestions,
      },
      payload: {
        evaluation,
        blockResults,
        blockIds: flattenBlockIds(test?.parts, testId),
      },
      sourceRefs: {
        listeningBlockAttemptIds: blockResults
          .map((item) => normalizeValue(item?.blockAttemptId || item?.attemptId))
          .filter(Boolean),
      },
    });

    return res.status(201).json({
      message: "Listening full test submitted successfully.",
      attempt: {
        id: String(attempt?._id || ""),
        attemptNumber: Number(attempt?.attemptNumber || 0),
        testId,
        submittedAt: attempt?.submittedAt || safeSubmittedAt,
        submitReason,
        forceReason,
        score: attempt?.score || {},
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error?.message || "Listening full test submission failed.",
    });
  }
}

module.exports = {
  listListeningTests,
  getListeningTestById,
  listListeningPartGroups,
  getListeningTestPartById,
  submitListeningTestAttempt,
};
