const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";

function createTokenPayload(user) {
  return {
    sub: String(user._id),
    role: user.role,
    email: user.email,
  };
}

function signAccessToken(user) {
  return jwt.sign(createTokenPayload(user), ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

function signRefreshToken(user) {
  return jwt.sign(createTokenPayload(user), REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_TOKEN_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

function getRefreshCookieOptions() {
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    path: "/api/v1/auth",
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshCookieOptions,
};
