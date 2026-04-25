const express = require("express");
const {
  getMyStudentProfile,
  updateMyAccountProfile,
  updateMyAccountPassword,
  getStudentProfile,
  updateStudentProfile,
  getStudentDailyTasks,
  getMyStudentDailyTasks,
  createMyDailyTaskAttempt,
  getMyRecentCompletedDailyTasks,
  listMyTaskAttempts,
  listMyResultsCenterGroups,
  listMyResultsCenterTaskAttempts,
  getMyResultsCenterAttemptDetail,
  getMyResultsCenterWritingRedirect,
  listMyTaskResultHistory,
  getMyTaskResultDetail,
  updateStudentDailyTasks,
  markMyDailyTaskCompleted,
  updateTaskStatus,
  getStudentAnalytics,
  updateStudentAnalytics,
  markStudyVisit,
  addTaskStudyTime,
  getStudyHeatmap,
  markMyStudyVisit,
  addMyTaskStudyTime,
  getMyStudyHeatmap,
  seedStudentData,
  listStudents,
} = require("../controllers/studentController");
const { protect, authorizeRoles, authorizeSelfOrTeacher } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, authorizeRoles("teacher"), listStudents);
router.post("/:studentId/seed", seedStudentData);
router.get("/me/profile", protect, authorizeRoles("student"), getMyStudentProfile);
router.patch("/me/profile", protect, authorizeRoles("student"), updateMyAccountProfile);
router.patch("/me/profile/password", protect, authorizeRoles("student"), updateMyAccountPassword);
router.get("/me/daily-tasks", protect, authorizeRoles("student"), getMyStudentDailyTasks);
router.get("/me/daily-tasks/recent-completed", protect, authorizeRoles("student"), getMyRecentCompletedDailyTasks);
router.get("/me/task-attempts/recent-completed", protect, authorizeRoles("student"), getMyRecentCompletedDailyTasks);
router.get("/me/task-attempts", protect, authorizeRoles("student"), listMyTaskAttempts);
router.get("/me/results", protect, authorizeRoles("student"), listMyResultsCenterGroups);
router.get("/me/results/:taskGroupId/attempts", protect, authorizeRoles("student"), listMyResultsCenterTaskAttempts);
router.get(
  "/me/results/:taskGroupId/attempts/:attemptRef",
  protect,
  authorizeRoles("student"),
  getMyResultsCenterAttemptDetail,
);
router.get(
  "/me/results/:taskGroupId/writing-redirect",
  protect,
  authorizeRoles("student"),
  getMyResultsCenterWritingRedirect,
);
router.get("/me/results/history", protect, authorizeRoles("student"), listMyTaskResultHistory);
router.get("/me/results/task-detail", protect, authorizeRoles("student"), getMyTaskResultDetail);
router.post("/me/daily-tasks/attempts", protect, authorizeRoles("student"), createMyDailyTaskAttempt);
router.post("/me/daily-tasks/tasks/complete", protect, authorizeRoles("student"), markMyDailyTaskCompleted);
router.post("/me/study-activity/visit", protect, authorizeRoles("student"), markMyStudyVisit);
router.post("/me/study-activity/task-time", protect, authorizeRoles("student"), addMyTaskStudyTime);
router.get("/me/study-activity/heatmap", protect, authorizeRoles("student"), getMyStudyHeatmap);

router.get("/:studentId/profile", protect, authorizeRoles("teacher", "student"), getStudentProfile);
router.put("/:studentId/profile", protect, authorizeRoles("teacher", "student"), updateStudentProfile);

router.get(
  "/:studentId/daily-tasks",
  protect,
  authorizeRoles("teacher", "student"),
  authorizeSelfOrTeacher("studentId"),
  getStudentDailyTasks,
);
router.put(
  "/:studentId/daily-tasks",
  protect,
  authorizeRoles("teacher", "student"),
  authorizeSelfOrTeacher("studentId"),
  updateStudentDailyTasks,
);
router.patch(
  "/:studentId/daily-tasks/units/:unitId/tasks/:taskId/status",
  protect,
  authorizeRoles("teacher", "student"),
  authorizeSelfOrTeacher("studentId"),
  updateTaskStatus,
);

router.get("/:studentId/analytics", protect, authorizeRoles("teacher", "student"), getStudentAnalytics);
router.put("/:studentId/analytics", protect, authorizeRoles("teacher", "student"), updateStudentAnalytics);
router.post(
  "/:studentId/study-activity/visit",
  protect,
  authorizeRoles("teacher", "student"),
  authorizeSelfOrTeacher("studentId"),
  markStudyVisit,
);
router.post(
  "/:studentId/study-activity/task-time",
  protect,
  authorizeRoles("teacher", "student"),
  authorizeSelfOrTeacher("studentId"),
  addTaskStudyTime,
);
router.get(
  "/:studentId/study-activity/heatmap",
  protect,
  authorizeRoles("teacher", "student"),
  authorizeSelfOrTeacher("studentId"),
  getStudyHeatmap,
);

module.exports = router;
