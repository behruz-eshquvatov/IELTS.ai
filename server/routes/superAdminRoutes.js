const express = require("express");
const {
  getSuperAdminStatus,
  listListeningAudios,
  uploadListeningAudio,
  streamListeningAudio,
  deleteListeningAudio,
  extractListeningBlockFromImage,
  saveListeningBlock,
  listListeningBlocks,
  listListeningTests,
  saveListeningTest,
  getWritingTask1AdminEntry,
  listWritingTask1Items,
  listWritingTask1Visuals,
  deleteWritingTask1Visual,
  extractWritingTask1QuestionTopic,
  uploadWritingTask1Visual,
  saveWritingTask1Item,
  getWritingTask2AdminEntry,
  listWritingTask2Items,
  getWritingTask2ItemById,
  extractWritingTask2FromImage,
  extractWritingTask2FromText,
  saveWritingTask2Item,
  deleteWritingTask2Item,
  getReadingAdminEntry,
  listReadingPassages,
  listReadingBlocks,
  listReadingTests,
  extractReadingPassageFromImage,
  extractReadingBlockFromImage,
  saveReadingPassage,
  saveReadingBlock,
  saveReadingTest,
  listDailyTaskUnitSources,
  listDailyTaskUnits,
  createDailyTaskUnit,
  updateDailyTaskUnit,
  deleteDailyTaskUnit,
} = require("../controllers/superAdminController");

const router = express.Router();

const parseRawAudio = express.raw({
  type(req) {
    const contentType = String(req.headers["content-type"] || "");
    return contentType.startsWith("audio/");
  },
  limit: "50mb",
});

function parseListeningAudioUpload(req, res, next) {
  parseRawAudio(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Audio upload failed.",
      });
    }

    return next();
  });
}

const parseRawImage = express.raw({
  type(req) {
    const contentType = String(req.headers["content-type"] || "");
    return contentType.startsWith("image/");
  },
  limit: "20mb",
});

function parseListeningImageUpload(req, res, next) {
  parseRawImage(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        message: error.message || "Image upload failed.",
      });
    }

    return next();
  });
}

router.get("/:password", getSuperAdminStatus);
router.get("/:password/listening", listListeningAudios);
router.post("/:password/listening", parseListeningAudioUpload, uploadListeningAudio);
router.post("/:password/listening/blocks/extract", parseListeningImageUpload, extractListeningBlockFromImage);
router.post("/:password/listening/blocks", saveListeningBlock);
router.get("/:password/listening/blocks", listListeningBlocks);
router.get("/:password/listening/tests", listListeningTests);
router.post("/:password/listening/tests", saveListeningTest);
router.get("/:password/listening/:audioId/stream", streamListeningAudio);
router.delete("/:password/listening/:audioId", deleteListeningAudio);
router.get("/:password/writing-task1", getWritingTask1AdminEntry);
router.get("/:password/writing-task1/items", listWritingTask1Items);
router.get("/:password/writing-task1/visuals", listWritingTask1Visuals);
router.delete("/:password/writing-task1/visuals/:imageId", deleteWritingTask1Visual);
router.post("/:password/writing-task1/extract-question-topic", parseListeningImageUpload, extractWritingTask1QuestionTopic);
router.post("/:password/writing-task1/visuals", parseListeningImageUpload, uploadWritingTask1Visual);
router.post("/:password/writing-task1/items", saveWritingTask1Item);
router.get("/:password/writing-task2", getWritingTask2AdminEntry);
router.get("/:password/writing-task2/items", listWritingTask2Items);
router.get("/:password/writing-task2/items/:itemId", getWritingTask2ItemById);
router.post("/:password/writing-task2/extract-image", parseListeningImageUpload, extractWritingTask2FromImage);
router.post("/:password/writing-task2/extract-text", extractWritingTask2FromText);
router.post("/:password/writing-task2/items", saveWritingTask2Item);
router.delete("/:password/writing-task2/items/:itemId", deleteWritingTask2Item);
router.get("/:password/reading", getReadingAdminEntry);
router.get("/:password/reading/passages", listReadingPassages);
router.get("/:password/reading/blocks", listReadingBlocks);
router.get("/:password/reading/tests", listReadingTests);
router.post("/:password/reading/passages/extract", parseListeningImageUpload, extractReadingPassageFromImage);
router.post("/:password/reading/blocks/extract", parseListeningImageUpload, extractReadingBlockFromImage);
router.post("/:password/reading/passages", saveReadingPassage);
router.post("/:password/reading/blocks", saveReadingBlock);
router.post("/:password/reading/tests", saveReadingTest);
router.get("/:password/daily-units/sources", listDailyTaskUnitSources);
router.get("/:password/daily-units", listDailyTaskUnits);
router.post("/:password/daily-units", createDailyTaskUnit);
router.put("/:password/daily-units/:unitId", updateDailyTaskUnit);
router.delete("/:password/daily-units/:unitId", deleteDailyTaskUnit);

module.exports = router;
