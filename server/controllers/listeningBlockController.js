const mongoose = require("mongoose");
const ListeningBlock = require("../models/listeningBlockModel");
const ListeningAudio = require("../models/listeningAudioModel");
const ListeningAttempt = require("../models/listeningAttemptModel");
const { sendAudioStreamResponse } = require("../utils/audioStream");

const LEGACY_LISTENING_BLOCKS_COLLECTION = "listeninig_blocks";

function normalizeFilterValue(value) {
  return String(value || "").trim();
}

function buildPaginationParams(query) {
  const requestedPage = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 10, 1), 100);
  return { requestedPage, limit };
}

function normalizeAnswerText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function toAnswerArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  const safe = String(value || "").trim();
  return safe ? [safe] : [];
}

function toChoiceTokenSet(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return new Set();
  }

  const tokens = normalized
    .split(/[;,/]+/g)
    .map((item) => item.trim())
    .filter(Boolean);

  return new Set(tokens);
}

function areSetsEqual(left, right) {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function inferChoiceSelectionLimit(questionText, instructionText, fallback = 1) {
  const source = `${String(questionText || "")} ${String(instructionText || "")}`.toLowerCase();
  const patterns = [
    { regex: /\b(four|4)\b/, value: 4 },
    { regex: /\b(three|3)\b/, value: 3 },
    { regex: /\b(two|2)\b/, value: 2 },
    { regex: /\b(one|1)\b/, value: 1 },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(source)) {
      return pattern.value;
    }
  }

  return Math.max(1, Number(fallback) || 1);
}

function sanitizeSubmittedAnswers(rawAnswers) {
  if (!Array.isArray(rawAnswers)) {
    return [];
  }

  return rawAnswers
    .map((item) => {
      const questionId = normalizeFilterValue(item?.questionId || item?.id || item?.qid);
      if (!questionId) {
        return null;
      }

      const rawQuestionNumber = Number(item?.questionNumber);
      const questionNumber = Number.isFinite(rawQuestionNumber) ? rawQuestionNumber : null;
      const value = String(item?.value || item?.answer || "").trim();

      return {
        questionId,
        questionNumber,
        value,
      };
    })
    .filter(Boolean);
}

function buildSubmittedAnswerLookup(submittedAnswers) {
  const byQuestionId = new Map();
  const byQuestionNumber = new Map();

  submittedAnswers.forEach((answerItem) => {
    if (answerItem?.questionId && !byQuestionId.has(answerItem.questionId)) {
      byQuestionId.set(answerItem.questionId, answerItem.value || "");
    }

    if (Number.isFinite(answerItem?.questionNumber) && !byQuestionNumber.has(answerItem.questionNumber)) {
      byQuestionNumber.set(answerItem.questionNumber, answerItem.value || "");
    }
  });

  return { byQuestionId, byQuestionNumber };
}

function summarizeAttemptForClient(attemptDoc) {
  if (!attemptDoc) {
    return null;
  }

  return {
    id: String(attemptDoc._id),
    blockId: attemptDoc.blockId,
    questionFamily: attemptDoc.questionFamily,
    blockType: attemptDoc.blockType,
    displayTitle: attemptDoc.displayTitle,
    submitReason: attemptDoc.submitReason,
    attemptNumber: attemptDoc.attemptNumber,
    submittedAt: attemptDoc.submittedAt,
    correctCount: Number(attemptDoc.evaluation?.correctCount || 0),
    totalQuestions: Number(attemptDoc.evaluation?.totalQuestions || 0),
    percentage: Number(attemptDoc.evaluation?.percentage || 0),
    incorrectQuestionNumbers: Array.isArray(attemptDoc.evaluation?.incorrectQuestionNumbers)
      ? attemptDoc.evaluation.incorrectQuestionNumbers
      : [],
  };
}

async function getListeningBlocksCollectionName() {
  const db = mongoose.connection.db;
  const defaultCollectionName = ListeningBlock.collection.name;
  const hasDefaultCollection = Boolean(
    await db.listCollections({ name: defaultCollectionName }, { nameOnly: true }).next(),
  );

  if (hasDefaultCollection) {
    const defaultCount = await db.collection(defaultCollectionName).estimatedDocumentCount();
    if (defaultCount > 0) {
      return defaultCollectionName;
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

  return defaultCollectionName;
}

async function queryListeningFamilies(collection, blockType = "") {
  const matchStage = blockType ? { blockType } : {};

  const families = await collection
    .aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$questionFamily",
          count: { $sum: 1 },
          blockTypes: { $addToSet: "$blockType" },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return families.map((item) => ({
    questionFamily: item._id,
    count: item.count,
    blockTypes: item.blockTypes.sort(),
  }));
}

async function listListeningQuestionFamilies(req, res) {
  const collectionName = await getListeningBlocksCollectionName();
  const collection = mongoose.connection.db.collection(collectionName);
  const blockType = normalizeFilterValue(req.query.blockType);
  const families = await queryListeningFamilies(collection, blockType);

  return res.json({
    count: families.length,
    families,
    sourceCollection: collectionName,
  });
}

async function listListeningBlocks(req, res) {
  const collectionName = await getListeningBlocksCollectionName();
  const collection = mongoose.connection.db.collection(collectionName);
  const questionFamily = normalizeFilterValue(req.query.questionFamily);
  const blockType = normalizeFilterValue(req.query.blockType);

  if (!questionFamily) {
    const families = await queryListeningFamilies(collection, blockType);
    return res.json({
      count: families.length,
      families,
      sourceCollection: collectionName,
    });
  }

  const filter = {};

  filter.questionFamily = questionFamily;

  if (blockType) {
    filter.blockType = blockType;
  }

  const { requestedPage, limit } = buildPaginationParams(req.query);
  const total = await collection.countDocuments(filter);
  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
  const page = Math.min(requestedPage, totalPages);
  const skip = (page - 1) * limit;

  const blocks = await collection
    .find(filter, {
      projection: {
        _id: 1,
        blockType: 1,
        questionFamily: 1,
        instruction: 1,
        questions: 1,
        "display.title": 1,
      },
    })
    .sort({ _id: 1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  const blockIds = blocks.map((item) => item._id);
  const audioDocs = blockIds.length
    ? await ListeningAudio.find({ _id: { $in: blockIds } }, { _id: 1 }).lean()
    : [];
  const audioIdSet = new Set(audioDocs.map((item) => item._id));

  const list = blocks.map((block) => ({
    _id: block._id,
    blockType: block.blockType,
    questionFamily: block.questionFamily,
    instruction: block.instruction || {},
    displayTitle: block.display?.title || "",
    questionsCount: Array.isArray(block.questions) ? block.questions.length : 0,
    questionNumbers: Array.isArray(block.questions)
      ? block.questions
        .map((question) => question.number)
        .filter((number) => Number.isFinite(number))
      : [],
    hasAudio: audioIdSet.has(block._id),
  }));

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
    filters: {
      questionFamily: questionFamily || null,
      blockType: blockType || null,
    },
    blocks: list,
    sourceCollection: collectionName,
  });
}

async function getListeningBlockById(req, res) {
  const collectionName = await getListeningBlocksCollectionName();
  const collection = mongoose.connection.db.collection(collectionName);
  const blockId = normalizeFilterValue(req.params.blockId);
  const block = await collection.findOne({ _id: blockId });

  if (!block) {
    return res.status(404).json({
      message: `Listening block '${blockId}' not found.`,
    });
  }

  const audioDoc = await ListeningAudio.findById(blockId, { _id: 1, mimeType: 1 }).lean();
  const hasAudio = Boolean(audioDoc);

  return res.json({
    block,
    audio: {
      exists: hasAudio,
      mimeType: audioDoc?.mimeType || "audio/mpeg",
      streamPath: `/api/v1/listening-blocks/${encodeURIComponent(blockId)}/audio`,
      sourceCollection: collectionName,
    },
  });
}

async function submitListeningBlockAttempt(req, res) {
  const studentId = normalizeFilterValue(req.auth?.userId);
  if (!studentId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const blockId = normalizeFilterValue(req.params.blockId);
  const submitReason = normalizeFilterValue(req.body?.submitReason) || "audio-ended";
  const submittedAnswers = sanitizeSubmittedAnswers(req.body?.answers);
  const collectionName = await getListeningBlocksCollectionName();
  const collection = mongoose.connection.db.collection(collectionName);
  const block = await collection.findOne(
    { _id: blockId },
    {
      projection: {
        _id: 1,
        blockType: 1,
        questionFamily: 1,
        "display.title": 1,
        questions: 1,
      },
    },
  );

  if (!block) {
    return res.status(404).json({
      message: `Listening block '${blockId}' not found.`,
    });
  }

  const questions = Array.isArray(block.questions) ? block.questions : [];
  const isMultipleChoiceBlock = /multiple[_-]?choice/i.test(
    `${String(block?.blockType || "")} ${String(block?.questionFamily || "")}`,
  );
  const isMultipleChoiceMultiBlock = /multiple[_-]?choice[_-]?multi/i.test(
    `${String(block?.blockType || "")} ${String(block?.questionFamily || "")}`,
  );
  const submittedLookup = buildSubmittedAnswerLookup(submittedAnswers);
  let results = [];

  if (isMultipleChoiceMultiBlock) {
    const expectedChoiceSet = new Set();
    questions.forEach((question) => {
      const acceptedAnswers = toAnswerArray(question?.answer);
      acceptedAnswers.forEach((answer) => {
        const tokenSet = toChoiceTokenSet(answer);
        tokenSet.forEach((token) => expectedChoiceSet.add(token));
      });
    });

    const expectedTokens = Array.from(expectedChoiceSet).sort((left, right) => left.localeCompare(right));

    const submittedChoiceSet = new Set();
    submittedAnswers.forEach((answerItem) => {
      const tokenSet = toChoiceTokenSet(answerItem?.value || "");
      tokenSet.forEach((token) => submittedChoiceSet.add(token));
    });

    results = questions.map((question, index) => {
      const questionId = normalizeFilterValue(question?.id || question?.qid || `q-${index + 1}`);
      const questionNumber = Number.isFinite(Number(question?.number)) ? Number(question.number) : index + 1;
      const expectedToken = expectedTokens[index] || "";
      const isGradable = Boolean(expectedToken);
      const isCorrect = isGradable && submittedChoiceSet.has(expectedToken);

      return {
        questionId,
        questionNumber,
        studentAnswer: isCorrect ? expectedToken.toUpperCase() : "",
        acceptedAnswers: isGradable ? [expectedToken.toUpperCase()] : toAnswerArray(question?.answer),
        isGradable,
        isCorrect,
      };
    });
  } else {
    results = questions.map((question, index) => {
      const questionId = normalizeFilterValue(question?.id || question?.qid || `q-${index + 1}`);
      const questionNumber = Number.isFinite(Number(question?.number)) ? Number(question.number) : index + 1;
      const studentAnswerRaw =
        submittedLookup.byQuestionId.get(questionId) ??
        submittedLookup.byQuestionNumber.get(questionNumber) ??
        "";
      const studentAnswer = String(studentAnswerRaw || "").trim();
      const acceptedAnswers = toAnswerArray(question?.answer);
      const normalizedAcceptedSet = new Set(
        acceptedAnswers.map((value) => normalizeAnswerText(value)).filter(Boolean),
      );
      const normalizedStudentAnswer = normalizeAnswerText(studentAnswer);
      const inferredSelectionLimit = inferChoiceSelectionLimit(
        String(question?.text || ""),
        String(block?.instruction?.text || ""),
        acceptedAnswers.length > 1 ? acceptedAnswers.length : 1,
      );
      const shouldUseMultiSelectMatch =
        isMultipleChoiceBlock &&
        (inferredSelectionLimit > 1 ||
          (acceptedAnswers.length > 1 &&
            acceptedAnswers.every((answer) => toChoiceTokenSet(answer).size <= 1)));

      let isCorrect = false;
      const isGradable = normalizedAcceptedSet.size > 0;

      if (isGradable && shouldUseMultiSelectMatch) {
        const expectedChoiceSet = new Set();
        acceptedAnswers.forEach((answer) => {
          const tokenSet = toChoiceTokenSet(answer);
          tokenSet.forEach((token) => expectedChoiceSet.add(token));
        });

        const studentChoiceSet = toChoiceTokenSet(studentAnswer);
        isCorrect = studentChoiceSet.size > 0 && areSetsEqual(studentChoiceSet, expectedChoiceSet);
      } else {
        isCorrect =
          isGradable &&
          normalizedStudentAnswer.length > 0 &&
          normalizedAcceptedSet.has(normalizedStudentAnswer);
      }

      return {
        questionId,
        questionNumber,
        studentAnswer,
        acceptedAnswers,
        isGradable,
        isCorrect,
      };
    });
  }

  const gradableResults = results.filter((item) => item.isGradable);
  const scoreBase = gradableResults.length > 0 ? gradableResults : results;
  const totalQuestions = scoreBase.length;
  const correctCount = scoreBase.filter((item) => item.isCorrect).length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const incorrectQuestionNumbers = scoreBase
    .filter((item) => !item.isCorrect)
    .map((item) => item.questionNumber)
    .filter((number) => Number.isFinite(number));

  const previousAttempt = await ListeningAttempt.findOne({ studentId, blockId })
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();

  const previousAttemptNumber = Number(previousAttempt?.attemptNumber || 0);
  const attemptNumber = previousAttemptNumber > 0 ? previousAttemptNumber + 1 : 1;

  const savedAttempt = await ListeningAttempt.create({
    studentId,
    blockId,
    questionFamily: block.questionFamily || "",
    blockType: block.blockType || "",
    displayTitle: block.display?.title || "",
    status: "completed",
    submitReason,
    attemptNumber,
    answers: submittedAnswers,
    evaluation: {
      correctCount,
      totalQuestions,
      percentage,
      incorrectQuestionNumbers,
      results: results.map((item) => ({
        questionId: item.questionId,
        questionNumber: item.questionNumber,
        studentAnswer: item.studentAnswer,
        acceptedAnswers: item.acceptedAnswers,
        isCorrect: item.isCorrect,
      })),
    },
    submittedAt: new Date(),
  });

  return res.status(201).json({
    message: "Listening task submitted successfully.",
    attempt: summarizeAttemptForClient(savedAttempt),
    previousAttempt: summarizeAttemptForClient(previousAttempt),
  });
}

async function getLatestListeningBlockAttempt(req, res) {
  const studentId = normalizeFilterValue(req.auth?.userId);
  if (!studentId) {
    return res.status(401).json({
      message: "Student authorization is required.",
    });
  }

  const blockId = normalizeFilterValue(req.params.blockId);
  const latestAttempt = await ListeningAttempt.findOne({ studentId, blockId })
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();

  return res.json({
    attempt: summarizeAttemptForClient(latestAttempt),
  });
}

async function streamListeningBlockAudio(req, res) {
  const blockId = normalizeFilterValue(req.params.blockId);
  const audio = await ListeningAudio.findById(blockId);

  if (!audio) {
    return res.status(404).json({
      message: `Audio not found for listening block '${blockId}'.`,
    });
  }

  return sendAudioStreamResponse(req, res, audio.audioData, {
    mimeType: audio.mimeType,
    fileName: audio.originalFileName || `${blockId}.mp3`,
  });
}

module.exports = {
  listListeningQuestionFamilies,
  listListeningBlocks,
  getListeningBlockById,
  submitListeningBlockAttempt,
  getLatestListeningBlockAttempt,
  streamListeningBlockAudio,
};
