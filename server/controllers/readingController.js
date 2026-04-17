const mongoose = require("mongoose");

const READING_PASSAGES_COLLECTION = "reading_passages";
const READING_BLOCKS_COLLECTION = "reading_blocks";
const READING_TESTS_COLLECTION = "reading_tests";

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeEnum(value) {
  return normalizeValue(value).toLowerCase();
}

function parseCsvValues(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item || "").split(","))
      .map((item) => normalizeEnum(item))
      .filter(Boolean);
  }

  const safe = normalizeValue(value);
  if (!safe) {
    return [];
  }

  return safe
    .split(",")
    .map((item) => normalizeEnum(item))
    .filter(Boolean);
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getStatusFilter(statusQuery, fallbackStatus = "published") {
  const status = normalizeEnum(statusQuery) || normalizeEnum(fallbackStatus);
  if (!status || status === "all") {
    return "";
  }

  return status;
}

function getQuestionStartNumber(block) {
  const questions = Array.isArray(block?.questions) ? block.questions : [];
  const numbers = questions
    .map((question) => Number(question?.number))
    .filter((number) => Number.isFinite(number));

  if (numbers.length === 0) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Math.min(...numbers);
}

function compareBlocks(left, right) {
  const questionDiff = getQuestionStartNumber(left) - getQuestionStartNumber(right);
  if (questionDiff !== 0) {
    return questionDiff;
  }

  return String(left?._id || "").localeCompare(String(right?._id || ""));
}

function comparePassages(left, right) {
  const bookDiff = toFiniteNumber(left?.book, Number.MAX_SAFE_INTEGER) - toFiniteNumber(right?.book, Number.MAX_SAFE_INTEGER);
  if (bookDiff !== 0) {
    return bookDiff;
  }

  const testDiff = toFiniteNumber(left?.test, Number.MAX_SAFE_INTEGER) - toFiniteNumber(right?.test, Number.MAX_SAFE_INTEGER);
  if (testDiff !== 0) {
    return testDiff;
  }

  const passageNumberDiff =
    toFiniteNumber(left?.passageNumber, Number.MAX_SAFE_INTEGER) -
    toFiniteNumber(right?.passageNumber, Number.MAX_SAFE_INTEGER);
  if (passageNumberDiff !== 0) {
    return passageNumberDiff;
  }

  return String(left?._id || "").localeCompare(String(right?._id || ""));
}

function buildLookupById(items = []) {
  return new Map(items.map((item) => [String(item?._id || ""), item]));
}

async function fetchPassagesByIds(db, passageIds = [], statusFilter = "") {
  const safeIds = Array.from(new Set((passageIds || []).map((item) => normalizeValue(item)).filter(Boolean)));
  if (safeIds.length === 0) {
    return [];
  }

  const query = { _id: { $in: safeIds } };
  if (statusFilter) {
    query.status = statusFilter;
  }

  return db.collection(READING_PASSAGES_COLLECTION).find(query).toArray();
}

async function fetchBlocksByIds(db, blockIds = [], statusFilter = "") {
  const safeIds = Array.from(new Set((blockIds || []).map((item) => normalizeValue(item)).filter(Boolean)));
  if (safeIds.length === 0) {
    return [];
  }

  const query = { _id: { $in: safeIds } };
  if (statusFilter) {
    query.status = statusFilter;
  }

  return db.collection(READING_BLOCKS_COLLECTION).find(query).toArray();
}

function enrichTestPassages(test, passagesById, blocksById) {
  const rawPassages = Array.isArray(test?.passages) ? test.passages : [];
  const normalized = rawPassages
    .map((entry, index) => ({
      passageNumber: Number.isFinite(Number(entry?.passageNumber)) ? Number(entry.passageNumber) : index + 1,
      passageId: normalizeValue(entry?.passageId),
      questionRange: entry?.questionRange || {},
      blocks: Array.isArray(entry?.blocks) ? entry.blocks : [],
    }))
    .sort((left, right) => Number(left.passageNumber || 0) - Number(right.passageNumber || 0));

  return normalized.map((entry) => {
    const linkedPassage = passagesById.get(entry.passageId) || null;
    const linkedBlocks = entry.blocks
      .map((blockRef, index) => ({
        blockId: normalizeValue(blockRef?.blockId),
        order: Number.isFinite(Number(blockRef?.order)) ? Number(blockRef.order) : index + 1,
      }))
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
      .map((blockRef) => {
        const blockDoc = blocksById.get(blockRef.blockId);
        if (!blockDoc) {
          return null;
        }

        return {
          ...blockDoc,
          blockOrder: blockRef.order,
        };
      })
      .filter(Boolean);

    const missingBlockIds = entry.blocks
      .map((item) => normalizeValue(item?.blockId))
      .filter((blockId) => blockId && !blocksById.has(blockId));

    return {
      passageNumber: entry.passageNumber,
      passageId: entry.passageId,
      questionRange: entry.questionRange,
      passage: linkedPassage,
      blocks: linkedBlocks,
      missingBlockIds,
      hasMissingPassage: !linkedPassage && Boolean(entry.passageId),
    };
  });
}

async function listFullReadingTests(req, res) {
  const db = mongoose.connection.db;
  const statusFilter = getStatusFilter(req.query.status, "published");
  const testsQuery = {};

  if (statusFilter) {
    testsQuery.status = statusFilter;
  }

  const tests = await db
    .collection(READING_TESTS_COLLECTION)
    .find(testsQuery)
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  const allPassageIds = [];
  const allBlockIds = [];

  tests.forEach((test) => {
    const passageEntries = Array.isArray(test?.passages) ? test.passages : [];
    passageEntries.forEach((entry) => {
      const passageId = normalizeValue(entry?.passageId);
      if (passageId) {
        allPassageIds.push(passageId);
      }

      const blockRefs = Array.isArray(entry?.blocks) ? entry.blocks : [];
      blockRefs.forEach((blockRef) => {
        const blockId = normalizeValue(blockRef?.blockId);
        if (blockId) {
          allBlockIds.push(blockId);
        }
      });
    });
  });

  const [passages, blocks] = await Promise.all([
    fetchPassagesByIds(db, allPassageIds, statusFilter),
    fetchBlocksByIds(db, allBlockIds, statusFilter),
  ]);

  const passagesById = buildLookupById(passages);
  const blocksById = buildLookupById(blocks);

  const enrichedTests = tests.map((test) => ({
    ...test,
    passages: enrichTestPassages(test, passagesById, blocksById),
  }));

  return res.json({
    count: enrichedTests.length,
    filters: {
      status: statusFilter || "all",
    },
    tests: enrichedTests,
    sourceCollections: {
      tests: READING_TESTS_COLLECTION,
      passages: READING_PASSAGES_COLLECTION,
      blocks: READING_BLOCKS_COLLECTION,
    },
  });
}

async function getFullReadingTestById(req, res) {
  const db = mongoose.connection.db;
  const testId = normalizeValue(req.params.testId);
  const statusFilter = getStatusFilter(req.query.status, "published");
  const testQuery = { _id: testId };

  if (statusFilter) {
    testQuery.status = statusFilter;
  }

  const test = await db.collection(READING_TESTS_COLLECTION).findOne(testQuery);
  if (!test) {
    return res.status(404).json({
      message: `Reading test '${testId}' not found.`,
    });
  }

  const passageEntries = Array.isArray(test?.passages) ? test.passages : [];
  const passageIds = passageEntries.map((entry) => normalizeValue(entry?.passageId)).filter(Boolean);
  const blockIds = passageEntries.flatMap((entry) =>
    (Array.isArray(entry?.blocks) ? entry.blocks : []).map((blockRef) => normalizeValue(blockRef?.blockId)),
  );

  const [passages, blocks] = await Promise.all([
    fetchPassagesByIds(db, passageIds, statusFilter),
    fetchBlocksByIds(db, blockIds, statusFilter),
  ]);

  const passagesById = buildLookupById(passages);
  const blocksById = buildLookupById(blocks);

  return res.json({
    test: {
      ...test,
      passages: enrichTestPassages(test, passagesById, blocksById),
    },
    filters: {
      status: statusFilter || "all",
    },
    sourceCollections: {
      tests: READING_TESTS_COLLECTION,
      passages: READING_PASSAGES_COLLECTION,
      blocks: READING_BLOCKS_COLLECTION,
    },
  });
}

function buildPassageGroup(passage, blocks = [], extra = {}) {
  const sortedBlocks = [...blocks].sort(compareBlocks);
  return {
    passageId: String(passage?._id || extra.passageId || ""),
    passage,
    blocks: sortedBlocks,
    ...extra,
  };
}

async function listReadingPassagesWithBlocks(req, res) {
  const db = mongoose.connection.db;
  const statusFilter = getStatusFilter(req.query.status, "published");
  const testId = normalizeValue(req.query.testId);
  const passageIdFilter = normalizeValue(req.query.passageId);

  if (testId) {
    const testQuery = { _id: testId };
    if (statusFilter) {
      testQuery.status = statusFilter;
    }

    const testDoc = await db.collection(READING_TESTS_COLLECTION).findOne(testQuery);
    if (!testDoc) {
      return res.status(404).json({
        message: `Reading test '${testId}' not found.`,
      });
    }

    const passageEntries = Array.isArray(testDoc?.passages) ? testDoc.passages : [];
    const passageIds = passageEntries.map((entry) => normalizeValue(entry?.passageId)).filter(Boolean);
    const blockIds = passageEntries.flatMap((entry) =>
      (Array.isArray(entry?.blocks) ? entry.blocks : []).map((blockRef) => normalizeValue(blockRef?.blockId)),
    );

    const [passages, blocks] = await Promise.all([
      fetchPassagesByIds(db, passageIds, statusFilter),
      fetchBlocksByIds(db, blockIds, statusFilter),
    ]);

    const passagesById = buildLookupById(passages);
    const blocksById = buildLookupById(blocks);

    const grouped = passageEntries
      .map((entry, index) => {
        const passageNumber = Number.isFinite(Number(entry?.passageNumber))
          ? Number(entry.passageNumber)
          : index + 1;
        const passageId = normalizeValue(entry?.passageId);
        const passage = passagesById.get(passageId) || null;
        const blocksForPassage = (Array.isArray(entry?.blocks) ? entry.blocks : [])
          .map((blockRef, blockIndex) => ({
            blockId: normalizeValue(blockRef?.blockId),
            order: Number.isFinite(Number(blockRef?.order)) ? Number(blockRef.order) : blockIndex + 1,
          }))
          .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
          .map((blockRef) => blocksById.get(blockRef.blockId))
          .filter(Boolean);

        return buildPassageGroup(passage, blocksForPassage, {
          passageId,
          passageNumber,
          questionRange: entry?.questionRange || {},
        });
      })
      .sort((left, right) => Number(left.passageNumber || 0) - Number(right.passageNumber || 0));
    const filteredGrouped = passageIdFilter
      ? grouped.filter((group) => String(group?.passageId || "") === passageIdFilter)
      : grouped;

    return res.json({
      count: filteredGrouped.length,
      filters: {
        status: statusFilter || "all",
        testId,
        passageId: passageIdFilter || null,
      },
      passages: filteredGrouped,
      sourceCollections: {
        tests: READING_TESTS_COLLECTION,
        passages: READING_PASSAGES_COLLECTION,
        blocks: READING_BLOCKS_COLLECTION,
      },
    });
  }

  const passagesQuery = {};
  const blocksQuery = {};
  if (statusFilter) {
    passagesQuery.status = statusFilter;
    blocksQuery.status = statusFilter;
  }

  const [passages, blocks] = await Promise.all([
    db.collection(READING_PASSAGES_COLLECTION).find(passagesQuery).toArray(),
    db.collection(READING_BLOCKS_COLLECTION).find(blocksQuery).toArray(),
  ]);

  const blocksByPassageId = new Map();
  blocks.forEach((block) => {
    const passageId = normalizeValue(block?.passageId);
    if (!passageId) {
      return;
    }

    const current = blocksByPassageId.get(passageId) || [];
    current.push(block);
    blocksByPassageId.set(passageId, current);
  });

  const grouped = [...passages]
    .sort(comparePassages)
    .map((passage) =>
      buildPassageGroup(passage, blocksByPassageId.get(String(passage?._id || "")) || [], {
        passageNumber: Number.isFinite(Number(passage?.passageNumber)) ? Number(passage.passageNumber) : null,
      }),
    );
  const filteredGrouped = passageIdFilter
    ? grouped.filter((group) => String(group?.passageId || "") === passageIdFilter)
    : grouped;

  return res.json({
    count: filteredGrouped.length,
    filters: {
      status: statusFilter || "all",
      testId: null,
      passageId: passageIdFilter || null,
    },
    passages: filteredGrouped,
    sourceCollections: {
      passages: READING_PASSAGES_COLLECTION,
      blocks: READING_BLOCKS_COLLECTION,
    },
  });
}

async function listReadingPracticeGroups(req, res) {
  const db = mongoose.connection.db;
  const statusFilter = getStatusFilter(req.query.status, "published");
  const passageIdFilter = normalizeValue(req.query.passageId);
  const questionFamilies = Array.from(
    new Set([
      ...parseCsvValues(req.query.questionFamily),
      ...parseCsvValues(req.query.questionFamilies),
    ]),
  );
  const blockTypes = Array.from(
    new Set([
      ...parseCsvValues(req.query.blockType),
      ...parseCsvValues(req.query.blockTypes),
    ]),
  );

  const blocksQuery = {};
  if (statusFilter) {
    blocksQuery.status = statusFilter;
  }
  if (questionFamilies.length > 0) {
    blocksQuery.questionFamily = { $in: questionFamilies };
  }
  if (blockTypes.length > 0) {
    blocksQuery.blockType = { $in: blockTypes };
  }

  const matchedBlocks = await db.collection(READING_BLOCKS_COLLECTION).find(blocksQuery).toArray();
  const passageIds = Array.from(
    new Set(matchedBlocks.map((block) => normalizeValue(block?.passageId)).filter(Boolean)),
  );
  const passages = await fetchPassagesByIds(db, passageIds, statusFilter);
  const passagesById = buildLookupById(passages);

  const groupsByPassageId = new Map();
  let skippedBlocksWithoutPassage = 0;

  matchedBlocks.forEach((block) => {
    const passageId = normalizeValue(block?.passageId);
    if (!passageId) {
      skippedBlocksWithoutPassage += 1;
      return;
    }

    const passage = passagesById.get(passageId) || null;
    if (!passage) {
      skippedBlocksWithoutPassage += 1;
      return;
    }

    const existing = groupsByPassageId.get(passageId) || buildPassageGroup(passage, []);
    existing.blocks.push(block);
    groupsByPassageId.set(passageId, existing);
  });

  const groups = Array.from(groupsByPassageId.values())
    .map((group) => buildPassageGroup(group.passage, group.blocks))
    .sort((left, right) => comparePassages(left.passage, right.passage));
  const filteredGroups = passageIdFilter
    ? groups.filter((group) => String(group?.passageId || "") === passageIdFilter)
    : groups;

  return res.json({
    count: filteredGroups.length,
    totalBlocksMatched: matchedBlocks.length,
    skippedBlocksWithoutPassage,
    filters: {
      status: statusFilter || "all",
      questionFamilies,
      blockTypes,
      passageId: passageIdFilter || null,
    },
    groups: filteredGroups,
    sourceCollections: {
      passages: READING_PASSAGES_COLLECTION,
      blocks: READING_BLOCKS_COLLECTION,
    },
  });
}

module.exports = {
  listFullReadingTests,
  getFullReadingTestById,
  listReadingPassagesWithBlocks,
  listReadingPracticeGroups,
};
