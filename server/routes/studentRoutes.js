const express = require("express");
const {
  getMyStudentProfile,
  getStudentProfile,
  updateStudentProfile,
  getStudentDailyTasks,
  updateStudentDailyTasks,
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
router.post("/me/study-activity/visit", protect, authorizeRoles("student"), markMyStudyVisit);
router.post("/me/study-activity/task-time", protect, authorizeRoles("student"), addMyTaskStudyTime);
router.get("/me/study-activity/heatmap", protect, authorizeRoles("student"), getMyStudyHeatmap);

router.get("/:studentId/profile", protect, authorizeRoles("teacher", "student"), getStudentProfile);
router.put("/:studentId/profile", protect, authorizeRoles("teacher", "student"), updateStudentProfile);

router.get("/:studentId/daily-tasks", protect, authorizeRoles("teacher", "student"), getStudentDailyTasks);
router.put("/:studentId/daily-tasks", protect, authorizeRoles("teacher", "student"), updateStudentDailyTasks);
router.patch(
  "/:studentId/daily-tasks/units/:unitId/tasks/:taskId/status",
  protect,
  authorizeRoles("teacher", "student"),
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
