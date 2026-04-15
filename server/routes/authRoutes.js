const express = require("express");
const {
  register,
  login,
  forgotPassword,
  verifyResetPasswordToken,
  resetPassword,
  refreshSession,
  logout,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/verify", verifyResetPasswordToken);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshSession);
router.post("/logout", logout);
router.get("/me", protect, getMe);

module.exports = router;
