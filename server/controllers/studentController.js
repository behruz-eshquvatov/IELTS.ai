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
  return res.json({
    studentId,
    range,
    part,
    overview: activeRange.overview,
    bandChart: activeRange.bandChart,
    timeChart: activeRange.timeChart,
    weakSections: activeRange.weakSections[part],
    heatmap: analytics.heatmap,
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
  seedStudentData,
  listStudents,
};
