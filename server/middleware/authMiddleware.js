const User = require("../models/userModel");
const { verifyAccessToken } = require("../utils/authTokens");

function getBearerToken(authorizationHeader = "") {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
}

async function protect(req, res, next) {
  try {
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        message: "Authorization token is missing.",
      });
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).lean();

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "User is not authorized.",
      });
    }

    req.auth = {
      userId: String(user._id),
      role: user.role,
      email: user.email,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token is invalid or expired.",
    });
  }
}

async function optionalProtect(req, _res, next) {
  try {
    const token = getBearerToken(req.headers.authorization || "");
    if (!token) {
      return next();
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).lean();
    if (user && user.isActive) {
      req.auth = {
        userId: String(user._id),
        role: user.role,
        email: user.email,
      };
    }

    return next();
  } catch {
    return next();
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({
        message: "Access denied.",
      });
    }

    return next();
  };
}

function authorizeSelfOrTeacher(paramKey = "studentId") {
  return (req, res, next) => {
    const requestedStudentId = String(req.params[paramKey] || "").trim().toLowerCase();
    const authRole = req.auth?.role;
    const authEmail = String(req.auth?.email || "").trim().toLowerCase();

    if (authRole === "teacher") {
      return next();
    }

    if (authRole === "student" && requestedStudentId && requestedStudentId === authEmail) {
      return next();
    }

    return res.status(403).json({
      message: "You are not allowed to access this resource.",
    });
  };
}

module.exports = {
  protect,
  optionalProtect,
  authorizeRoles,
  authorizeSelfOrTeacher,
};
