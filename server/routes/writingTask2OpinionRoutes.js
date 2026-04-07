const express = require("express");
const {
  listWritingTask2Opinions,
  getWritingTask2OpinionByEssayId,
  getWritingTask2OpinionStructure,
  initializeWritingTask2OpinionCollection,
} = require("../controllers/writingTask2OpinionController");

const router = express.Router();

router.get("/", listWritingTask2Opinions);
router.get("/structure", getWritingTask2OpinionStructure);
router.post("/initialize", initializeWritingTask2OpinionCollection);
router.get("/:essayId", getWritingTask2OpinionByEssayId);

module.exports = router;
