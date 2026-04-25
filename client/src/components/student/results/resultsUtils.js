function normalizeToken(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function decodeRouteValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

export function parseAttemptNumberFromSlug(slug) {
  const match = String(slug || "").trim().match(/^attempt-(\d+)$/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(String(match[1] || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatDateTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

export function formatSeconds(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function buildResultsAttemptRoute({
  taskType,
  taskMode,
  taskRefId,
  sourceType,
  taskGroupId,
  attemptNumber,
}) {
  const safeTaskType = normalizeToken(taskType);
  const safeTaskMode = normalizeToken(taskMode);
  const safeTaskRefId = encodeURIComponent(String(taskRefId || "").trim());
  const safeAttemptNumber = Math.max(1, Number(attemptNumber) || 1);
  const search = new URLSearchParams();

  if (String(sourceType || "").trim()) {
    search.set("sourceType", String(sourceType || "").trim());
  }

  if (String(taskGroupId || "").trim()) {
    search.set("taskGroupId", String(taskGroupId || "").trim());
  }

  const query = search.toString();
  const baseRoute = `/student/results/${safeTaskType}/${safeTaskMode}/${safeTaskRefId}/attempt-${safeAttemptNumber}`;
  return query ? `${baseRoute}?${query}` : baseRoute;
}

export function deriveTaskGroupIdFromRoute({
  taskType,
  taskMode,
  taskRefId,
  sourceType,
}) {
  const safeTaskType = normalizeToken(taskType);
  const safeTaskMode = normalizeToken(taskMode);
  const safeTaskRefId = String(taskRefId || "").trim();
  const safeSourceType = normalizeToken(sourceType);

  if (!safeTaskRefId) {
    return "";
  }

  if (safeTaskType === "reading" && safeTaskMode === "full") {
    return `reading_full_test::reading_full::${safeTaskRefId}`;
  }

  if (safeTaskType === "listening" && safeTaskMode === "full") {
    return `listening_full_test::listening_full::${safeTaskRefId}`;
  }

  if (safeTaskType === "reading" && safeTaskMode === "question") {
    return `reading_question_task::${safeSourceType || "reading_question_task"}::${safeTaskRefId}`;
  }

  if (safeTaskType === "listening" && safeTaskMode === "question") {
    return `listening_question_task::${safeSourceType || "listening_question_task"}::${safeTaskRefId}`;
  }

  return "";
}
