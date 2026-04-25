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
      "writing-task2",
      "writing-task1",
      "listening-blocks",
      "listening-tests",
      "reading",
      "reading-admin",
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
      myDailyTasks: "GET /api/v1/students/me/daily-tasks",
      markMyDailyTaskCompleted: "POST /api/v1/students/me/daily-tasks/tasks/complete",
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
    userRoutes: {
      myHeatmap: "GET /api/v1/users/me/heatmap?year=2026",
      updateHeatmapDay: "POST /api/v1/users/me/heatmap/day",
    },
    writingTask2OpinionRoutes: {
      list: "/api/v1/writing-task2-opinion",
      byEssayId: "/api/v1/writing-task2-opinion/:essayId",
      structure: "/api/v1/writing-task2-opinion/structure",
      initializeCollection: "/api/v1/writing-task2-opinion/initialize",
      createAnalysis: "POST /api/v1/writing-task2-opinion/analyses",
      analysisById: "GET /api/v1/writing-task2-opinion/analyses/:analysisId",
    },
    writingTask2Routes: {
      listItems: "/api/v1/writing-task2/items?status=published",
      itemById: "/api/v1/writing-task2/items/:itemId?status=published",
    },
    writingTask1Routes: {
      listItems: "/api/v1/writing-task1/items?status=published",
      itemById: "/api/v1/writing-task1/items/:itemId?status=published",
      streamVisual: "/api/v1/writing-task1/visuals/:imageId",
    },
    listeningBlocksRoutes: {
      listFamilies: "/api/v1/listening-blocks (without questionFamily)",
      listFamiliesLegacy: "/api/v1/listening-blocks/families",
      listBlocks: "/api/v1/listening-blocks?questionFamily=form_completion&blockType=gap_fill",
      practiceByTypes: "/api/v1/listening-blocks/practice?blockTypes=form_completion,note_completion,table_completion,sentence_completion",
      byBlockId: "/api/v1/listening-blocks/:blockId",
      streamAudio: "/api/v1/listening-blocks/:blockId/audio",
    },
    listeningTestsRoutes: {
      list: "/api/v1/listening-tests?status=published",
      partGroups: "/api/v1/listening-tests/part-groups?status=published",
      testPartById: "/api/v1/listening-tests/:testId/parts/:partNumber?status=published",
      byTestId: "/api/v1/listening-tests/:testId",
    },
    readingRoutes: {
      fullTests: "/api/v1/reading/full-tests?status=published",
      fullTestById: "/api/v1/reading/full-tests/:testId?status=published",
      passagesWithBlocks: "/api/v1/reading/passages-with-blocks?status=published",
      passageTaskById: "/api/v1/reading/passages-with-blocks?passageId=rc_cmbr_10_1_1",
      passagesWithBlocksByTest: "/api/v1/reading/passages-with-blocks?testId=rc_cmbr_10_1",
      practiceByFamily: "/api/v1/reading/practice?questionFamily=multiple_choice",
      practiceByType: "/api/v1/reading/practice?blockType=true_false_not_given",
      practiceTaskByPassage: "/api/v1/reading/practice?questionFamilies=matching&passageId=rc_cmbr_10_1_1",
      practiceByTypes: "/api/v1/reading/practice?blockTypes=summary_completion,note_completion,table_completion,flow_chart_completion",
    },
    readingAdminRoutes: {
      status: "/api/v1/super-admin/:password/reading",
      listPassages: "/api/v1/super-admin/:password/reading/passages",
      listBlocks: "/api/v1/super-admin/:password/reading/blocks",
      listTests: "/api/v1/super-admin/:password/reading/tests",
      extractPassageFromImage: "POST /api/v1/super-admin/:password/reading/passages/extract",
      extractBlockFromImage: "POST /api/v1/super-admin/:password/reading/blocks/extract",
      savePassage: "POST /api/v1/super-admin/:password/reading/passages",
      saveBlock: "POST /api/v1/super-admin/:password/reading/blocks",
      saveTest: "POST /api/v1/super-admin/:password/reading/tests",
    },
    writingTask1AdminRoutes: {
      status: "/api/v1/super-admin/:password/writing-task1",
      listItems: "/api/v1/super-admin/:password/writing-task1/items",
      listVisuals: "/api/v1/super-admin/:password/writing-task1/visuals",
      deleteVisual: "DELETE /api/v1/super-admin/:password/writing-task1/visuals/:imageId",
      extractQuestionTopic: "POST /api/v1/super-admin/:password/writing-task1/extract-question-topic",
      uploadVisual: "POST /api/v1/super-admin/:password/writing-task1/visuals",
      saveItem: "POST /api/v1/super-admin/:password/writing-task1/items",
    },
    writingTask2AdminRoutes: {
      status: "/api/v1/super-admin/:password/writing-task2",
      listItems: "/api/v1/super-admin/:password/writing-task2/items",
      itemById: "/api/v1/super-admin/:password/writing-task2/items/:itemId",
      extractFromImage: "POST /api/v1/super-admin/:password/writing-task2/extract-image",
      extractFromText: "POST /api/v1/super-admin/:password/writing-task2/extract-text",
      saveItem: "POST /api/v1/super-admin/:password/writing-task2/items",
      deleteItem: "DELETE /api/v1/super-admin/:password/writing-task2/items/:itemId",
    },
    dailyUnitsAdminRoutes: {
      listSources: "GET /api/v1/super-admin/:password/daily-units/sources",
      listUnits: "GET /api/v1/super-admin/:password/daily-units",
      createUnit: "POST /api/v1/super-admin/:password/daily-units",
      updateUnit: "PUT /api/v1/super-admin/:password/daily-units/:unitId",
      deleteUnit: "DELETE /api/v1/super-admin/:password/daily-units/:unitId",
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
