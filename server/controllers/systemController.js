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
      "listening-blocks",
      "listening-tests",
      "system",
    ],
    authRoutes: {
      register: "/api/v1/auth/register",
      login: "/api/v1/auth/login",
      forgotPassword: "POST /api/v1/auth/forgot-password",
      verifyResetToken: "POST /api/v1/auth/reset-password/verify",
      resetPassword: "POST /api/v1/auth/reset-password",
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
      analytics: "/api/v1/students/:studentId/analytics?range=week&part=Listening&year=2026",
      studyVisit: "POST /api/v1/students/:studentId/study-activity/visit",
      studyTaskTime: "POST /api/v1/students/:studentId/study-activity/task-time",
      studyHeatmap: "GET /api/v1/students/:studentId/study-activity/heatmap?year=2026",
      myStudyVisit: "POST /api/v1/students/me/study-activity/visit",
      myStudyTaskTime: "POST /api/v1/students/me/study-activity/task-time",
      myStudyHeatmap: "GET /api/v1/students/me/study-activity/heatmap?year=2026",
    },
    writingTask2OpinionRoutes: {
      list: "/api/v1/writing-task2-opinion",
      byEssayId: "/api/v1/writing-task2-opinion/:essayId",
      structure: "/api/v1/writing-task2-opinion/structure",
      initializeCollection: "/api/v1/writing-task2-opinion/initialize",
      createAnalysis: "POST /api/v1/writing-task2-opinion/analyses",
      analysisById: "GET /api/v1/writing-task2-opinion/analyses/:analysisId",
    },
    listeningBlocksRoutes: {
      listFamilies: "/api/v1/listening-blocks (without questionFamily)",
      listFamiliesLegacy: "/api/v1/listening-blocks/families",
      listBlocks: "/api/v1/listening-blocks?questionFamily=form_completion&blockType=gap_fill",
      byBlockId: "/api/v1/listening-blocks/:blockId",
      streamAudio: "/api/v1/listening-blocks/:blockId/audio",
    },
    listeningTestsRoutes: {
      list: "/api/v1/listening-tests?status=published",
      byTestId: "/api/v1/listening-tests/:testId",
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
