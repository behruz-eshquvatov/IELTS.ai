const ACCESS_TOKEN_KEY = "auth:accessToken";
const USER_KEY = "auth:user";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || "";
}

export function setAccessToken(token) {
  if (!token) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function getStoredRole() {
  return getStoredUser()?.role || "";
}

export function saveAuthSession({ accessToken, user }) {
  if (accessToken) {
    setAccessToken(accessToken);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
