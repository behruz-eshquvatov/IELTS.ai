const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/userModel");
const { Organization } = require("../models/organizationModel");
const StudentProfile = require("../models/studentProfileModel");
const StudentAnalytics = require("../models/studentAnalyticsModel");
const { studentAnalyticsSeed } = require("../data/studentSeedData");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
} = require("../utils/authTokens");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TTL_MINUTES = Number.parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || "30", 10);

function sanitizeUser(userDoc) {
  return {
    id: String(userDoc._id),
    fullName: userDoc.fullName,
    email: userDoc.email,
    role: userDoc.role,
    organization: userDoc.organization || "",
    organizationId: userDoc.organizationId ? String(userDoc.organizationId) : "",
    organizationName: userDoc.organizationName || "",
    createdAt: userDoc.createdAt,
  };
}

function setRefreshCookie(res, refreshToken, rememberMe) {
  res.cookie("refreshToken", refreshToken, getRefreshCookieOptions({ rememberMe }));
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/auth",
  });
}

function buildDefaultStudentProfile(userDoc) {
  return {
    studentId: String(userDoc.email).toLowerCase().trim(),
    fullName: userDoc.fullName,
    email: String(userDoc.email).toLowerCase().trim(),
    bio: "",
    memberSince: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    subscription: {
      planName: "Student subscription",
      monthlyPrice: 19,
      teacherMonthlyPrice: 39,
      status: "Active subscription",
      benefits: [
        "Skill-based Listening, Reading, and Writing practice",
        "Structured feedback with weak-pattern visibility",
        "Progress tracking, timing behavior, and retry history",
      ],
    },
    paymentMethod: {
      cardMasked: "**** **** **** 4821",
      label: "Primary payment method",
    },
    security: {
      passwordMasked: "************",
      lastUpdatedLabel: "Recently updated",
    },
    billingHistory: [],
  };
}

function cloneSeed(value) {
  return JSON.parse(JSON.stringify(value));
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function buildResetPath(role) {
  return role === "teacher" ? "/teachers/reset-password" : "/student/reset-password";
}

function buildResetUrl({ role, token }) {
  const clientOrigin = (process.env.CLIENT_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");
  const search = new URLSearchParams({ token }).toString();
  return `${clientOrigin}${buildResetPath(role)}?${search}`;
}

function clearPasswordResetFields(userDoc) {
  userDoc.resetPasswordTokenHash = "";
  userDoc.resetPasswordExpiresAt = null;
}

async function issueSession(res, userDoc, options = {}) {
  const rememberMe = options.rememberMe !== false;
  const accessToken = signAccessToken(userDoc);
  const refreshToken = signRefreshToken(userDoc, { rememberMe });
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  await User.updateOne(
    { _id: userDoc._id },
    { $set: { refreshTokenHash } },
  );

  setRefreshCookie(res, refreshToken, rememberMe);

  return {
    accessToken,
    rememberMe,
    user: sanitizeUser(userDoc),
  };
}

function validateRegisterInput(body) {
  const errors = [];

  if (!body.fullName || body.fullName.trim().length < 2) {
    errors.push("Full name must be at least 2 characters.");
  }

  if (!EMAIL_REGEX.test(body.email || "")) {
    errors.push("Please provide a valid email address.");
  }

  if (!["student", "teacher"].includes(body.role)) {
    errors.push("Role must be either student or teacher.");
  }

  if (!PASSWORD_REGEX.test(body.password || "")) {
    errors.push("Password must be at least 8 characters and include at least one letter and one number.");
  }

  if (body.password !== body.confirmPassword) {
    errors.push("Password confirmation does not match.");
  }

  if (body.role === "teacher") {
    const organizationId = String(body.organizationId || "").trim();
    if (!organizationId) {
      errors.push("Organization is required for teacher accounts.");
    } else if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      errors.push("Organization id is invalid.");
    }
  }

  return errors;
}

async function register(req, res) {
  const body = req.body || {};
  const rememberMe = body.rememberMe !== false;
  const errors = validateRegisterInput(body);

  if (errors.length) {
    return res.status(400).json({
      message: "Validation failed.",
      errors,
    });
  }

  const email = String(body.email).toLowerCase().trim();
  const existingUser = await User.findOne({ email }).lean();
  if (existingUser) {
    return res.status(409).json({
      message: "This email is already registered.",
    });
  }

  let organizationDoc = null;
  if (body.role === "teacher") {
    const organizationId = String(body.organizationId || "").trim();
    organizationDoc = await Organization.findOne({
      _id: organizationId,
      status: "active",
    }).lean();

    if (!organizationDoc) {
      return res.status(400).json({
        message: "Please select a valid organization from the list.",
        errors: ["Please select a valid organization from the list."],
      });
    }
  }

  const user = await User.create({
    fullName: body.fullName.trim(),
    email,
    password: body.password,
    role: body.role,
    organization: body.role === "teacher" ? String(organizationDoc?.name || "") : "",
    organizationId: body.role === "teacher" ? organizationDoc?._id : null,
    organizationName: body.role === "teacher" ? String(organizationDoc?.name || "") : "",
  });

  if (user.role === "student") {
    const starterProfile = buildDefaultStudentProfile(user);
    const starterAnalytics = {
      studentId: starterProfile.studentId,
      ranges: cloneSeed(studentAnalyticsSeed.ranges),
      heatmap: {
        months: [],
        activityData: [],
      },
      studyActivity: {
        entries: [],
      },
    };

    await StudentProfile.updateOne(
      { studentId: starterProfile.studentId },
      { $setOnInsert: starterProfile },
      { upsert: true },
    );

    await StudentAnalytics.updateOne(
      { studentId: starterProfile.studentId },
      { $setOnInsert: starterAnalytics },
      { upsert: true },
    );
  }

  const session = await issueSession(res, user, { rememberMe });
  return res.status(201).json({
    message: "Account created successfully.",
    ...session,
  });
}

async function login(req, res) {
  const body = req.body || {};
  const rememberMe = body.rememberMe === true;
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  const role = body.role;

  if (!EMAIL_REGEX.test(email) || !password) {
    return res.status(400).json({
      message: "Email and password are required.",
    });
  }

  if (!["student", "teacher"].includes(role)) {
    return res.status(400).json({
      message: "Role must be either student or teacher.",
    });
  }

  const user = await User.findOne({ email }).select("+password +refreshTokenHash");
  if (!user || !user.isActive) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  if (user.role !== role) {
    return res.status(403).json({
      message: `This account is registered as ${user.role}.`,
    });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid email or password.",
    });
  }

  const session = await issueSession(res, user, { rememberMe });
  return res.json({
    message: "Logged in successfully.",
    ...session,
  });
}

async function refreshSession(req, res) {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({
      message: "Refresh token is missing.",
    });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.sub).select("+refreshTokenHash");

    if (!user || !user.isActive || !user.refreshTokenHash) {
      clearRefreshCookie(res);
      return res.status(401).json({
        message: "Session is no longer valid.",
      });
    }

    const matches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!matches) {
      clearRefreshCookie(res);
      return res.status(401).json({
        message: "Refresh token mismatch.",
      });
    }

    const rememberMe = payload?.rmb !== false;
    const session = await issueSession(res, user, { rememberMe });
    return res.json({
      message: "Session refreshed.",
      ...session,
    });
  } catch (error) {
    clearRefreshCookie(res);
    return res.status(401).json({
      message: "Refresh token is invalid or expired.",
    });
  }
}

async function logout(req, res) {
  const refreshToken = req.cookies?.refreshToken;

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await User.updateOne(
        { _id: payload.sub },
        { $set: { refreshTokenHash: "" } },
      );
    } catch (error) {
      // Silent: cookie may already be invalid, but logout should still succeed.
    }
  }

  clearRefreshCookie(res);
  return res.json({
    message: "Logged out successfully.",
  });
}

async function forgotPassword(req, res) {
  const email = String(req.body?.email || "").toLowerCase().trim();
  const role = req.body?.role;

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      message: "Please provide a valid email address.",
    });
  }

  if (role && !["student", "teacher"].includes(role)) {
    return res.status(400).json({
      message: "Role must be either student or teacher.",
    });
  }

  const query = role ? { email, role } : { email };
  const user = await User.findOne(query).select("+resetPasswordTokenHash +resetPasswordExpiresAt");
  if (!user || !user.isActive) {
    return res.json({
      message: "If that email exists, a password reset link has been sent.",
    });
  }

  const token = crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  const resetUrl = buildResetUrl({ role: user.role, token });

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = expiresAt;
  await user.save();

  // TODO: Replace console delivery with email provider integration.
  console.info(`[auth] Password reset link for ${user.email}: ${resetUrl}`);

  const isDev = process.env.NODE_ENV !== "production";

  return res.json({
    message: "If that email exists, a password reset link has been sent.",
    ...(isDev
      ? {
          resetUrl,
          expiresAt: expiresAt.toISOString(),
        }
      : {}),
  });
}

async function verifyResetPasswordToken(req, res) {
  const token = String(req.body?.token || "").trim();

  if (!token) {
    return res.status(400).json({
      message: "Reset token is required.",
    });
  }

  const tokenHash = hashResetToken(token);
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
    isActive: true,
  }).select("email role");

  if (!user) {
    return res.status(400).json({
      message: "Reset link is invalid or expired.",
    });
  }

  return res.json({
    valid: true,
    role: user.role,
  });
}

async function resetPassword(req, res) {
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");
  const confirmPassword = String(req.body?.confirmPassword || "");

  if (!token) {
    return res.status(400).json({
      message: "Reset token is required.",
    });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      message: "Password must be at least 8 characters and include at least one letter and one number.",
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      message: "Password confirmation does not match.",
    });
  }

  const tokenHash = hashResetToken(token);
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() },
    isActive: true,
  }).select("+password +refreshTokenHash +resetPasswordTokenHash +resetPasswordExpiresAt");

  if (!user) {
    return res.status(400).json({
      message: "Reset link is invalid or expired.",
    });
  }

  user.password = password;
  user.refreshTokenHash = "";
  clearPasswordResetFields(user);
  await user.save();

  clearRefreshCookie(res);
  return res.json({
    message: "Password has been reset successfully. Please log in again.",
  });
}

async function getMe(req, res) {
  const user = await User.findById(req.auth.userId).lean();

  if (!user || !user.isActive) {
    return res.status(401).json({
      message: "User not found.",
    });
  }

  return res.json({
    user: sanitizeUser(user),
  });
}

module.exports = {
  register,
  login,
  forgotPassword,
  verifyResetPasswordToken,
  resetPassword,
  refreshSession,
  logout,
  getMe,
};
