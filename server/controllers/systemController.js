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
      "students",
      "analytics",
      "writing-task2-opinion",
      "system",
    ],
    authRoutes: {
      register: "/api/v1/auth/register",
      login: "/api/v1/auth/login",
      refresh: "/api/v1/auth/refresh",
      logout: "/api/v1/auth/logout",
      me: "/api/v1/auth/me",
    },
    studentRoutes: {
      list: "/api/v1/students",
      seed: "/api/v1/students/:studentId/seed",
      myProfile: "/api/v1/students/me/profile",
      profile: "/api/v1/students/:studentId/profile",
      dailyTasks: "/api/v1/students/:studentId/daily-tasks",
      analytics: "/api/v1/students/:studentId/analytics?range=week&part=Listening",
      studyVisit: "POST /api/v1/students/:studentId/study-activity/visit",
      studyTaskTime: "POST /api/v1/students/:studentId/study-activity/task-time",
      studyHeatmap: "GET /api/v1/students/:studentId/study-activity/heatmap",
    },
    writingTask2OpinionRoutes: {
      list: "/api/v1/writing-task2-opinion",
      byEssayId: "/api/v1/writing-task2-opinion/:essayId",
      structure: "/api/v1/writing-task2-opinion/structure",
      initializeCollection: "/api/v1/writing-task2-opinion/initialize",
      createAnalysis: "POST /api/v1/writing-task2-opinion/analyses",
      analysisById: "GET /api/v1/writing-task2-opinion/analyses/:analysisId",
    },
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
