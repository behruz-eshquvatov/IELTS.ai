const mongoose = require("mongoose");
const ListeningTest = require("../models/listeningTestModel");
const ListeningAudio = require("../models/listeningAudioModel");

const LEGACY_LISTENING_BLOCKS_COLLECTION = "listeninig_blocks";
const DEFAULT_LISTENING_BLOCKS_COLLECTION = "listening_blocks";

function normalizeValue(value) {
  return String(value || "").trim();
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

function flattenBlockIds(parts = []) {
  const ids = [];
  for (const part of parts || []) {
    const blocks = Array.isArray(part?.blocks) ? part.blocks : [];
    for (const block of blocks) {
      const blockId = normalizeValue(block?.blockId);
      if (blockId) {
        ids.push(blockId);
      }
    }
  }
  return Array.from(new Set(ids));
}

function flattenAudioRefs(parts = []) {
  const ids = [];
  for (const part of parts || []) {
    const blocks = Array.isArray(part?.blocks) ? part.blocks : [];
    for (const block of blocks) {
      const audioRef = normalizeValue(block?.audioRef || block?.blockId);
      if (audioRef) {
        ids.push(audioRef);
      }
    }
  }
  return Array.from(new Set(ids));
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

  const list = tests.map((test) => {
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

  const blockIds = flattenBlockIds(test.parts);
  const audioRefs = flattenAudioRefs(test.parts);
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

  const audioDocs = audioRefs.length
    ? await ListeningAudio.find({ _id: { $in: audioRefs } }, { _id: 1 }).lean()
    : [];
  const audioIds = new Set(audioDocs.map((audio) => audio._id));

  const enrichedParts = (test.parts || []).map((part) => {
    const blocksInPart = (part.blocks || []).map((partBlock) => {
      const blockId = normalizeValue(partBlock.blockId);
      const audioRef = normalizeValue(partBlock.audioRef || blockId);
      const blockMeta = blocksById.get(blockId);
      const questionsCount = Array.isArray(blockMeta?.questions) ? blockMeta.questions.length : 0;

      return {
        blockId,
        audioRef,
        order: partBlock.order,
        hasAudio: audioIds.has(audioRef),
        blockType: blockMeta?.blockType || "",
        questionFamily: blockMeta?.questionFamily || "",
        displayTitle: blockMeta?.display?.title || "",
        instruction: blockMeta?.instruction || {},
        questionsCount,
      };
    });

    return {
      partNumber: part.partNumber,
      questionRange: part.questionRange,
      blocks: blocksInPart,
    };
  });

  return res.json({
    test: {
      ...test,
      parts: enrichedParts,
    },
    sourceCollection: {
      listeningTests: "listening_tests",
      listeningBlocks: blocksCollectionName,
      listeningAudios: "listening_audios",
    },
  });
}

module.exports = {
  listListeningTests,
  getListeningTestById,
};
