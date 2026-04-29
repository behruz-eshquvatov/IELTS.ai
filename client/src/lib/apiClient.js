import {
  clearAuthSession,
  getAccessToken,
  saveAuthSession,
} from "./authSession";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:5000/api/v1";

function buildUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function toApiError(response, body) {
  const error = new Error(body?.message || "Request failed.");
  error.status = response.status;
  error.body = body;
  error.errors = body?.errors || [];
  return error;
}

async function refreshAccessToken() {
  const response = await fetch(buildUrl("/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const body = await parseResponseBody(response);

  if (!response.ok) {
    throw toApiError(response, body);
  }

  if (body?.accessToken || body?.user) {
    saveAuthSession(body);
  }

  return body;
}

export async function apiRequest(path, options = {}, retried = false) {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
  } = options;

  const finalHeaders = { ...headers };
  const token = getAccessToken();

  if (auth && token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    body instanceof FormData;
  const isBlobPayload =
    typeof Blob !== "undefined" &&
    body instanceof Blob;

  let payload = body;
  if (body && typeof body === "object" && !isFormData && !isBlobPayload) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers: finalHeaders,
    body: payload,
    credentials: "include",
  });

  const data = await parseResponseBody(response);

  if (response.ok) {
    return data;
  }

  const shouldTryRefresh =
    response.status === 401 &&
    !retried &&
    path !== "/auth/login" &&
    path !== "/auth/register" &&
    path !== "/auth/refresh";

  if (shouldTryRefresh) {
    try {
      await refreshAccessToken();
      return await apiRequest(path, options, true);
    } catch {
      clearAuthSession();
    }
  }

  throw toApiError(response, data);
}

export const authApi = {
  register(payload) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  login(payload) {
    return apiRequest("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  forgotPassword(payload) {
    return apiRequest("/auth/forgot-password", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  verifyResetPasswordToken(payload) {
    return apiRequest("/auth/reset-password/verify", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  resetPassword(payload) {
    return apiRequest("/auth/reset-password", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  refresh() {
    return refreshAccessToken();
  },
  me() {
    return apiRequest("/auth/me");
  },
  logout() {
    return apiRequest("/auth/logout", {
      method: "POST",
      auth: false,
    });
  },
};

export const organizationsApi = {
  search(query) {
    return apiRequest(`/organizations/search?q=${encodeURIComponent(String(query || ""))}`, {
      method: "GET",
      auth: false,
    });
  },
};
