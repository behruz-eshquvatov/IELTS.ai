const express = require("express");
const systemRoutes = require("./systemRoutes");
const studentRoutes = require("./studentRoutes");
const authRoutes = require("./authRoutes");
const writingTask2OpinionRoutes = require("./writingTask2OpinionRoutes");
const { getApiIndex } = require("../controllers/systemController");

const router = express.Router();

router.get("/", getApiIndex);
router.use("/auth", authRoutes);
router.use("/system", systemRoutes);
router.use("/students", studentRoutes);
router.use("/writing-task2-opinion", writingTask2OpinionRoutes);

module.exports = router;
