const mongoose = require("mongoose");

function getDatabaseState() {
  const readyState = mongoose.connection.readyState;

  if (readyState === 1) {
    return "connected";
  }

  if (readyState === 2) {
    return "connecting";
  }

  return "disconnected";
}

function getApiIndex(req, res) {
  res.json({
    version: "v1",
    service: "IELTS Platform API",
    modules: [
      "auth",
      "users",
      "classes",
      "tests",
      "assignments",
      "attempts",
      "reports",
      "recommendations",
      "analytics",
      "system",
    ],
    health: "/api/v1/system/health",
  });
}

function getHealth(req, res) {
  res.json({
    status: "ok",
    version: "v1",
    service: "IELTS Platform API",
    database: getDatabaseState(),
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getApiIndex,
  getHealth,
};
