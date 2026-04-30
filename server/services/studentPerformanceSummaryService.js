const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const StudentUnitProgress = require("../models/studentUnitProgressModel");

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundBand(value) {
  const number = safeNumber(value);
  return number === null ? null : Math.round(number * 10) / 10;
}

function maxDate(...values) {
  return values
    .map((value) => (value ? new Date(value) : null))
    .filter((date) => date && !Number.isNaN(date.valueOf()))
    .sort((left, right) => right.valueOf() - left.valueOf())[0] || null;
}

async function getStudentPerformanceSummaries(studentIds = []) {
  const safeStudentIds = Array.from(new Set(studentIds.map((id) => String(id || "").trim()).filter(Boolean)));
  if (!safeStudentIds.length) {
    return new Map();
  }

  const [attemptSummaries, unitSummaries] = await Promise.all([
    StudentTaskAttempt.aggregate([
      {
        $match: {
          studentUserId: { $in: safeStudentIds },
          status: "completed",
        },
      },
      {
        $group: {
          _id: "$studentUserId",
          attemptsCount: { $sum: 1 },
          scoredAttemptsCount: {
            $sum: {
              $cond: [{ $isNumber: "$score.band" }, 1, 0],
            },
          },
          averageScore: { $avg: "$score.band" },
          lastAttemptAt: { $max: "$submittedAt" },
          totalTimeSpentSeconds: { $sum: { $ifNull: ["$totalTimeSpentSeconds", 0] } },
        },
      },
    ]),
    StudentUnitProgress.aggregate([
      {
        $match: {
          studentUserId: { $in: safeStudentIds },
        },
      },
      {
        $group: {
          _id: "$studentUserId",
          completedUnitsCount: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          unitAttemptsCount: { $sum: { $ifNull: ["$attemptsCount", 0] } },
          lastUnitActivityAt: { $max: "$lastAttemptAt" },
          lastCompletedAt: { $max: "$completedAt" },
        },
      },
    ]),
  ]);

  const attemptByStudentId = new Map(attemptSummaries.map((item) => [String(item._id), item]));
  const unitByStudentId = new Map(unitSummaries.map((item) => [String(item._id), item]));

  return new Map(safeStudentIds.map((studentId) => {
    const attempt = attemptByStudentId.get(studentId) || {};
    const unit = unitByStudentId.get(studentId) || {};
    const lastActivityAt = maxDate(attempt.lastAttemptAt, unit.lastUnitActivityAt, unit.lastCompletedAt);
    const scoredAttemptsCount = Number(attempt.scoredAttemptsCount || 0);

    return [studentId, {
      averageScore: scoredAttemptsCount > 0 ? roundBand(attempt.averageScore) : null,
      attemptsCount: Number(attempt.attemptsCount || 0),
      scoredAttemptsCount,
      completedUnitsCount: Number(unit.completedUnitsCount || 0),
      unitAttemptsCount: Number(unit.unitAttemptsCount || 0),
      totalTimeSpentSeconds: Number(attempt.totalTimeSpentSeconds || 0),
      lastActivityAt: lastActivityAt ? lastActivityAt.toISOString() : null,
    }];
  }));
}

module.exports = {
  getStudentPerformanceSummaries,
};
