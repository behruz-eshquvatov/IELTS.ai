import { API_BASE_URL, apiRequest } from "../lib/apiClient";
import { getAccessToken } from "../lib/authSession";
import {
  cachedResource,
  invalidateCache,
  prefetchResource,
  readCachedData,
  subscribeCache,
} from "./apiCache";

const TTL = {
  dashboard: 5 * 60 * 1000,
  profile: 10 * 60 * 1000,
  analytics: 5 * 60 * 1000,
  heatmap: 5 * 60 * 1000,
  dailyTasks: 5 * 60 * 1000,
  recentCompleted: 2 * 60 * 1000,
  tests: 10 * 60 * 1000,
  prompt: 10 * 60 * 1000,
};

const KEYS = {
  dashboard: "student:dashboard",
  profile: "student:profile",
  heatmap: "student:heatmap",
  dailyTasks: "student:daily-tasks",
  recentCompleted: (limit) => `student:recent-completed:${limit}`,
  analytics: (period) => `student:analytics:${period}`,
  listeningLibraryStats: "student:listening:library-stats",
  listeningFullTests: "student:listening:full-tests",
  listeningFullTest: (testId) => `student:listening:full-test:${testId}`,
  readingFullTests: "student:reading:full-tests",
  readingFullTest: (testId) => `student:reading:full-test:${testId}`,
  writingOpinionSets: (page, limit) => `student:writing-opinion-sets:${page}:${limit}`,
  writingOpinionPrompt: (setId) => `student:writing-opinion-prompt:${setId}`,
};

export function getCachedDashboardData() {
  return readCachedData(KEYS.dashboard) || null;
}

export function subscribeDashboardData(listener) {
  return subscribeCache(KEYS.dashboard, listener);
}

export async function getDashboardData(options = {}) {
  return cachedResource(
    KEYS.dashboard,
    () => apiRequest("/students/me/dashboard"),
    {
      ttlMs: TTL.dashboard,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function getDailyTasks(options = {}) {
  return cachedResource(
    KEYS.dailyTasks,
    () => apiRequest("/students/me/daily-tasks"),
    {
      ttlMs: TTL.dailyTasks,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function getRecentCompletedTasks(limit = 11, options = {}) {
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0
    ? Math.min(Number(limit), 40)
    : 11;

  return cachedResource(
    KEYS.recentCompleted(safeLimit),
    () => apiRequest(`/students/me/task-attempts/recent-completed?limit=${safeLimit}`),
    {
      ttlMs: TTL.recentCompleted,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function getStudentAnalytics(period = "week", options = {}) {
  const safePeriod = String(period || "week").trim().toLowerCase() || "week";

  return cachedResource(
    KEYS.analytics(safePeriod),
    () => apiRequest(`/students/me/analytics?period=${encodeURIComponent(safePeriod)}`),
    {
      ttlMs: TTL.analytics,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function getMyProfile(options = {}) {
  return cachedResource(
    KEYS.profile,
    () => apiRequest("/students/me/profile"),
    {
      ttlMs: TTL.profile,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function updateMyProfile(payload) {
  const response = await apiRequest("/students/me/profile", {
    method: "PATCH",
    body: payload,
  });

  invalidateCache("student:profile");
  invalidateCache("student:dashboard");
  return response;
}

export async function updateMyPassword(payload) {
  const response = await apiRequest("/students/me/profile/password", {
    method: "PATCH",
    body: payload,
  });

  invalidateCache("student:profile");
  invalidateCache("student:dashboard");
  return response;
}

async function getHeatmapViaFallback() {
  try {
    return await apiRequest("/users/me/heatmap");
  } catch {
    return apiRequest("/students/me/study-activity/heatmap");
  }
}

export async function getMyHeatmap(options = {}) {
  return cachedResource(
    KEYS.heatmap,
    () => getHeatmapViaFallback(),
    {
      ttlMs: TTL.heatmap,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function upsertHeatmapDay(date, minutesSpent) {
  const response = await apiRequest("/users/me/heatmap/day", {
    method: "POST",
    body: { date, minutesSpent },
  });

  invalidateCache("student:heatmap");
  invalidateCache("student:dashboard");
  return response;
}

export function sendHeatmapDayKeepalive(date, minutesSpent) {
  const token = getAccessToken();
  if (!token) {
    return;
  }

  const url = `${API_BASE_URL}/users/me/heatmap/day`;
  const payload = JSON.stringify({
    date,
    minutesSpent,
  });

  fetch(url, {
    method: "POST",
    keepalive: true,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: payload,
  }).catch(() => {
    // Keepalive should never block UI.
  });
}

export async function getListeningLibraryStats(options = {}) {
  return cachedResource(
    KEYS.listeningLibraryStats,
    async () => {
      const [testsResponse, partGroupsResponse] = await Promise.all([
        apiRequest("/listening-tests?status=published&limit=1"),
        apiRequest("/listening-tests/part-groups?status=published"),
      ]);

      return {
        testsCount: Number(testsResponse?.pagination?.total) || 0,
        partGroupsCount: Number(partGroupsResponse?.count) || 0,
      };
    },
    {
      ttlMs: TTL.tests,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function getListeningFullTests(options = {}) {
  return cachedResource(
    KEYS.listeningFullTests,
    () => apiRequest("/listening-tests?status=published&limit=100"),
    {
      ttlMs: TTL.tests,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function prefetchListeningFullTest(testId) {
  const safeTestId = String(testId || "").trim();
  if (!safeTestId) {
    return;
  }

  await prefetchResource(
    KEYS.listeningFullTest(safeTestId),
    () => apiRequest(`/listening-tests/${encodeURIComponent(safeTestId)}`),
    { ttlMs: TTL.tests },
  );
}

export async function getReadingFullTests(options = {}) {
  return cachedResource(
    KEYS.readingFullTests,
    () => apiRequest("/reading/full-tests?status=published"),
    {
      ttlMs: TTL.tests,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function getReadingFullTestById(testId, options = {}) {
  const safeTestId = String(testId || "").trim();

  return cachedResource(
    KEYS.readingFullTest(safeTestId),
    () => apiRequest(`/reading/full-tests/${encodeURIComponent(safeTestId)}?status=published`),
    {
      ttlMs: TTL.tests,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function prefetchReadingFullTest(testId) {
  const safeTestId = String(testId || "").trim();
  if (!safeTestId) {
    return;
  }

  await prefetchResource(
    KEYS.readingFullTest(safeTestId),
    () => apiRequest(`/reading/full-tests/${encodeURIComponent(safeTestId)}?status=published`),
    { ttlMs: TTL.tests },
  );
}

export async function getWritingOpinionSets(page = 1, limit = 10, options = {}) {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

  return cachedResource(
    KEYS.writingOpinionSets(safePage, safeLimit),
    () => apiRequest(`/writing-task2-opinion?page=${safePage}&limit=${safeLimit}`, { auth: false }),
    {
      ttlMs: TTL.tests,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function prefetchWritingOpinionSets(page = 1, limit = 10) {
  const safePage = Number.isFinite(Number(page)) && Number(page) > 0 ? Number(page) : 1;
  const safeLimit = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 10;

  await prefetchResource(
    KEYS.writingOpinionSets(safePage, safeLimit),
    () => apiRequest(`/writing-task2-opinion?page=${safePage}&limit=${safeLimit}`, { auth: false }),
    { ttlMs: TTL.tests },
  );
}

export async function getWritingOpinionPrompt(setId, options = {}) {
  const safeSetId = String(setId || "").trim();

  return cachedResource(
    KEYS.writingOpinionPrompt(safeSetId),
    () => apiRequest(`/writing-task2-opinion/${encodeURIComponent(safeSetId)}`, { auth: false }),
    {
      ttlMs: TTL.prompt,
      force: options.force === true,
      swr: options.swr === true,
    },
  );
}

export async function createWritingTask2Analysis(payload) {
  return apiRequest("/writing-task2/analyses", {
    method: "POST",
    body: payload,
  });
}

export function invalidateStudentDataCache(prefix = "student:") {
  invalidateCache(prefix);
}

export async function getMyNotifications() {
  return apiRequest("/student/notifications");
}

export async function markMyNotificationRead(notificationId) {
  return apiRequest(`/student/notifications/${encodeURIComponent(String(notificationId || ""))}/read`, {
    method: "PATCH",
  });
}

export async function respondToMyClassJoinRequest(requestId, action) {
  return apiRequest(`/student/class-join-requests/${encodeURIComponent(String(requestId || ""))}/respond`, {
    method: "POST",
    body: { action },
  });
}

export async function getMyClassMemberships() {
  return apiRequest("/student/classes/memberships");
}

export async function leaveMyClass(classId, payload = {}) {
  return apiRequest(`/student/classes/${encodeURIComponent(String(classId || ""))}/leave`, {
    method: "POST",
    body: payload,
  });
}
