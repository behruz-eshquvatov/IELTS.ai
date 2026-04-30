const User = require("../models/userModel");
const { getAccessibleStudentMemberships } = require("./teacherAccessService");
const { getStudentPerformanceSummaries } = require("./studentPerformanceSummaryService");
const { FALLBACK_LABEL, getWeaknessSummaries } = require("./weaknessAggregationService");

const SORT_FIELDS = new Set(["name", "class", "score", "weakestArea", "status", "lastActivityAt", "attemptsCount"]);

function normalizeText(value, maxLength = 160) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function toPositiveInt(value, fallback, max = 100) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) {
    return fallback;
  }
  return Math.min(number, max);
}

function scoreValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function resolveLearningStatus(lastActivityAt) {
  if (!lastActivityAt) {
    return "no recent activity";
  }

  const last = new Date(lastActivityAt);
  if (Number.isNaN(last.valueOf())) {
    return "no recent activity";
  }

  const daysSinceActivity = (Date.now() - last.valueOf()) / (24 * 60 * 60 * 1000);
  return daysSinceActivity <= 14 ? "active" : "no recent activity";
}

function buildSummary(rows) {
  const scores = rows
    .map((row) => scoreValue(row.averageScore))
    .filter((value) => value !== null);
  const weaknessCounts = new Map();
  rows.forEach((row) => {
    if (row.weakestArea && row.weakestArea !== FALLBACK_LABEL) {
      weaknessCounts.set(row.weakestArea, (weaknessCounts.get(row.weakestArea) || 0) + 1);
    }
  });

  const mostCommonWeakness = Array.from(weaknessCounts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  const lowestValue = scores.length ? Math.min(...scores) : null;
  const highestValue = scores.length ? Math.max(...scores) : null;
  const statusCount = rows.reduce((counts, row) => {
    const key = String(row.status || "active").replace(/\s+/g, "");
    const normalizedKey = key ? key.charAt(0).toLowerCase() + key.slice(1) : "active";
    counts[normalizedKey] = (counts[normalizedKey] || 0) + 1;
    return counts;
  }, {});

  return {
    totalStudents: rows.length,
    mostCommonWeakness: mostCommonWeakness
      ? { label: mostCommonWeakness[0], count: mostCommonWeakness[1] }
      : { label: FALLBACK_LABEL, count: 0 },
    statusCount,
    lowestScore: lowestValue === null
      ? { value: null, studentCount: 0 }
      : { value: lowestValue, studentCount: scores.filter((score) => score === lowestValue).length },
    averageScore: scores.length
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
      : null,
    highestScore: highestValue === null
      ? { value: null, studentCount: 0 }
      : { value: highestValue, studentCount: scores.filter((score) => score === highestValue).length },
  };
}

function matchesSearch(row, search) {
  if (!search) {
    return true;
  }

  const haystack = [
    row.fullName,
    row.email,
    row.weakestArea,
    row.status,
    row.classes.map((item) => item.name).join(" "),
  ].join(" ").toLowerCase();
  return haystack.includes(search);
}

function sortRows(rows, sortBy, sortDirection) {
  const field = SORT_FIELDS.has(sortBy) ? sortBy : "name";
  const direction = sortDirection === "desc" ? -1 : 1;

  return [...rows].sort((left, right) => {
    let leftValue;
    let rightValue;

    if (field === "name") {
      leftValue = left.fullName || left.email;
      rightValue = right.fullName || right.email;
    } else if (field === "class") {
      leftValue = left.classes[0]?.name || "";
      rightValue = right.classes[0]?.name || "";
    } else if (field === "score") {
      leftValue = scoreValue(left.averageScore);
      rightValue = scoreValue(right.averageScore);
      if (leftValue === null && rightValue === null) return 0;
      if (leftValue === null) return 1;
      if (rightValue === null) return -1;
      return (leftValue - rightValue) * direction;
    } else {
      leftValue = left[field] || "";
      rightValue = right[field] || "";
    }

    return String(leftValue).localeCompare(String(rightValue), undefined, {
      numeric: true,
      sensitivity: "base",
    }) * direction;
  });
}

async function getTeacherStudentDirectory({ teacherId, query = {} }) {
  const search = normalizeText(query.search || "", 120).toLowerCase();
  const classId = normalizeText(query.classId || "", 80);
  const sortBy = normalizeText(query.sortBy || "name", 40);
  const sortDirection = String(query.sortDirection || "asc").toLowerCase() === "desc" ? "desc" : "asc";
  const page = toPositiveInt(query.page, 1, 10000);
  const limit = toPositiveInt(query.limit, 25, 100);

  const access = await getAccessibleStudentMemberships({ teacherId, classId });
  if (!access.studentIds.length) {
    return {
      summary: buildSummary([]),
      students: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const [users, performanceByStudentId, weaknessByStudentId] = await Promise.all([
    User.find(
      { _id: { $in: access.studentIds }, role: "student", isActive: true },
      { fullName: 1, email: 1 },
    ).lean(),
    getStudentPerformanceSummaries(access.studentIds),
    getWeaknessSummaries(access.studentIds),
  ]);

  const rows = users.map((user) => {
    const studentId = String(user._id);
    const performance = performanceByStudentId.get(studentId) || {};
    const weakness = weaknessByStudentId.get(studentId) || { label: FALLBACK_LABEL, count: 0 };
    const classes = access.classesByStudentId.get(studentId) || [];

    return {
      studentId,
      fullName: String(user.fullName || ""),
      email: String(user.email || ""),
      classes,
      averageScore: scoreValue(performance.averageScore),
      weakestArea: weakness.label || FALLBACK_LABEL,
      weakestAreaCount: Number(weakness.count || 0),
      status: resolveLearningStatus(performance.lastActivityAt),
      lastActivityAt: performance.lastActivityAt || null,
      attemptsCount: Number(performance.attemptsCount || 0),
      completedUnitsCount: Number(performance.completedUnitsCount || 0),
      summaryMetrics: {
        scoredAttemptsCount: Number(performance.scoredAttemptsCount || 0),
        unitAttemptsCount: Number(performance.unitAttemptsCount || 0),
        totalTimeSpentSeconds: Number(performance.totalTimeSpentSeconds || 0),
      },
    };
  });

  const filteredRows = rows.filter((row) => matchesSearch(row, search));
  const sortedRows = sortRows(filteredRows, sortBy, sortDirection);
  const total = sortedRows.length;
  const totalPages = total ? Math.ceil(total / limit) : 0;
  const safePage = totalPages ? Math.min(page, totalPages) : page;
  const start = (safePage - 1) * limit;

  return {
    summary: buildSummary(filteredRows),
    students: sortedRows.slice(start, start + limit),
    pagination: {
      page: safePage,
      limit,
      total,
      totalPages,
    },
  };
}

module.exports = {
  getTeacherStudentDirectory,
};
