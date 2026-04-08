const ACCESS_TOKEN_KEY = "auth:accessToken";
const USER_KEY = "auth:user";
const STORAGE_SCOPE_KEY = "auth:storageScope";
const STORAGE_SCOPE_LOCAL = "local";
const STORAGE_SCOPE_SESSION = "session";

function getStorageByScope(scope) {
  return scope === STORAGE_SCOPE_SESSION ? sessionStorage : localStorage;
}

function getStoredScope() {
  if (sessionStorage.getItem(STORAGE_SCOPE_KEY) === STORAGE_SCOPE_SESSION) {
    return STORAGE_SCOPE_SESSION;
  }

  if (localStorage.getItem(STORAGE_SCOPE_KEY) === STORAGE_SCOPE_LOCAL) {
    return STORAGE_SCOPE_LOCAL;
  }

  if (sessionStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(USER_KEY)) {
    return STORAGE_SCOPE_SESSION;
  }

  if (localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(USER_KEY)) {
    return STORAGE_SCOPE_LOCAL;
  }

  return STORAGE_SCOPE_LOCAL;
}

function clearFromStorage(storage) {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(STORAGE_SCOPE_KEY);
}

function setStorageScope(scope) {
  if (scope === STORAGE_SCOPE_SESSION) {
    sessionStorage.setItem(STORAGE_SCOPE_KEY, STORAGE_SCOPE_SESSION);
    localStorage.removeItem(STORAGE_SCOPE_KEY);
    return;
  }

  localStorage.setItem(STORAGE_SCOPE_KEY, STORAGE_SCOPE_LOCAL);
  sessionStorage.removeItem(STORAGE_SCOPE_KEY);
}

export function getAccessToken() {
  return (
    sessionStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    ""
  );
}

export function setAccessToken(token, options = {}) {
  const explicitRemember = options.rememberMe;
  const scope =
    explicitRemember === true
      ? STORAGE_SCOPE_LOCAL
      : explicitRemember === false
      ? STORAGE_SCOPE_SESSION
      : getStoredScope();

  const targetStorage = getStorageByScope(scope);
  const otherStorage = scope === STORAGE_SCOPE_LOCAL ? sessionStorage : localStorage;

  if (!token) {
    targetStorage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }

  targetStorage.setItem(ACCESS_TOKEN_KEY, token);
  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  setStorageScope(scope);
}

export function getStoredUser() {
  const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function getStoredRole() {
  return getStoredUser()?.role || "";
}

export function saveAuthSession({ accessToken, user, rememberMe } = {}) {
  const scope =
    rememberMe === true
      ? STORAGE_SCOPE_LOCAL
      : rememberMe === false
      ? STORAGE_SCOPE_SESSION
      : getStoredScope();

  const targetStorage = getStorageByScope(scope);
  const otherStorage = scope === STORAGE_SCOPE_LOCAL ? sessionStorage : localStorage;

  if (accessToken) {
    targetStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (user) {
    targetStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  otherStorage.removeItem(ACCESS_TOKEN_KEY);
  otherStorage.removeItem(USER_KEY);
  setStorageScope(scope);
}

export function clearAuthSession() {
  clearFromStorage(localStorage);
  clearFromStorage(sessionStorage);
}
