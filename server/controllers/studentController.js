const StudentProfile = require("../models/studentProfileModel");
const StudentDailyTasks = require("../models/studentDailyTasksModel");
const StudentAnalytics = require("../models/studentAnalyticsModel");
const User = require("../models/userModel");
const {
  studentProfileSeed,
  studentDailyTasksSeed,
  studentAnalyticsSeed,
} = require("../data/studentSeedData");

const VALID_RANGES = ["week", "month", "lifetime"];
const VALID_PARTS = ["Listening", "Reading", "Writing"];
const VALID_TASK_STATUSES = ["completed", "pending", "locked"];
const HEATMAP_DAYS = 365;

function normalizeStudentId(studentId) {
  return String(studentId || "").trim().toLowerCase();
}

function notFound(res, entity, studentId) {
  return res.status(404).json({
    message: `${entity} not found for student '${studentId}'`,
  });
}

function buildDefaultProfileFromUser(user) {
  return {
    studentId: normalizeStudentId(user.email),
    fullName: user.fullName,
    email: normalizeStudentId(user.email),
    memberSince: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
    subscription: {
      planName: "Student subscription",
      monthlyPrice: 19,
      teacherMonthlyPrice: 39,
      status: "Active subscription",
      benefits: [
        "Skill-based Listening, Reading, and Writing practice",
        "Structured feedback with weak-pattern visibility",
        "Progress tracking, timing behavior, and retry history",
      ],
    },
    paymentMethod: {
      cardMasked: "**** **** **** 4821",
      label: "Primary payment method",
    },
    security: {
      passwordMasked: "************",
      lastUpdatedLabel: "Recently updated",
    },
    billingHistory: [],
  };
}

function getDateKey(dateInput = new Date()) {
  const date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthLabelFromDate(dateInput) {
  return new Date(dateInput).toLocaleString("en-US", { month: "short" }).toUpperCase();
}

function getHeatmapLevel(entry) {
  if (!entry) {
    return 0;
  }

  if ((entry.taskActiveMinutes || 0) >= 60) {
    return 3;
  }

  if ((entry.taskActiveMinutes || 0) >= 30) {
    return 2;
  }

  if (entry.visited || (entry.taskActiveMinutes || 0) > 0) {
    return 1;
  }

  return 0;
}

function ensureStudyActivityShape(analyticsDoc) {
  if (!analyticsDoc.studyActivity || typeof analyticsDoc.studyActivity !== "object") {
    analyticsDoc.studyActivity = { entries: [] };
  }

  if (!Array.isArray(analyticsDoc.studyActivity.entries)) {
    analyticsDoc.studyActivity.entries = [];
  }
}

function upsertStudyEntry(analyticsDoc, dateKey) {
  ensureStudyActivityShape(analyticsDoc);

  const entries = analyticsDoc.studyActivity.entries;
  let entry = entries.find((item) => item.dateKey === dateKey);

  if (!entry) {
    entry = {
      dateKey,
      visited: false,
      taskActiveMinutes: 0,
    };
    entries.push(entry);
  }

  return entry;
}

function pruneStudyEntries(analyticsDoc, keepDays = HEATMAP_DAYS + 30) {
  ensureStudyActivityShape(analyticsDoc);
  const entries = analyticsDoc.studyActivity.entries;
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - keepDays);
  const cutoffKey = getDateKey(cutoff);

  analyticsDoc.studyActivity.entries = entries.filter((entry) => entry.dateKey >= cutoffKey);
}

function incrementTodayTaskMinutes(analyticsDoc, minutesSpent) {
  const safeMinutes = Number.isFinite(Number(minutesSpent)) ? Number(minutesSpent) : 0;
  if (safeMinutes <= 0) {
    return null;
  }

  const todayKey = getDateKey();
  const todayEntry = upsertStudyEntry(analyticsDoc, todayKey);
  todayEntry.visited = true;
  todayEntry.taskActiveMinutes = Number(
    Math.max((todayEntry.taskActiveMinutes || 0) + safeMinutes, 0).toFixed(1),
  );

  pruneStudyEntries(analyticsDoc);
  return todayEntry;
}

function buildHeatmapFromEntries(entries, days = HEATMAP_DAYS) {
  const mapByDateKey = new Map();
  entries.forEach((entry) => {
    mapByDateKey.set(entry.dateKey, entry);
  });

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const activityData = [];
  const monthKeysInRange = [];
  const seenMonthKeys = new Set();

  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);

    const dateKey = getDateKey(day);
    const entry = mapByDateKey.get(dateKey);
    activityData.push(getHeatmapLevel(entry));

    const monthKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}`;
    if (!seenMonthKeys.has(monthKey)) {
      seenMonthKeys.add(monthKey);
      monthKeysInRange.push(monthKey);
    }
  }

  const months = monthKeysInRange
    .slice(-12)
    .map((monthKey) => {
      const [year, month] = monthKey.split("-").map((item) => Number(item));
      return monthLabelFromDate(new Date(year, month - 1, 1));
    });

  return { months, activityData };
}

function todaysStudySummary(analyticsDoc, dateKey = getDateKey()) {
  ensureStudyActivityShape(analyticsDoc);
  const todayEntry = analyticsDoc.studyActivity.entries.find((entry) => entry.dateKey === dateKey);
  const todaysStudyTimeMinutes = Math.max(Number(todayEntry?.taskActiveMinutes || 0), 0);
  const level = getHeatmapLevel(todayEntry);

  return {
    date: dateKey,
    todaysStudyTimeMinutes,
    "today's study time": `${todaysStudyTimeMinutes} minutes`,
    "today's study time :": `${todaysStudyTimeMinutes} minutes`,
    level,
  };
}

async function getMyStudentProfile(req, res) {
  const user = await User.findById(req.auth.userId).lean();
  if (!user || user.role !== "student") {
    return res.status(403).json({
      message: "Only students can access this profile endpoint.",
    });
  }

  const studentId = normalizeStudentId(user.email);
  let profile = await StudentProfile.findOne({ studentId }).lean();

  if (!profile) {
    profile = await StudentProfile.create(buildDefaultProfileFromUser(user));
    profile = profile.toObject();
  }

  return res.json({ profile });
}

async function getStudentProfile(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const profile = await StudentProfile.findOne({ studentId }).lean();

  if (!profile) {
    return notFound(res, "Profile", studentId);
  }

  return res.json({ profile });
}

async function updateStudentProfile(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const updates = req.body || {};

  const profile = await StudentProfile.findOneAndUpdate(
    { studentId },
    { $set: updates },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!profile) {
    return notFound(res, "Profile", studentId);
  }

  return res.json({
    message: "Profile updated",
    profile,
  });
}

async function getStudentDailyTasks(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const statusFilter = req.query.status;
  const doc = await StudentDailyTasks.findOne({ studentId }).lean();

  if (!doc) {
    return notFound(res, "Daily tasks", studentId);
  }

  if (!statusFilter) {
    return res.json({ studentId, units: doc.units });
  }

  const filteredUnits = doc.units.filter((unit) => unit.status === statusFilter);
  return res.json({ studentId, units: filteredUnits });
}

async function updateStudentDailyTasks(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const { units } = req.body || {};

  if (!Array.isArray(units)) {
    return res.status(400).json({
      message: "Body must include `units` as an array.",
    });
  }

  const doc = await StudentDailyTasks.findOneAndUpdate(
    { studentId },
    { $set: { units } },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!doc) {
    return notFound(res, "Daily tasks", studentId);
  }

  return res.json({
    message: "Daily tasks updated",
    studentId,
    units: doc.units,
  });
}

async function updateTaskStatus(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const unitId = req.params.unitId;
  const taskId = req.params.taskId;
  const nextStatus = req.body?.status;

  if (!VALID_TASK_STATUSES.includes(nextStatus)) {
    return res.status(400).json({
      message: `Invalid status. Use one of: ${VALID_TASK_STATUSES.join(", ")}`,
    });
  }

  const doc = await StudentDailyTasks.findOne({ studentId });
  if (!doc) {
    return notFound(res, "Daily tasks", studentId);
  }

  const unit = doc.units.find((item) => item.unitId === unitId);
  if (!unit) {
    return res.status(404).json({ message: `Unit '${unitId}' not found` });
  }

  const task = unit.tasks.find((item) => item.taskId === taskId);
  if (!task) {
    return res.status(404).json({ message: `Task '${taskId}' not found` });
  }

  task.status = nextStatus;

  const activeMinutes = Number(req.body?.activeMinutes);
  const activeSeconds = Number(req.body?.activeSeconds);
  const minutesFromSeconds = Number.isFinite(activeSeconds) && activeSeconds > 0 ? activeSeconds / 60 : 0;
  const taskActiveMinutes = Number.isFinite(activeMinutes) && activeMinutes > 0 ? activeMinutes : minutesFromSeconds;

  if (nextStatus === "completed" && taskActiveMinutes > 0) {
    const analytics = await StudentAnalytics.findOne({ studentId });
    if (analytics) {
      incrementTodayTaskMinutes(analytics, taskActiveMinutes);
      await analytics.save();
    }
  }

  await doc.save();

  return res.json({
    message: "Task status updated",
    studentId,
    unitId,
    task,
  });
}

async function getStudentAnalytics(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const range = req.query.range || "week";
  const part = req.query.part || "Listening";

  if (!VALID_RANGES.includes(range)) {
    return res.status(400).json({
      message: `Invalid range. Use one of: ${VALID_RANGES.join(", ")}`,
    });
  }

  if (!VALID_PARTS.includes(part)) {
    return res.status(400).json({
      message: `Invalid part. Use one of: ${VALID_PARTS.join(", ")}`,
    });
  }

  const analytics = await StudentAnalytics.findOne({ studentId }).lean();
  if (!analytics) {
    return notFound(res, "Analytics", studentId);
  }

  const activeRange = analytics.ranges[range];
  const dynamicHeatmap = buildHeatmapFromEntries(analytics.studyActivity?.entries || []);
  const todaySummary = todaysStudySummary(analytics);

  return res.json({
    studentId,
    range,
    part,
    overview: activeRange.overview,
    bandChart: activeRange.bandChart,
    timeChart: activeRange.timeChart,
    weakSections: activeRange.weakSections[part],
    heatmap: dynamicHeatmap.months.length ? dynamicHeatmap : analytics.heatmap,
    todaysStudyTimeMinutes: todaySummary.todaysStudyTimeMinutes,
    "today's study time": todaySummary["today's study time"],
    "today's study time :": todaySummary["today's study time :"],
    todayStudyLevel: todaySummary.level,
  });
}

async function updateStudentAnalytics(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const { ranges, heatmap } = req.body || {};

  if (!ranges) {
    return res.status(400).json({
      message: "Body must include `ranges`.",
    });
  }

  const updatePayload = { ranges };
  if (heatmap) {
    updatePayload.heatmap = heatmap;
  }

  const analytics = await StudentAnalytics.findOneAndUpdate(
    { studentId },
    { $set: updatePayload },
    {
      new: true,
      runValidators: true,
    },
  ).lean();

  if (!analytics) {
    return notFound(res, "Analytics", studentId);
  }

  return res.json({
    message: "Analytics updated",
    analytics,
  });
}

async function markStudyVisit(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const analytics = await StudentAnalytics.findOne({ studentId });

  if (!analytics) {
    return notFound(res, "Analytics", studentId);
  }

  const todayKey = getDateKey();
  const todayEntry = upsertStudyEntry(analytics, todayKey);
  todayEntry.visited = true;

  pruneStudyEntries(analytics);
  await analytics.save();

  const summary = todaysStudySummary(analytics, todayKey);
  return res.json({
    message: "Visit tracked.",
    studentId,
    ...summary,
  });
}

async function addTaskStudyTime(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const analytics = await StudentAnalytics.findOne({ studentId });

  if (!analytics) {
    return notFound(res, "Analytics", studentId);
  }

  const body = req.body || {};
  const minutesSpentRaw = Number(body.minutesSpent);
  const secondsSpentRaw = Number(body.secondsSpent);

  const derivedMinutesFromSeconds = Number.isFinite(secondsSpentRaw) && secondsSpentRaw > 0
    ? secondsSpentRaw / 60
    : 0;
  const minutesSpent = Number.isFinite(minutesSpentRaw) && minutesSpentRaw > 0
    ? minutesSpentRaw
    : derivedMinutesFromSeconds;

  if (!Number.isFinite(minutesSpent) || minutesSpent <= 0) {
    return res.status(400).json({
      message: "Provide positive `minutesSpent` or `secondsSpent`.",
    });
  }

  const todayKey = getDateKey();
  incrementTodayTaskMinutes(analytics, minutesSpent);
  await analytics.save();

  const summary = todaysStudySummary(analytics, todayKey);

  return res.json({
    message: "Task study time tracked.",
    studentId,
    trackedMinutes: Number(minutesSpent.toFixed(1)),
    ...summary,
  });
}

async function getStudyHeatmap(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const analytics = await StudentAnalytics.findOne({ studentId }).lean();

  if (!analytics) {
    return notFound(res, "Analytics", studentId);
  }

  const heatmap = buildHeatmapFromEntries(analytics.studyActivity?.entries || []);
  const summary = todaysStudySummary(analytics);

  return res.json({
    studentId,
    heatmap,
    todaysStudyTimeMinutes: summary.todaysStudyTimeMinutes,
    "today's study time": summary["today's study time"],
    "today's study time :": summary["today's study time :"],
    todayStudyLevel: summary.level,
  });
}

async function seedStudentData(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);

  const [profile, dailyTasks, analytics] = await Promise.all([
    StudentProfile.findOneAndUpdate(
      { studentId },
      { $set: { studentId, ...studentProfileSeed } },
      { new: true, upsert: true, runValidators: true },
    ).lean(),
    StudentDailyTasks.findOneAndUpdate(
      { studentId },
      { $set: { studentId, ...studentDailyTasksSeed } },
      { new: true, upsert: true, runValidators: true },
    ).lean(),
    StudentAnalytics.findOneAndUpdate(
      { studentId },
      { $set: { studentId, ...studentAnalyticsSeed } },
      { new: true, upsert: true, runValidators: true },
    ).lean(),
  ]);

  return res.status(201).json({
    message: "Student seed data is ready.",
    studentId,
    profile,
    dailyTasks,
    analytics,
  });
}

async function listStudents(req, res) {
  const students = await StudentProfile.find({}, { studentId: 1, fullName: 1, email: 1 })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ students });
}

module.exports = {
  getMyStudentProfile,
  getStudentProfile,
  updateStudentProfile,
  getStudentDailyTasks,
  updateStudentDailyTasks,
  updateTaskStatus,
  getStudentAnalytics,
  updateStudentAnalytics,
  markStudyVisit,
  addTaskStudyTime,
  getStudyHeatmap,
  seedStudentData,
  listStudents,
};
