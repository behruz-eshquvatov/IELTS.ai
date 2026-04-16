const express = require("express");
const { getMyHeatmap, upsertMyHeatmapDay } = require("../controllers/userController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me/heatmap", protect, authorizeRoles("student", "teacher"), getMyHeatmap);
router.post("/me/heatmap/day", protect, authorizeRoles("student", "teacher"), upsertMyHeatmapDay);

module.exports = router;
