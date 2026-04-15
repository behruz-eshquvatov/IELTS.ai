const express = require("express");
const systemRoutes = require("./systemRoutes");
const studentRoutes = require("./studentRoutes");
const authRoutes = require("./authRoutes");
const writingTask2OpinionRoutes = require("./writingTask2OpinionRoutes");
const listeningBlockRoutes = require("./listeningBlockRoutes");
const listeningTestRoutes = require("./listeningTestRoutes");
const superAdminRoutes = require("./superAdminRoutes");
const { getApiIndex } = require("../controllers/systemController");

const router = express.Router();

router.get("/", getApiIndex);
router.use("/auth", authRoutes);
router.use("/system", systemRoutes);
router.use("/students", studentRoutes);
router.use("/writing-task2-opinion", writingTask2OpinionRoutes);
router.use("/listening-blocks", listeningBlockRoutes);
router.use("/listening-tests", listeningTestRoutes);
router.use("/super-admin", superAdminRoutes);

module.exports = router;
