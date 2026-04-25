const express = require("express");
const {
  listListeningTests,
  getListeningTestById,
  listListeningPartGroups,
  getListeningTestPartById,
  submitListeningTestAttempt,
} = require("../controllers/listeningTestController");
const { protect, optionalProtect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", optionalProtect, listListeningTests);
router.get("/part-groups", optionalProtect, listListeningPartGroups);
router.post("/:testId/submit", protect, authorizeRoles("student"), submitListeningTestAttempt);
router.get("/:testId/parts/:partNumber", optionalProtect, getListeningTestPartById);
router.get("/:testId", optionalProtect, getListeningTestById);

module.exports = router;
