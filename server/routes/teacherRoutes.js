const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  listTeacherClasses,
  createTeacherClass,
  getTeacherClassDetails,
  updateTeacherClass,
  deleteTeacherClass,
  getTeacherClassOverview,
  listTeacherClassStudents,
  searchStudentsForTeacherClass,
  inviteStudentToTeacherClass,
  removeStudentFromTeacherClass,
  sendMessageToTeacherClass,
  getTeacherClassStudentProgress,
  getTeacherClassStudentAttempts,
  getTeacherClassStudentAnalytics,
  getTeacherClassHomeworkUnits,
  getTeacherClassUnitHomework,
  listTeacherNotifications,
  markTeacherNotificationRead,
  getMyTeacherProfile,
  updateMyTeacherProfile,
  updateTeacherAccountPassword,
} = require("../controllers/teacherClassController");
const { listTeacherStudents } = require("../controllers/teacherStudentDirectoryController");

const router = express.Router();

router.use(protect, authorizeRoles("teacher"));

router.get("/classes", listTeacherClasses);
router.get("/students", listTeacherStudents);
router.post("/classes", createTeacherClass);
router.get("/classes/:classId", getTeacherClassDetails);
router.put("/classes/:classId", updateTeacherClass);
router.delete("/classes/:classId", deleteTeacherClass);
router.get("/classes/:classId/overview", getTeacherClassOverview);
router.get("/classes/:classId/homework-units", getTeacherClassHomeworkUnits);
router.get("/classes/:classId/units/:unitId/homework", getTeacherClassUnitHomework);
router.get("/classes/:classId/students", listTeacherClassStudents);
router.get("/classes/:classId/students/search", searchStudentsForTeacherClass);
router.post("/classes/:classId/students/invite", inviteStudentToTeacherClass);
router.delete("/classes/:classId/students/:studentId", removeStudentFromTeacherClass);
router.post("/classes/:classId/message", sendMessageToTeacherClass);
router.get("/classes/:classId/students/:studentId/progress", getTeacherClassStudentProgress);
router.get("/classes/:classId/students/:studentId/attempts", getTeacherClassStudentAttempts);
router.get("/classes/:classId/students/:studentId/analytics", getTeacherClassStudentAnalytics);
router.get("/notifications", listTeacherNotifications);
router.patch("/notifications/:notificationId/read", markTeacherNotificationRead);
router.get("/me/profile", getMyTeacherProfile);
router.patch("/me/profile", updateMyTeacherProfile);
router.patch("/me/profile/password", updateTeacherAccountPassword);

module.exports = router;
