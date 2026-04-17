const express = require("express");
const systemRoutes = require("./systemRoutes");
const studentRoutes = require("./studentRoutes");
const authRoutes = require("./authRoutes");
const writingTask2OpinionRoutes = require("./writingTask2OpinionRoutes");
const listeningBlockRoutes = require("./listeningBlockRoutes");
const listeningTestRoutes = require("./listeningTestRoutes");
const readingRoutes = require("./readingRoutes");
const superAdminRoutes = require("./superAdminRoutes");
const userRoutes = require("./userRoutes");
const { getApiIndex } = require("../controllers/systemController");

const router = express.Router();

router.get("/", getApiIndex);
router.use("/auth", authRoutes);
router.use("/system", systemRoutes);
router.use("/students", studentRoutes);
router.use("/writing-task2-opinion", writingTask2OpinionRoutes);
router.use("/listening-blocks", listeningBlockRoutes);
router.use("/listening-tests", listeningTestRoutes);
router.use("/reading", readingRoutes);
router.use("/super-admin", superAdminRoutes);
router.use("/users", userRoutes);

module.exports = router;
