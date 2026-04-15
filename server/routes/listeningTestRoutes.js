const express = require("express");
const {
  listListeningTests,
  getListeningTestById,
} = require("../controllers/listeningTestController");

const router = express.Router();

router.get("/", listListeningTests);
router.get("/:testId", getListeningTestById);

module.exports = router;
