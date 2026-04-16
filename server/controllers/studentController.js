const StudentProfile = require("../models/studentProfileModel");
const StudentDailyTasks = require("../models/studentDailyTasksModel");
const StudentAnalytics = require("../models/studentAnalyticsModel");
const User = require("../models/userModel");
const {
  studentProfileSeed,
  studentDailyTasksSeed,
  studentAnalyticsSeed,
} = require("../data/studentSeedData");
const {
  buildYearHeatmapFromEntries,
  getDateKey,
  mergeDailyMinutes,
  normalizeDateKey,
  normalizeStudyHeatmapEntries,
  todaysStudySummary,
} = require("../utils/studyHeatmap");

const VALID_RANGES = ["week", "month", "lifetime"];
const VALID_PARTS = ["Listening", "Reading", "Writing"];
const VALID_TASK_STATUSES = ["completed", "pending", "locked"];

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

function cloneSeed(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseHeatmapYear(yearInput, fallbackYear = new Date().getFullYear()) {
  if (yearInput === undefined || yearInput === null || yearInput === "") {
    return fallbackYear;
  }

  const year = Number.parseInt(String(yearInput), 10);
  if (!Number.isFinite(year) || year < 1970 || year > 9999) {
    return null;
  }

  return year;
}

async function getOrCreateStudentAnalyticsDoc(studentId) {
  let analytics = await StudentAnalytics.findOne({ studentId });
  if (analytics) {
    return analytics;
  }

  const seededAnalytics = cloneSeed(studentAnalyticsSeed);
  seededAnalytics.heatmap = buildYearHeatmapFromEntries([]);
  seededAnalytics.studyActivity = { entries: [] };

  analytics = await StudentAnalytics.create({
    studentId,
    ...seededAnalytics,
  });

  return analytics;
}

async function getStudentUserByStudentId(studentId, options = {}) {
  const projection = options.projection || null;
  const query = User.findOne({ email: studentId, role: "student" });

  if (projection) {
    query.select(projection);
  }

  return query.exec();
}

async function syncLegacyStudyActivityFromUser(studentId, heatmapEntries) {
  const analytics = await getOrCreateStudentAnalyticsDoc(studentId);
  const normalizedEntries = normalizeStudyHeatmapEntries(heatmapEntries);

  analytics.studyActivity = {
    entries: normalizedEntries.map((entry) => ({
      dateKey: entry.date,
      visited: true,
      taskActiveMinutes: Number(entry.minutesSpent || 0),
    })),
  };
  analytics.heatmap = buildYearHeatmapFromEntries(normalizedEntries);
  await analytics.save();

  return analytics;
}

async function getHeatmapEntriesForStudent(studentId) {
  const user = await getStudentUserByStudentId(studentId, "+studyHeatmap");
  if (!user || !user.isActive) {
    return null;
  }

  return normalizeStudyHeatmapEntries(user.studyHeatmap || []);
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
    const user = await getStudentUserByStudentId(studentId);
    if (user && user.isActive) {
      user.studyHeatmap = mergeDailyMinutes(user.studyHeatmap || [], {
        date: getDateKey(),
        minutesSpent: taskActiveMinutes,
        mode: "increment",
      });
      await user.save();
      await syncLegacyStudyActivityFromUser(studentId, user.studyHeatmap);
    } else {
      const analytics = await getOrCreateStudentAnalyticsDoc(studentId);
      const fallbackEntries = normalizeStudyHeatmapEntries(
        (analytics.studyActivity?.entries || []).map((entry) => ({
          date: entry.dateKey,
          minutesSpent: entry.taskActiveMinutes || 0,
        })),
      );
      const mergedFallback = mergeDailyMinutes(fallbackEntries, {
        date: getDateKey(),
        minutesSpent: taskActiveMinutes,
        mode: "increment",
      });
      analytics.studyActivity = {
        entries: mergedFallback.map((entry) => ({
          dateKey: entry.date,
          visited: true,
          taskActiveMinutes: entry.minutesSpent,
        })),
      };
      analytics.heatmap = buildYearHeatmapFromEntries(mergedFallback);
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
  const year = parseHeatmapYear(req.query.year);

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

  if (year === null) {
    return res.status(400).json({
      message: "Invalid `year`. Use a year between 1970 and 9999.",
    });
  }

  const analyticsDoc = await getOrCreateStudentAnalyticsDoc(studentId);
  const analytics = analyticsDoc.toObject();

  const activeRange = analytics.ranges[range];
  const legacyEntries = normalizeStudyHeatmapEntries(
    (analytics.studyActivity?.entries || []).map((entry) => ({
      date: entry.dateKey,
      minutesSpent: entry.taskActiveMinutes || 0,
    })),
  );
  const userEntries = await getHeatmapEntriesForStudent(studentId);
  const activeEntries = Array.isArray(userEntries) ? userEntries : legacyEntries;
  const dynamicHeatmap = buildYearHeatmapFromEntries(activeEntries, year);
  const todaySummary = todaysStudySummary(activeEntries);

  return res.json({
    studentId,
    range,
    part,
    overview: activeRange.overview,
    bandChart: activeRange.bandChart,
    timeChart: activeRange.timeChart,
    weakSections: activeRange.weakSections[part],
    heatmap: dynamicHeatmap.months.length ? dynamicHeatmap : analytics.heatmap,
    entries: activeEntries,
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
  const user = await getStudentUserByStudentId(studentId);
  if (!user || !user.isActive) {
    return notFound(res, "Student", studentId);
  }

  const todayKey = getDateKey();
  user.studyHeatmap = mergeDailyMinutes(user.studyHeatmap || [], {
    date: todayKey,
    minutesSpent: 0,
    mode: "max",
  });
  await user.save();
  await syncLegacyStudyActivityFromUser(studentId, user.studyHeatmap);

  const summary = todaysStudySummary(user.studyHeatmap || [], todayKey);
  return res.json({
    message: "Visit tracked.",
    studentId,
    entries: normalizeStudyHeatmapEntries(user.studyHeatmap || []),
    ...summary,
  });
}

async function addTaskStudyTime(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const user = await getStudentUserByStudentId(studentId);
  if (!user || !user.isActive) {
    return notFound(res, "Student", studentId);
  }

  const body = req.body || {};
  const minutesSpentRaw = Number(body.minutesSpent);
  const secondsSpentRaw = Number(body.secondsSpent);
  const date = normalizeDateKey(body.date, getDateKey());

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

  user.studyHeatmap = mergeDailyMinutes(user.studyHeatmap || [], {
    date,
    minutesSpent,
    mode: "increment",
  });
  await user.save();
  await syncLegacyStudyActivityFromUser(studentId, user.studyHeatmap);

  const summary = todaysStudySummary(user.studyHeatmap || [], date);

  return res.json({
    message: "Task study time tracked.",
    studentId,
    trackedMinutes: Number(minutesSpent.toFixed(1)),
    entries: normalizeStudyHeatmapEntries(user.studyHeatmap || []),
    ...summary,
  });
}

async function getStudyHeatmap(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const year = parseHeatmapYear(req.query.year);

  if (year === null) {
    return res.status(400).json({
      message: "Invalid `year`. Use a year between 1970 and 9999.",
    });
  }

  const user = await getStudentUserByStudentId(studentId, "+studyHeatmap");
  if (!user || !user.isActive) {
    return notFound(res, "Student", studentId);
  }

  const entries = normalizeStudyHeatmapEntries(user.studyHeatmap || []);
  const heatmap = buildYearHeatmapFromEntries(entries, year);
  const summary = todaysStudySummary(entries);

  return res.json({
    studentId,
    heatmap,
    entries,
    todaysStudyTimeMinutes: summary.todaysStudyTimeMinutes,
    "today's study time": summary["today's study time"],
    "today's study time :": summary["today's study time :"],
    todayStudyLevel: summary.level,
  });
}

async function markMyStudyVisit(req, res) {
  req.params.studentId = normalizeStudentId(req.auth?.email);
  return markStudyVisit(req, res);
}

async function addMyTaskStudyTime(req, res) {
  req.params.studentId = normalizeStudentId(req.auth?.email);
  return addTaskStudyTime(req, res);
}

async function getMyStudyHeatmap(req, res) {
  req.params.studentId = normalizeStudentId(req.auth?.email);
  return getStudyHeatmap(req, res);
}

async function seedStudentData(req, res) {
  const studentId = normalizeStudentId(req.params.studentId);
  const seededHeatmap = buildYearHeatmapFromEntries([]);
  const seededStudyActivity = { entries: [] };

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
      { $set: { studentId, ...studentAnalyticsSeed, heatmap: seededHeatmap, studyActivity: seededStudyActivity } },
      { new: true, upsert: true, runValidators: true },
    ).lean(),
  ]);

  await User.updateOne(
    { email: studentId, role: "student" },
    { $set: { studyHeatmap: [] } },
  );

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
  markMyStudyVisit,
  addMyTaskStudyTime,
  getMyStudyHeatmap,
  seedStudentData,
  listStudents,
};
