const express = require("express");
const {
  listListeningQuestionFamilies,
  listListeningBlocks,
  getListeningBlockById,
  submitListeningBlockAttempt,
  getLatestListeningBlockAttempt,
  streamListeningBlockAudio,
} = require("../controllers/listeningBlockController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/families", listListeningQuestionFamilies);
router.get("/:blockId/audio", streamListeningBlockAudio);
router.get("/:blockId/attempts/latest", protect, authorizeRoles("student"), getLatestListeningBlockAttempt);
router.post("/:blockId/submit", protect, authorizeRoles("student"), submitListeningBlockAttempt);
router.get("/:blockId", getListeningBlockById);
router.get("/", listListeningBlocks);

module.exports = router;
