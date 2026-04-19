const express = require("express");
const {
  listFullReadingTests,
  getFullReadingTestById,
  listReadingPassagesWithBlocks,
  listReadingPracticeGroups,
  submitFullReadingTestAttempt,
} = require("../controllers/readingController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/full-tests", listFullReadingTests);
router.get("/full-tests/:testId", getFullReadingTestById);
router.post("/full-tests/:testId/submit", protect, authorizeRoles("student"), submitFullReadingTestAttempt);
router.get("/passages-with-blocks", listReadingPassagesWithBlocks);
router.get("/practice", listReadingPracticeGroups);

module.exports = router;
