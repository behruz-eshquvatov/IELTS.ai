const express = require("express");
const {
  listWritingTask2Items,
  getWritingTask2ItemById,
} = require("../controllers/writingTask2Controller");
const {
  createWritingTask2Analysis,
  getWritingTask2AnalysisById,
} = require("../controllers/writingTask2AnalysisController");
const { protect, optionalProtect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/items", optionalProtect, listWritingTask2Items);
router.get("/items/:itemId", optionalProtect, getWritingTask2ItemById);
router.post("/analyses", protect, authorizeRoles("student"), createWritingTask2Analysis);
router.get("/analyses/:analysisId", protect, authorizeRoles("student"), getWritingTask2AnalysisById);

module.exports = router;
