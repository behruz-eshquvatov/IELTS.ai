const express = require("express");
const {
  listWritingTask2Opinions,
  getWritingTask2OpinionByEssayId,
  getWritingTask2OpinionStructure,
  initializeWritingTask2OpinionCollection,
} = require("../controllers/writingTask2OpinionController");
const {
  createWritingTask2Analysis,
  getWritingTask2AnalysisById,
} = require("../controllers/writingTask2AnalysisController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", listWritingTask2Opinions);
router.get("/structure", getWritingTask2OpinionStructure);
router.post("/initialize", initializeWritingTask2OpinionCollection);
router.post("/analyses", protect, authorizeRoles("student"), createWritingTask2Analysis);
router.get(
  "/analyses/:analysisId",
  protect,
  authorizeRoles("student"),
  getWritingTask2AnalysisById,
);
router.get("/:essayId", getWritingTask2OpinionByEssayId);

module.exports = router;
