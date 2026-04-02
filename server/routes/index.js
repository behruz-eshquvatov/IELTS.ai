const express = require("express");
const systemRoutes = require("./systemRoutes");
const { getApiIndex } = require("../controllers/systemController");

const router = express.Router();

router.get("/", getApiIndex);
router.use("/system", systemRoutes);

module.exports = router;
