const express = require("express");
const {
  listListeningQuestionFamilies,
  listListeningBlocks,
  listListeningPracticeBlocks,
  getListeningBlockById,
  submitListeningBlockAttempt,
  getLatestListeningBlockAttempt,
  streamListeningBlockAudio,
} = require("../controllers/listeningBlockController");
const { protect, optionalProtect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/families", optionalProtect, listListeningQuestionFamilies);
router.get("/practice", optionalProtect, listListeningPracticeBlocks);
router.get("/:blockId/audio", streamListeningBlockAudio);
router.get("/:blockId/attempts/latest", protect, authorizeRoles("student"), getLatestListeningBlockAttempt);
router.post("/:blockId/submit", protect, authorizeRoles("student"), submitListeningBlockAttempt);
router.get("/:blockId", optionalProtect, getListeningBlockById);
router.get("/", optionalProtect, listListeningBlocks);

module.exports = router;
