export const TEACHER_ASSIGNMENTS_STORAGE_KEY = "teacher:assignments";

function readJsonStorage(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const savedValue = window.localStorage.getItem(key);
    return savedValue ? JSON.parse(savedValue) : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures.
  }
}

function normalizeAssignmentResource(resource) {
  if (!resource || typeof resource !== "object") {
    return null;
  }

  return {
    id: String(resource.id || "").trim(),
    title: String(resource.title || "Untitled resource").trim(),
    section: String(resource.section || "").trim(),
    route: String(resource.route || "").trim(),
    source: String(resource.source || "Resource bank").trim(),
    meta: Array.isArray(resource.meta) ? resource.meta.map((item) => String(item || "").trim()).filter(Boolean) : [],
  };
}

function normalizeTeacherAssignment(assignment) {
  const resources = assignment?.resources && typeof assignment.resources === "object" ? assignment.resources : {};

  return {
    id: String(assignment?.id || "").trim(),
    title: String(assignment?.title || "Full IELTS assignment").trim(),
    targetType: String(assignment?.targetType || "class").trim(),
    targetId: String(assignment?.targetId || "").trim(),
    targetLabel: String(assignment?.targetLabel || "Selected students").trim(),
    dueDate: String(assignment?.dueDate || "").trim(),
    dueTime: String(assignment?.dueTime || "").trim(),
    instructions: String(assignment?.instructions || "").trim(),
    reviewMode: String(assignment?.reviewMode || "Manual writing review").trim(),
    recipientCount: Math.max(0, Number.parseInt(String(assignment?.recipientCount ?? 0), 10) || 0),
    createdAt: String(assignment?.createdAt || new Date().toISOString()),
    resources: {
      reading: normalizeAssignmentResource(resources.reading),
      listening: normalizeAssignmentResource(resources.listening),
      writingTask1: normalizeAssignmentResource(resources.writingTask1),
      writingTask2: normalizeAssignmentResource(resources.writingTask2),
    },
  };
}

export function readTeacherAssignments() {
  const savedValue = readJsonStorage(TEACHER_ASSIGNMENTS_STORAGE_KEY, []);
  if (!Array.isArray(savedValue)) {
    return [];
  }

  return savedValue
    .map((assignment) => normalizeTeacherAssignment(assignment))
    .filter((assignment) => assignment.id);
}

export function writeTeacherAssignments(assignments) {
  const safeAssignments = Array.isArray(assignments) ? assignments.map(normalizeTeacherAssignment) : [];
  writeJsonStorage(TEACHER_ASSIGNMENTS_STORAGE_KEY, safeAssignments);
}

export function buildTeacherAssignmentId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `assignment-${crypto.randomUUID()}`;
  }

  return `assignment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
