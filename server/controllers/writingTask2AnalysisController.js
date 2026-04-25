const WritingTask2Analysis = require("../models/writingTask2AnalysisModel");
const {
  evaluateWritingEssay,
  countWords,
  normalizeText,
} = require("../services/writingAiEvaluationService");
const { assertAdditionalTaskUnlocked } = require("../services/additionalTaskProgressService");

const ALLOWED_SUBMIT_SOURCES = new Set([
  "manual",
  "auto",
  "focus-lost",
  "page-hide",
  "leave-page",
  "before-unload",
]);

function toSafeDate(value) {
  const parsed = value ? new Date(value) : new Date();
  if (Number.isNaN(parsed.valueOf())) {
    return new Date();
  }

  return parsed;
}

function normalizeSource(value) {
  const safe = String(value || "").trim().toLowerCase();
  if (ALLOWED_SUBMIT_SOURCES.has(safe)) {
    return safe;
  }

  return "manual";
}

function normalizeAttemptCategory(value) {
  const safe = String(value || "").trim().toLowerCase();
  return safe === "daily" || safe === "additional" ? safe : "";
}

function normalizeSourceType(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function toAnalysisResponse(doc) {
  return {
    id: String(doc?._id || ""),
    studentUserId: String(doc?.studentUserId || ""),
    studentEmail: String(doc?.studentEmail || ""),
    taskType: String(doc?.taskType || "writing_task2"),
    taskRefId: String(doc?.taskRefId || ""),
    taskLabel: String(doc?.taskLabel || ""),
    setId: String(doc?.setId || ""),
    source: String(doc?.source || "manual"),
    submittedAt: doc?.submittedAt || null,
    question: doc?.question || "",
    questionTopic: doc?.questionTopic || doc?.question || "",
    questionMeta: Array.isArray(doc?.questionMeta) ? doc.questionMeta : [],
    essayText: doc?.essayText || "",
    wordsCount: Number(doc?.wordsCount || 0),
    durationSeconds: Number(doc?.durationSeconds || 0),
    remainingSecondsAtSubmit: Number(doc?.remainingSecondsAtSubmit || 0),
    timeSpentSeconds: Number(doc?.timeSpentSeconds || 0),
    status: String(doc?.status || "processing"),
    aiModel: doc?.aiModel || "",
    overallBand: Number.isFinite(Number(doc?.overallBand)) ? Number(doc.overallBand) : null,
    criteriaScores: doc?.criteriaScores || {},
    criteriaFeedback: doc?.criteriaFeedback || {},
    summary: doc?.summary || "",
    strengths: Array.isArray(doc?.strengths) ? doc.strengths : [],
    weaknesses: Array.isArray(doc?.weaknesses) ? doc.weaknesses : [],
    suggestions: Array.isArray(doc?.suggestions) ? doc.suggestions : [],
    diagnosis: doc?.diagnosis || {},
    detections: Array.isArray(doc?.detections) ? doc.detections : [],
    failureReason: doc?.failureReason || "",
    createdAt: doc?.createdAt || null,
    updatedAt: doc?.updatedAt || null,
  };
}

async function createWritingTask2Analysis(req, res) {
  const body = req.body || {};
  const questionTopic = normalizeText(body.questionTopic || body.question, "", 2000);
  const question = questionTopic;
  const essayText = typeof body.essayText === "string" ? body.essayText.trim() : "";
  if (!questionTopic) {
    return res.status(400).json({ message: "Question topic is required." });
  }
  if (!essayText) {
    return res.status(400).json({ message: "Essay text is required." });
  }

  const wordsCount = Number.isFinite(Number(body.wordsCount))
    ? Math.max(Number(body.wordsCount), 0)
    : countWords(essayText);
  const durationSeconds = Number.isFinite(Number(body.durationSeconds))
    ? Math.max(Number(body.durationSeconds), 0)
    : 0;
  const remainingSecondsAtSubmit = Number.isFinite(Number(body.remainingSecondsAtSubmit))
    ? Math.max(Number(body.remainingSecondsAtSubmit), 0)
    : 0;
  const timeSpentSeconds = Number.isFinite(Number(body.timeSpentSeconds))
    ? Math.max(Number(body.timeSpentSeconds), 0)
    : Math.max(durationSeconds - remainingSecondsAtSubmit, 0);

  const source = normalizeSource(body.source);
  const studentUserId = String(req.auth?.userId || "").trim();
  const studentEmail = String(req.auth?.email || "").trim().toLowerCase();
  const taskRefId = normalizeText(body.setId || body.taskRefId, "", 120);
  const taskLabel = normalizeText(body.taskLabel || questionTopic, "", 280);
  const attemptCategory = normalizeAttemptCategory(body.attemptCategory);
  const sourceType = normalizeSourceType(body.sourceType);

  if (attemptCategory === "additional" && sourceType) {
    try {
      await assertAdditionalTaskUnlocked({
        studentUserId,
        taskType: "writing_task2",
        taskRefId,
        sourceType,
        payload: body,
      });
    } catch (error) {
      const statusCode = Number(error?.httpStatus) || 403;
      return res.status(statusCode).json({
        message: error?.message || "This additional task is locked.",
      });
    }
  }

  const analysis = await WritingTask2Analysis.create({
    studentUserId,
    studentEmail,
    taskType: "writing_task2",
    taskRefId,
    taskLabel,
    setId: taskRefId,
    source,
    submittedAt: toSafeDate(body.submittedAt),
    question,
    questionTopic,
    questionMeta: Array.isArray(body.questionMeta)
      ? body.questionMeta.map((entry) => normalizeText(entry, "", 160)).filter(Boolean).slice(0, 10)
      : [],
    essayText,
    wordsCount,
    durationSeconds,
    remainingSecondsAtSubmit,
    timeSpentSeconds,
    status: "processing",
  });

  try {
    const aiResult = await evaluateWritingEssay({
      taskType: "writing_task2",
      question,
      questionTopic,
      essayText,
      questionMeta: analysis.questionMeta,
      wordsCount,
      timeSpentSeconds,
    });

    analysis.status = "completed";
    analysis.aiModel = aiResult.model;
    analysis.overallBand = aiResult.normalized.overallBand;
    analysis.criteriaScores = aiResult.normalized.criteriaScores;
    analysis.criteriaFeedback = aiResult.normalized.criteriaFeedback;
    analysis.summary = aiResult.normalized.summary;
    analysis.strengths = aiResult.normalized.strengths;
    analysis.weaknesses = aiResult.normalized.weaknesses;
    analysis.suggestions = aiResult.normalized.suggestions;
    analysis.diagnosis = aiResult.normalized.diagnosis;
    analysis.detections = aiResult.normalized.detections;
    analysis.rawAiPayload = aiResult.normalized.rawAiPayload;
    analysis.failureReason = "";
    await analysis.save();

    return res.status(201).json({
      analysis: toAnalysisResponse(analysis),
    });
  } catch (error) {
    analysis.status = "failed";
    analysis.failureReason = normalizeText(error.message, "AI analysis failed.", 240);
    await analysis.save();

    const statusCode =
      error.code === "missing_api_key" ? 503 : Number(error.httpStatus) || 502;
    return res.status(statusCode).json({
      message:
        error.code === "missing_api_key"
          ? "AI is not configured on the server. Add OPENROUTER_API_KEY_V2."
          : error.userMessage || "AI analysis failed. Please try again.",
      analysis: toAnalysisResponse(analysis),
    });
  }
}

async function getWritingTask2AnalysisById(req, res) {
  const analysisId = String(req.params.analysisId || "").trim();
  const analysis = await WritingTask2Analysis.findById(analysisId);
  if (!analysis) {
    return res.status(404).json({
      message: "Analysis not found.",
    });
  }

  const authUserId = String(req.auth?.userId || "").trim();
  if (analysis.studentUserId && authUserId && analysis.studentUserId !== authUserId) {
    return res.status(403).json({
      message: "You are not allowed to access this analysis.",
    });
  }

  return res.json({
    analysis: toAnalysisResponse(analysis),
  });
}

module.exports = {
  createWritingTask2Analysis,
  getWritingTask2AnalysisById,
};
