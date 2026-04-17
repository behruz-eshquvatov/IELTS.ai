const express = require("express");
const {
  listListeningTests,
  getListeningTestById,
  listListeningPartGroups,
  getListeningTestPartById,
} = require("../controllers/listeningTestController");

const router = express.Router();

router.get("/", listListeningTests);
router.get("/part-groups", listListeningPartGroups);
router.get("/:testId/parts/:partNumber", getListeningTestPartById);
router.get("/:testId", getListeningTestById);

module.exports = router;
