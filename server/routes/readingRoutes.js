const express = require("express");
const {
  listFullReadingTests,
  getFullReadingTestById,
  listReadingPassagesWithBlocks,
  listReadingPracticeGroups,
  submitFullReadingTestAttempt,
} = require("../controllers/readingController");
const { protect, optionalProtect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/full-tests", optionalProtect, listFullReadingTests);
router.get("/full-tests/:testId", optionalProtect, getFullReadingTestById);
router.post("/full-tests/:testId/submit", protect, authorizeRoles("student"), submitFullReadingTestAttempt);
router.get("/passages-with-blocks", optionalProtect, listReadingPassagesWithBlocks);
router.get("/practice", optionalProtect, listReadingPracticeGroups);

module.exports = router;
