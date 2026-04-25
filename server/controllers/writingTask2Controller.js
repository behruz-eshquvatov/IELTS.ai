const WritingTask2Item = require("../models/writingTask2ItemModel");
const mongoose = require("mongoose");
const {
  toProgressPayload,
  listPublishedWritingTask2ExtraTaskRefs,
  buildAdditionalProgressMap,
} = require("../services/additionalTaskProgressService");

function normalizeValue(value) {
  return String(value || "").trim();
}

function normalizeEnum(value) {
  return normalizeValue(value).toLowerCase();
}

function toFiniteInteger(value, fallback) {
  const numeric = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

async function listWritingTask2Items(req, res) {
  const status = normalizeEnum(req.query.status) || "published";
  const essayType = normalizeEnum(req.query.essayType);
  const page = Math.max(toFiniteInteger(req.query.page, 1), 1);
  const limit = Math.min(Math.max(toFiniteInteger(req.query.limit, 20), 1), 100);

  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }
  if (essayType && essayType !== "all") {
    filter.essayType = essayType;
  }

  const total = await WritingTask2Item.countDocuments(filter);
  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const items = await WritingTask2Item.find(filter)
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const studentUserId = normalizeValue(req.auth?.userId);
  const orderedTaskRefs = await listPublishedWritingTask2ExtraTaskRefs({ essayType });
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "writing_task2",
      sourceType: "writing_task2_extra",
      orderedTaskRefs,
    })
    : new Map();
  const enrichedItems = items.map((item, index) => {
    const taskRefId = normalizeValue(item?._id);
    const sequenceOrder = Math.max(1, orderedTaskRefs.indexOf(taskRefId) + 1 || index + 1);
    const progress = toProgressPayload(progressMap.get(taskRefId), sequenceOrder);
    return {
      ...item,
      progressStatus: progress.status,
      accessStatus: progress.accessStatus,
      progression: progress,
    };
  });

  return res.json({
    count: enrichedItems.length,
    pagination: {
      total,
      page: safePage,
      limit,
      totalPages,
      hasPrevPage: safePage > 1,
      hasNextPage: safePage < totalPages,
    },
    filters: {
      status: status || "all",
      essayType: essayType || "all",
    },
    items: enrichedItems,
  });
}

async function getWritingTask2ItemById(req, res) {
  const itemId = normalizeValue(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      message: "Writing Task 2 item id is required.",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({
      message: `Writing Task 2 item id '${itemId}' is invalid.`,
    });
  }

  const status = normalizeEnum(req.query.status) || "published";
  const filter = { _id: itemId };
  if (status !== "all") {
    filter.status = status;
  }

  const item = await WritingTask2Item.findOne(filter).lean();
  if (!item) {
    return res.status(404).json({
      message: `Writing Task 2 item '${itemId}' not found.`,
    });
  }
  const studentUserId = normalizeValue(req.auth?.userId);
  const essayTypeForSequence = normalizeEnum(item?.essayType);
  const orderedTaskRefs = await listPublishedWritingTask2ExtraTaskRefs({ essayType: essayTypeForSequence });
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "writing_task2",
      sourceType: "writing_task2_extra",
      orderedTaskRefs,
    })
    : new Map();
  const progress = toProgressPayload(
    progressMap.get(itemId),
    Math.max(1, orderedTaskRefs.indexOf(itemId) + 1),
  );

  return res.json({
    item: {
      ...item,
      progressStatus: progress.status,
      accessStatus: progress.accessStatus,
      progression: progress,
    },
  });
}

module.exports = {
  listWritingTask2Items,
  getWritingTask2ItemById,
};
