const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const StudentProfile = require("../models/studentProfileModel");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
} = require("../utils/authTokens");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function sanitizeUser(userDoc) {
  return {
    id: String(userDoc._id),
    fullName: userDoc.fullName,
    email: userDoc.email,
    role: userDoc.role,
    organization: userDoc.organization || "",
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

  if (body.role === "teacher" && (!body.organization || body.organization.trim().length < 2)) {
    errors.push("Organization is required for teacher accounts.");
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

  const user = await User.create({
    fullName: body.fullName.trim(),
    email,
    password: body.password,
    role: body.role,
    organization: body.role === "teacher" ? body.organization.trim() : "",
  });

  if (user.role === "student") {
    const starterProfile = buildDefaultStudentProfile(user);
    await StudentProfile.updateOne(
      { studentId: starterProfile.studentId },
      { $setOnInsert: starterProfile },
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
  refreshSession,
  logout,
  getMe,
};
