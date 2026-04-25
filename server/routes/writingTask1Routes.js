const express = require("express");
const {
  listWritingTask1Items,
  getWritingTask1ItemById,
  streamWritingTask1Visual,
} = require("../controllers/writingTask1Controller");
const {
  createWritingTask1Analysis,
  getWritingTask1AnalysisById,
} = require("../controllers/writingTask1AnalysisController");
const { protect, optionalProtect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/items", optionalProtect, listWritingTask1Items);
router.get("/items/:itemId", optionalProtect, getWritingTask1ItemById);
router.get("/visuals/:imageId", streamWritingTask1Visual);
router.post("/analyses", protect, authorizeRoles("student"), createWritingTask1Analysis);
router.get("/analyses/:analysisId", protect, authorizeRoles("student"), getWritingTask1AnalysisById);

module.exports = router;
