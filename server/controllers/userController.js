const User = require("../models/userModel");
const {
  buildYearHeatmapFromEntries,
  mergeDailyMinutes,
  normalizeDateKey,
  normalizeStudyHeatmapEntries,
  todaysStudySummary,
} = require("../utils/studyHeatmap");

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

async function getMyHeatmap(req, res) {
  const year = parseHeatmapYear(req.query.year);

  if (year === null) {
    return res.status(400).json({
      message: "Invalid `year`. Use a year between 1970 and 9999.",
    });
  }

  const user = await User.findById(req.auth.userId).lean();
  if (!user || !user.isActive) {
    return res.status(404).json({ message: "User not found." });
  }

  const entries = normalizeStudyHeatmapEntries(user.studyHeatmap || []);
  const heatmap = buildYearHeatmapFromEntries(entries, year);
  const todaySummary = todaysStudySummary(entries);

  return res.json({
    userId: String(user._id),
    heatmap,
    entries,
    todaysStudyTimeMinutes: todaySummary.todaysStudyTimeMinutes,
    "today's study time": todaySummary["today's study time"],
    "today's study time :": todaySummary["today's study time :"],
    todayStudyLevel: todaySummary.level,
  });
}

async function upsertMyHeatmapDay(req, res) {
  const body = req.body || {};
  const date = normalizeDateKey(body.date);

  if (!date) {
    return res.status(400).json({
      message: "Provide a valid `date` in YYYY-MM-DD format.",
    });
  }

  const minutesSpent = Number(body.minutesSpent);
  if (!Number.isFinite(minutesSpent) || minutesSpent < 0) {
    return res.status(400).json({
      message: "Provide non-negative `minutesSpent`.",
    });
  }

  const user = await User.findById(req.auth.userId);
  if (!user || !user.isActive) {
    return res.status(404).json({ message: "User not found." });
  }

  user.studyHeatmap = mergeDailyMinutes(user.studyHeatmap || [], {
    date,
    minutesSpent,
    mode: "max",
  });

  await user.save();

  const entries = normalizeStudyHeatmapEntries(user.studyHeatmap || []);
  const todaySummary = todaysStudySummary(entries, date);

  return res.json({
    message: "Heatmap day updated.",
    date,
    minutesSpent: todaySummary.todaysStudyTimeMinutes,
    entries,
    todayStudyLevel: todaySummary.level,
  });
}

module.exports = {
  getMyHeatmap,
  upsertMyHeatmapDay,
};
