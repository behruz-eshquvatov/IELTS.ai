const express = require("express");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  listMyNotifications,
  markNotificationRead,
  respondToClassJoinRequest,
  listMyClassMemberships,
  leaveMyClass,
} = require("../controllers/teacherClassController");

const router = express.Router();

router.use(protect, authorizeRoles("student"));

router.get("/notifications", listMyNotifications);
router.patch("/notifications/:notificationId/read", markNotificationRead);
router.post("/class-join-requests/:requestId/respond", respondToClassJoinRequest);
router.get("/classes/memberships", listMyClassMemberships);
router.post("/classes/:classId/leave", leaveMyClass);

module.exports = router;
