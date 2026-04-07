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
  seedStudentData,
  listStudents,
} = require("../controllers/studentController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, authorizeRoles("teacher"), listStudents);
router.post("/:studentId/seed", seedStudentData);
router.get("/me/profile", protect, authorizeRoles("student"), getMyStudentProfile);

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

module.exports = router;
