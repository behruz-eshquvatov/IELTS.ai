const express = require("express");
const {
  listFullReadingTests,
  getFullReadingTestById,
  listReadingPassagesWithBlocks,
  listReadingPracticeGroups,
} = require("../controllers/readingController");

const router = express.Router();

router.get("/full-tests", listFullReadingTests);
router.get("/full-tests/:testId", getFullReadingTestById);
router.get("/passages-with-blocks", listReadingPassagesWithBlocks);
router.get("/practice", listReadingPracticeGroups);

module.exports = router;
