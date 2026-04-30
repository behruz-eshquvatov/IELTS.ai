const { DailyTaskUnit } = require("../models/dailyTaskUnitModel");
const StudentUnitProgress = require("../models/studentUnitProgressModel");
const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const WritingTask1Analysis = require("../models/writingTask1AnalysisModel");
const WritingTask2Analysis = require("../models/writingTask2AnalysisModel");
const { buildRiskFromSignals } = require("./riskAnalysisService");

function formatTaskTypeLabel(taskType) {
  const safe = String(taskType || "").toLowerCase();
  if (safe === "writing_task1") {
    return "Writing Task 1";
  }
  if (safe === "writing_task2") {
    return "Writing Task 2";
  }
  return safe ? `${safe.charAt(0).toUpperCase()}${safe.slice(1)}` : "Task";
}

function toTaskKey(task) {
  return `${String(task?.taskType || "").trim().toLowerCase()}::${String(task?.taskRefId || "").trim()}`;
}

function safeBand(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pickUnitLabelFromAttempt(attempt) {
  const label = String(attempt?.taskLabel || "").trim();
  if (label) {
    return label;
  }
  return formatTaskTypeLabel(attempt?.taskType);
}

function buildSectionScores(tasks, attemptsByTaskKey) {
  const sectionScores = {
    listening: null,
    reading: null,
    writingTask1: null,
    writingTask2: null,
  };
  tasks.forEach((task) => {
    const key = toTaskKey(task);
    const attempts = attemptsByTaskKey.get(key) || [];
    if (!attempts.length) {
      return;
    }
    const firstAttempt = attempts.slice().sort((a, b) => {
      const left = new Date(a?.submittedAt || a?.createdAt || 0).getTime();
      const right = new Date(b?.submittedAt || b?.createdAt || 0).getTime();
      return left - right;
    })[0];
    const band = safeBand(firstAttempt?.score?.band);
    if (band === null) {
      return;
    }
    if (task.taskType === "listening") {
      sectionScores.listening = band;
    } else if (task.taskType === "reading") {
      sectionScores.reading = band;
    } else if (task.taskType === "writing_task1") {
      sectionScores.writingTask1 = band;
    } else if (task.taskType === "writing_task2") {
      sectionScores.writingTask2 = band;
    }
  });
  return sectionScores;
}

function buildAttemptScoresFromProgress(progressDoc) {
  const attempts = Array.isArray(progressDoc?.attempts) ? progressDoc.attempts : [];
  return attempts
    .map((item) => ({
      attemptNumber: Number(item?.attemptNumber || 0),
      score: safeBand(item?.band),
      submittedAt: item?.submittedAt || null,
    }))
    .filter((item) => item.attemptNumber > 0)
    .sort((a, b) => a.attemptNumber - b.attemptNumber);
}

function buildRowsForUnit({
  students,
  unit,
  progressByStudentAndUnit,
  attemptsByStudentAndUnit,
  analysesById,
}) {
  const tasks = Array.isArray(unit?.tasks) ? unit.tasks : [];
  const taskKeys = tasks.map((task) => toTaskKey(task));
  const totalTasks = taskKeys.length;

  return students.map((student) => {
    const studentId = String(student._id || "");
    const progressDoc = progressByStudentAndUnit.get(`${studentId}::${String(unit._id)}`) || null;
    const attempts = attemptsByStudentAndUnit.get(`${studentId}::${String(unit._id)}`) || [];
    const attemptsByTaskKey = new Map();
    attempts.forEach((attempt) => {
      const key = `${String(attempt?.taskType || "").toLowerCase()}::${String(attempt?.taskRefId || "")}`;
      const list = attemptsByTaskKey.get(key) || [];
      list.push(attempt);
      attemptsByTaskKey.set(key, list);
    });

    const completedTaskKeys = new Set();
    const progressTaskRefs = Array.isArray(progressDoc?.completedTaskRefs) ? progressDoc.completedTaskRefs : [];
    progressTaskRefs.forEach((ref) => {
      completedTaskKeys.add(`${String(ref?.taskType || "").toLowerCase()}::${String(ref?.taskRefId || "")}`);
    });
    taskKeys.forEach((key) => {
      if (!completedTaskKeys.has(key) && (attemptsByTaskKey.get(key) || []).length > 0) {
        completedTaskKeys.add(key);
      }
    });

    const completedTasks = taskKeys.filter((key) => completedTaskKeys.has(key)).length;
    const missingTasks = tasks
      .filter((task) => !completedTaskKeys.has(toTaskKey(task)))
      .map((task) => {
        const key = toTaskKey(task);
        const labelFromAttempt = pickUnitLabelFromAttempt((attemptsByTaskKey.get(key) || [])[0]);
        return labelFromAttempt || formatTaskTypeLabel(task.taskType);
      });

    const attemptScores = buildAttemptScoresFromProgress(progressDoc);
    const primaryScore = attemptScores.length > 0
      ? attemptScores[0].score
      : safeBand(progressDoc?.latestBand);
    const attemptsCount = Number(progressDoc?.attemptsCount || attempts.length || 0);
    const timeSpentSeconds = Number(progressDoc?.latestTimeSpentSeconds || 0) > 0
      ? Number(progressDoc.latestTimeSpentSeconds || 0)
      : attempts.reduce((sum, attempt) => sum + Number(attempt?.totalTimeSpentSeconds || 0), 0);
    const sectionScores = buildSectionScores(tasks, attemptsByTaskKey);

    const writingAnalysisIds = new Set();
    attempts.forEach((attempt) => {
      const task1Id = String(attempt?.sourceRefs?.writingTask1AnalysisId || "").trim();
      const task2Id = String(attempt?.sourceRefs?.writingTask2AnalysisId || "").trim();
      if (task1Id) {
        writingAnalysisIds.add(task1Id);
      }
      if (task2Id) {
        writingAnalysisIds.add(task2Id);
      }
    });
    const writingAnalyses = Array.from(writingAnalysisIds)
      .map((id) => analysesById.get(id))
      .filter(Boolean);
    const risk = buildRiskFromSignals({ attempts, writingAnalyses });

    return {
      studentId,
      studentName: String(student?.fullName || ""),
      email: String(student?.email || ""),
      status: completedTasks >= totalTasks && totalTasks > 0 ? "complete" : "incomplete",
      completedTasks,
      totalTasks,
      missingTasks,
      attemptsCount,
      timeSpentSeconds,
      overallScore: primaryScore,
      attemptScores,
      sectionScores,
      risk,
      hasAnyActivity: attemptsCount > 0 || completedTasks > 0 || Boolean(progressDoc?.lastAttemptAt),
      isEligible: Boolean(progressDoc?.calendarEligible) || ["available", "completed"].includes(String(progressDoc?.status || "")),
    };
  });
}

function computeSelectedUnitId(units, unitRowsMap) {
  if (!units.length) {
    return "";
  }
  let lastMeaningfulUnitId = "";

  for (const unit of units) {
    const unitId = String(unit._id || "");
    const rows = unitRowsMap.get(unitId) || [];
    const totalStudents = rows.length;
    const completedStudents = rows.filter((row) => row.status === "complete").length;
    const hasAnyActivity = rows.some((row) => row.hasAnyActivity);
    const hasAnyEligibility = rows.some((row) => row.isEligible);
    const allCompleted = totalStudents > 0 && completedStudents === totalStudents;
    const meaningful = hasAnyActivity || hasAnyEligibility;

    if (allCompleted) {
      if (meaningful) {
        lastMeaningfulUnitId = unitId;
      }
      continue;
    }

    if (!meaningful) {
      return lastMeaningfulUnitId || unitId;
    }
    return unitId;
  }

  return lastMeaningfulUnitId || String(units[0]?._id || "");
}

async function fetchTeacherClassHomeworkOverview({ classDoc, students, selectedUnitId = "" }) {
  const unitDocs = await DailyTaskUnit.find({ status: "published" })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  if (unitDocs.length === 0) {
    return {
      classId: String(classDoc?._id || ""),
      selectedUnitId: "",
      units: [],
      rows: [],
    };
  }

  const studentIds = students.map((student) => String(student._id || ""));
  const unitIds = unitDocs.map((unit) => String(unit._id || ""));

  const [progressDocs, attemptDocs] = await Promise.all([
    StudentUnitProgress.find({
      studentUserId: { $in: studentIds },
      unitId: { $in: unitIds },
    }).lean(),
    StudentTaskAttempt.find({
      studentUserId: { $in: studentIds },
      unitId: { $in: unitIds },
      status: "completed",
    }).lean(),
  ]);

  const progressByStudentAndUnit = new Map();
  progressDocs.forEach((doc) => {
    progressByStudentAndUnit.set(`${String(doc.studentUserId)}::${String(doc.unitId)}`, doc);
  });
  const attemptsByStudentAndUnit = new Map();
  attemptDocs.forEach((doc) => {
    const key = `${String(doc.studentUserId)}::${String(doc.unitId)}`;
    const list = attemptsByStudentAndUnit.get(key) || [];
    list.push(doc);
    attemptsByStudentAndUnit.set(key, list);
  });

  const analysisIdsTask1 = Array.from(new Set(
    attemptDocs.map((doc) => String(doc?.sourceRefs?.writingTask1AnalysisId || "").trim()).filter(Boolean),
  ));
  const analysisIdsTask2 = Array.from(new Set(
    attemptDocs.map((doc) => String(doc?.sourceRefs?.writingTask2AnalysisId || "").trim()).filter(Boolean),
  ));
  const [task1Analyses, task2Analyses] = await Promise.all([
    analysisIdsTask1.length
      ? WritingTask1Analysis.find({ _id: { $in: analysisIdsTask1 } }, { summary: 1, weaknesses: 1, suggestions: 1, diagnosis: 1, detections: 1 }).lean()
      : [],
    analysisIdsTask2.length
      ? WritingTask2Analysis.find({ _id: { $in: analysisIdsTask2 } }, { summary: 1, weaknesses: 1, suggestions: 1, diagnosis: 1, detections: 1 }).lean()
      : [],
  ]);
  const analysesById = new Map(
    [...task1Analyses, ...task2Analyses].map((doc) => [String(doc._id), doc]),
  );

  const unitRowsMap = new Map();
  unitDocs.forEach((unit) => {
    const rows = buildRowsForUnit({
      students,
      unit,
      progressByStudentAndUnit,
      attemptsByStudentAndUnit,
      analysesById,
    });
    unitRowsMap.set(String(unit._id), rows);
  });

  const computedSelectedUnitId = computeSelectedUnitId(unitDocs, unitRowsMap);
  const finalSelectedUnitId = selectedUnitId && unitRowsMap.has(String(selectedUnitId))
    ? String(selectedUnitId)
    : computedSelectedUnitId;

  const units = unitDocs.map((unit) => {
    const rows = unitRowsMap.get(String(unit._id)) || [];
    const completedStudents = rows.filter((row) => row.status === "complete").length;
    return {
      unitId: String(unit._id),
      title: String(unit.title || ""),
      order: Number(unit.order || 0),
      statusSummary: {
        completedStudents,
        totalStudents: rows.length,
      },
    };
  });

  return {
    classId: String(classDoc?._id || ""),
    selectedUnitId: finalSelectedUnitId,
    units,
    rows: (unitRowsMap.get(finalSelectedUnitId) || []).map((row) => ({
      studentId: row.studentId,
      studentName: row.studentName,
      email: row.email,
      status: row.status,
      completedTasks: row.completedTasks,
      totalTasks: row.totalTasks,
      missingTasks: row.missingTasks,
      attemptsCount: row.attemptsCount,
      timeSpentSeconds: row.timeSpentSeconds,
      overallScore: row.overallScore,
      attemptScores: row.attemptScores,
      sectionScores: row.sectionScores,
      risk: row.risk,
    })),
  };
}

module.exports = {
  fetchTeacherClassHomeworkOverview,
};

