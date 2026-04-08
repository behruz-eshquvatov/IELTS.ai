const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const REFRESH_TOKEN_EXPIRES_IN_SESSION = process.env.JWT_REFRESH_EXPIRES_IN_SESSION || "12h";
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

function createTokenPayload(user, options = {}) {
  const rememberMe = options.rememberMe !== false;

  return {
    sub: String(user._id),
    role: user.role,
    email: user.email,
    rmb: rememberMe,
  };
}

function signAccessToken(user) {
  return jwt.sign(createTokenPayload(user), ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

function signRefreshToken(user, options = {}) {
  const rememberMe = options.rememberMe !== false;

  return jwt.sign(createTokenPayload(user, { rememberMe }), REFRESH_TOKEN_SECRET, {
    expiresIn: rememberMe ? REFRESH_TOKEN_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN_SESSION,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

function getRefreshCookieOptions(options = {}) {
  const rememberMe = options.rememberMe !== false;
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/v1/auth",
  };

  if (rememberMe) {
    cookieOptions.maxAge = 7 * 24 * 60 * 60 * 1000;
  }

  return cookieOptions;
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
};
