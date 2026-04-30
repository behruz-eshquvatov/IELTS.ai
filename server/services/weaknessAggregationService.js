const StudentTaskAttempt = require("../models/studentTaskAttemptModel");
const WritingTask1Analysis = require("../models/writingTask1AnalysisModel");
const WritingTask2Analysis = require("../models/writingTask2AnalysisModel");

const FALLBACK_LABEL = "Not enough data";

const DIRECT_LABELS = new Map([
  ["matching headings", "Matching Headings"],
  ["matching information", "Matching Information"],
  ["matching features", "Matching Features"],
  ["binary judgement", "Binary Judgement"],
  ["true false not given", "True / False / Not Given"],
  ["yes no not given", "Yes / No / Not Given"],
  ["multiple choice", "Multiple Choice"],
  ["map labelling", "Map Labelling"],
  ["map labeling", "Map Labelling"],
  ["form completion", "Form Completion"],
  ["sentence completion", "Sentence Completion"],
  ["summary completion", "Summary Completion"],
  ["grammar accuracy", "Writing Grammar Accuracy"],
  ["grammatical range accuracy", "Writing Grammar Accuracy"],
  ["task achievement", "Task Achievement"],
  ["task response", "Task Response"],
  ["coherence cohesion", "Coherence and Cohesion"],
  ["lexical resource", "Lexical Resource"],
]);

function normalizeLabel(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+\d+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toTitleCase(value) {
  return String(value || "")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readableWeaknessLabel(value, context = {}) {
  const normalized = normalizeLabel(value || context.blockType || context.questionFamily || context.taskType);
  if (!normalized) {
    return FALLBACK_LABEL;
  }

  for (const [needle, label] of DIRECT_LABELS.entries()) {
    if (normalized.includes(needle)) {
      return label;
    }
  }

  if (normalized.includes("inference")) return "Reading Inference";
  if (normalized.includes("detail")) return context.section === "listening" ? "Listening Detail Questions" : "Detail Questions";
  if (normalized.includes("matching")) return "Matching Questions";
  if (normalized.includes("gap fill") || normalized.includes("gapfill")) return "Gap-fill Questions";
  if (normalized.includes("table")) return "Table Completion";
  if (normalized.includes("diagram")) return "Diagram Labelling";
  if (normalized.includes("spelling")) return "Listening Spelling Accuracy";
  if (normalized.includes("coherence")) return "Coherence and Cohesion";
  if (normalized.includes("lexical") || normalized.includes("vocabulary")) return "Lexical Resource";
  if (normalized.includes("grammar")) return "Writing Grammar Accuracy";

  return toTitleCase(normalized);
}

function addWeakness(map, studentId, label, count = 1, context = {}) {
  const safeStudentId = String(studentId || "").trim();
  const safeLabel = readableWeaknessLabel(label, context);
  if (!safeStudentId || safeLabel === FALLBACK_LABEL) {
    return;
  }

  if (!map.has(safeStudentId)) {
    map.set(safeStudentId, new Map());
  }

  const studentMap = map.get(safeStudentId);
  studentMap.set(safeLabel, (studentMap.get(safeLabel) || 0) + Math.max(1, Number(count) || 1));
}

function sectionFromTaskType(taskType) {
  const safe = String(taskType || "").toLowerCase();
  if (safe.includes("listening")) return "listening";
  if (safe.includes("reading")) return "reading";
  if (safe.includes("writing")) return "writing";
  return "";
}

function collectAttemptWeaknesses(map, attempt) {
  const studentId = String(attempt?.studentUserId || "").trim();
  const section = sectionFromTaskType(attempt?.taskType);
  const payload = attempt?.payload && typeof attempt.payload === "object" ? attempt.payload : {};
  const submission = payload?.submission && typeof payload.submission === "object" ? payload.submission : {};
  const evaluation = payload?.evaluation || submission?.evaluation || {};
  const incorrectItems = Array.isArray(evaluation?.incorrectItems) ? evaluation.incorrectItems : [];

  incorrectItems.forEach((item) => {
    addWeakness(
      map,
      studentId,
      item?.blockType || item?.questionFamily || item?.questionType || item?.blockTitle || attempt?.taskLabel,
      1,
      {
        section: item?.section || section,
        blockType: item?.blockType || "",
        questionFamily: item?.questionFamily || "",
        taskType: attempt?.taskType || "",
      },
    );
  });

  if (!incorrectItems.length) {
    const incorrectCount = Number(attempt?.score?.incorrectCount);
    if (Number.isFinite(incorrectCount) && incorrectCount > 0) {
      const blockResults = Array.isArray(evaluation?.blockResults)
        ? evaluation.blockResults
        : Array.isArray(payload?.blockResults)
          ? payload.blockResults
          : [];

      if (blockResults.length) {
        blockResults.forEach((block) => {
          const misses = Number(block?.totalQuestions || 0) - Number(block?.correctCount || 0);
          if (Number.isFinite(misses) && misses > 0) {
            addWeakness(
              map,
              studentId,
              block?.blockType || block?.questionFamily || block?.blockTitle || attempt?.taskLabel,
              misses,
              {
                section: block?.section || section,
                blockType: block?.blockType || "",
                questionFamily: block?.questionFamily || "",
                taskType: attempt?.taskType || "",
              },
            );
          }
        });
      } else {
        addWeakness(
          map,
          studentId,
          payload?.blockType || payload?.questionFamily || attempt?.sourceType || attempt?.taskLabel || attempt?.taskType,
          incorrectCount,
          { section, taskType: attempt?.taskType || "" },
        );
      }
    }
  }
}

function lowestCriteriaLabels(criteriaScores = {}, taskType = "") {
  const entries = Object.entries(criteriaScores || {})
    .map(([key, value]) => [key, Number(value)])
    .filter(([, value]) => Number.isFinite(value) && value > 0);
  if (!entries.length) {
    return [];
  }

  const lowest = Math.min(...entries.map(([, value]) => value));
  if (lowest >= 6) {
    return [];
  }

  return entries
    .filter(([, value]) => value === lowest)
    .map(([key]) => {
      if (key === "taskAchievement") return "Task Achievement";
      if (key === "taskResponse") return "Task Response";
      if (key === "coherenceCohesion") return "Coherence and Cohesion";
      if (key === "lexicalResource") return "Lexical Resource";
      if (key === "grammaticalRangeAccuracy") return "Writing Grammar Accuracy";
      return taskType || key;
    });
}

function collectWritingWeaknesses(map, analysis, taskType) {
  const studentId = String(analysis?.studentUserId || "").trim();
  const diagnosis = analysis?.diagnosis && typeof analysis.diagnosis === "object" ? analysis.diagnosis : {};

  [
    ["taskIssues", taskType === "writing_task1" ? "Task Achievement" : "Task Response"],
    ["coherenceIssues", "Coherence and Cohesion"],
    ["lexicalIssues", "Lexical Resource"],
    ["grammarIssues", "Writing Grammar Accuracy"],
  ].forEach(([key, label]) => {
    const items = Array.isArray(diagnosis?.[key]) ? diagnosis[key] : [];
    if (items.length) {
      addWeakness(map, studentId, label, items.length, { section: "writing" });
    }
  });

  lowestCriteriaLabels(analysis?.criteriaScores || {}, taskType).forEach((label) => {
    addWeakness(map, studentId, label, 1, { section: "writing" });
  });

  (Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []).slice(0, 3).forEach((label) => {
    addWeakness(map, studentId, label, 1, { section: "writing" });
  });
}

function buildTopWeaknesses(weaknessMap) {
  const result = new Map();
  weaknessMap.forEach((studentMap, studentId) => {
    const top = Array.from(studentMap.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
    result.set(studentId, top ? { label: top[0], count: top[1] } : { label: FALLBACK_LABEL, count: 0 });
  });
  return result;
}

async function getWeaknessSummaries(studentIds = []) {
  const safeStudentIds = Array.from(new Set(studentIds.map((id) => String(id || "").trim()).filter(Boolean)));
  const weaknessMap = new Map();

  if (!safeStudentIds.length) {
    return new Map();
  }

  const [attempts, task1Analyses, task2Analyses] = await Promise.all([
    StudentTaskAttempt.find(
      { studentUserId: { $in: safeStudentIds }, status: "completed" },
      { studentUserId: 1, taskType: 1, taskLabel: 1, sourceType: 1, score: 1, payload: 1, submittedAt: 1 },
    )
      .sort({ submittedAt: -1 })
      .limit(Math.max(1000, safeStudentIds.length * 80))
      .lean(),
    WritingTask1Analysis.find(
      { studentUserId: { $in: safeStudentIds }, status: "completed" },
      { studentUserId: 1, weaknesses: 1, diagnosis: 1, criteriaScores: 1, submittedAt: 1 },
    )
      .sort({ submittedAt: -1 })
      .limit(Math.max(500, safeStudentIds.length * 30))
      .lean(),
    WritingTask2Analysis.find(
      { studentUserId: { $in: safeStudentIds }, status: "completed" },
      { studentUserId: 1, weaknesses: 1, diagnosis: 1, criteriaScores: 1, submittedAt: 1 },
    )
      .sort({ submittedAt: -1 })
      .limit(Math.max(500, safeStudentIds.length * 30))
      .lean(),
  ]);

  attempts.forEach((attempt) => collectAttemptWeaknesses(weaknessMap, attempt));
  task1Analyses.forEach((analysis) => collectWritingWeaknesses(weaknessMap, analysis, "writing_task1"));
  task2Analyses.forEach((analysis) => collectWritingWeaknesses(weaknessMap, analysis, "writing_task2"));

  const topByStudent = buildTopWeaknesses(weaknessMap);
  safeStudentIds.forEach((studentId) => {
    if (!topByStudent.has(studentId)) {
      topByStudent.set(studentId, { label: FALLBACK_LABEL, count: 0 });
    }
  });

  return topByStudent;
}

module.exports = {
  FALLBACK_LABEL,
  getWeaknessSummaries,
  readableWeaknessLabel,
};
