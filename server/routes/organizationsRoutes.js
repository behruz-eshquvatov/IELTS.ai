const express = require("express");
const { searchOrganizations } = require("../controllers/organizationController");

const router = express.Router();

router.get("/search", searchOrganizations);

module.exports = router;
