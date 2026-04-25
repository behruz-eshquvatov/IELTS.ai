const WritingTask1Item = require("../models/writingTask1ItemModel");
const WritingTask1Visual = require("../models/writingTask1VisualModel");
const mongoose = require("mongoose");
const {
  toProgressPayload,
  listPublishedWritingTask1ExtraTaskRefs,
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

async function listWritingTask1Items(req, res) {
  const status = "published";
  const visualType = normalizeEnum(req.query.visualType);
  const page = Math.max(toFiniteInteger(req.query.page, 1), 1);
  const limit = Math.min(Math.max(toFiniteInteger(req.query.limit, 20), 1), 100);

  const filter = {};
  filter.status = status;
  if (visualType && visualType !== "all") {
    filter.visualType = visualType;
  }

  const total = await WritingTask1Item.countDocuments(filter);
  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const items = await WritingTask1Item.find(filter)
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  const studentUserId = normalizeValue(req.auth?.userId);
  const orderedTaskRefs = await listPublishedWritingTask1ExtraTaskRefs({ visualType });
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "writing_task1",
      sourceType: "writing_task1_extra",
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
      status,
      visualType: visualType || "all",
    },
    items: enrichedItems,
  });
}

async function getWritingTask1ItemById(req, res) {
  const itemId = normalizeValue(req.params.itemId);
  if (!itemId) {
    return res.status(400).json({
      message: "Writing Task 1 item id is required.",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({
      message: `Writing Task 1 item id '${itemId}' is invalid.`,
    });
  }

  const status = "published";
  const filter = { _id: itemId };
  filter.status = status;

  const item = await WritingTask1Item.findOne(filter).lean();
  if (!item) {
    return res.status(404).json({
      message: `Writing Task 1 item '${itemId}' not found.`,
    });
  }
  const studentUserId = normalizeValue(req.auth?.userId);
  const visualType = normalizeEnum(item?.visualType);
  const orderedTaskRefs = await listPublishedWritingTask1ExtraTaskRefs({ visualType });
  const progressMap = studentUserId
    ? await buildAdditionalProgressMap({
      studentUserId,
      taskType: "writing_task1",
      sourceType: "writing_task1_extra",
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

async function streamWritingTask1Visual(req, res) {
  const imageId = normalizeValue(req.params.imageId);
  if (!imageId) {
    return res.status(400).json({
      message: "Image id is required.",
    });
  }

  const visual = await WritingTask1Visual.findById(imageId);
  if (!visual) {
    return res.status(404).json({
      message: `Writing Task 1 visual '${imageId}' not found.`,
    });
  }

  const rawImageData = visual?.imageData;
  const imageBuffer = Buffer.isBuffer(rawImageData)
    ? rawImageData
    : rawImageData?.buffer
      ? Buffer.from(rawImageData.buffer)
      : null;
  if (!imageBuffer || imageBuffer.length === 0) {
    return res.status(404).json({
      message: `Writing Task 1 visual '${imageId}' has no image data.`,
    });
  }

  res.setHeader("Content-Type", normalizeValue(visual.mimeType) || "image/png");
  res.setHeader("Content-Length", imageBuffer.length);
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${normalizeValue(visual.originalFileName) || `${imageId}.png`}"`,
  );
  return res.send(imageBuffer);
}

module.exports = {
  listWritingTask1Items,
  getWritingTask1ItemById,
  streamWritingTask1Visual,
};
