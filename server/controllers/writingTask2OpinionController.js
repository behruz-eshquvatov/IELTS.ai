const WritingTask2Opinion = require("../models/writingTask2OpinionModel");

async function listWritingTask2Opinions(req, res) {
  const accessStatus = req.query.accessStatus;
  const requestedPage = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 10, 1), 50);
  const filter = {};

  if (accessStatus === "locked" || accessStatus === "unlocked") {
    filter.accessStatus = accessStatus;
  }

  const total = await WritingTask2Opinion.countDocuments(filter);

  const totalPages = total === 0 ? 1 : Math.ceil(total / limit);
  const safePage = Math.min(requestedPage, totalPages);
  const safeSkip = (safePage - 1) * limit;

  const prompts = await WritingTask2Opinion.find(filter)
    .sort({ unlockOrder: 1 })
    .skip(safeSkip)
    .limit(limit)
    .lean();

  return res.json({
    count: prompts.length,
    pagination: {
      total,
      page: safePage,
      limit,
      totalPages,
      hasPrevPage: safePage > 1,
      hasNextPage: safePage < totalPages,
    },
    prompts,
  });
}

async function getWritingTask2OpinionByEssayId(req, res) {
  const essayId = String(req.params.essayId || "").trim();
  const prompt = await WritingTask2Opinion.findOne({ essayId }).lean();

  if (!prompt) {
    return res.status(404).json({
      message: `Prompt not found for essayId '${essayId}'`,
    });
  }

  return res.json({ prompt });
}

function getWritingTask2OpinionStructure(req, res) {
  return res.json({
    collection: "writing_task2_opinions",
    description: "Collection for IELTS Writing Task 2 opinion essay prompts.",
    structure: {
      essayId: "string (unique, required)",
      prompt: "string (required)",
      subText: "string[] (optional) - e.g. [\"Crime & Law\", \"Opinion essay\", \"40 minutes\"]",
      accessStatus: "locked | unlocked (default: locked)",
      unlockOrder: "number (required, sequence order)",
      createdAt: "Date (auto)",
      updatedAt: "Date (auto)",
    },
  });
}

async function initializeWritingTask2OpinionCollection(req, res) {
  await WritingTask2Opinion.createCollection();

  return res.status(201).json({
    message: "Collection is ready.",
    collection: "writing_task2_opinions",
  });
}

module.exports = {
  listWritingTask2Opinions,
  getWritingTask2OpinionByEssayId,
  getWritingTask2OpinionStructure,
  initializeWritingTask2OpinionCollection,
};
