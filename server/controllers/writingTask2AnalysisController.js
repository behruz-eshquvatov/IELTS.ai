const WritingTask2Analysis = require("../models/writingTask2AnalysisModel");

const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

function countWords(value) {
  const safeValue = String(value || "").trim();
  if (!safeValue) {
    return 0;
  }

  return safeValue.split(/\s+/).length;
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function clampBand(value, fallback = 5.0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return roundToHalf(fallback);
  }

  return roundToHalf(Math.min(Math.max(parsed, 0), 9));
}

function normalizeText(value, fallback = "", maxLength = 400) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function normalizeStringList(value, maxItems, defaultItems = []) {
  if (!Array.isArray(value)) {
    return defaultItems.slice(0, maxItems);
  }

  const normalized = value
    .map((item) => normalizeText(item, "", 280))
    .filter(Boolean)
    .slice(0, maxItems);

  if (normalized.length === 0) {
    return defaultItems.slice(0, maxItems);
  }

  return normalized;
}

function parseJsonObject(rawContent) {
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawContent);
  } catch {
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return null;
    }

    const candidate = rawContent.slice(firstBrace, lastBrace + 1);

    try {
      return JSON.parse(candidate);
    } catch {
      return null;
    }
  }
}

function classifyOpenAiError(responseBody, statusCode) {
  const apiCode = String(responseBody?.error?.code || "").trim().toLowerCase();
  const apiType = String(responseBody?.error?.type || "").trim().toLowerCase();
  const apiMessage = String(responseBody?.error?.message || "").trim();
  const combined = `${apiCode} ${apiType} ${apiMessage}`.toLowerCase();

  if (
    apiCode === "insufficient_quota" ||
    combined.includes("quota") ||
    combined.includes("billing")
  ) {
    return {
      code: "quota_exceeded",
      statusCode: 402,
      userMessage:
        "AI quota exceeded. Please check your OpenAI plan and billing details.",
      technicalMessage: apiMessage || "OpenAI quota exceeded.",
    };
  }

  if (statusCode === 429) {
    return {
      code: "rate_limited",
      statusCode: 429,
      userMessage: "AI is rate-limited right now. Please retry in a moment.",
      technicalMessage: apiMessage || "OpenAI rate limit reached.",
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      code: "auth_failed",
      statusCode: 502,
      userMessage: "AI provider authentication failed. Verify OPENAI_API_KEY.",
      technicalMessage: apiMessage || "OpenAI authentication failed.",
    };
  }

  return {
    code: "openai_error",
    statusCode: 502,
    userMessage: "AI analysis failed. Please try again.",
    technicalMessage: apiMessage || "OpenAI request failed.",
  };
}

function buildEssayIndicators(essayText, wordsCount, timeSpentSeconds) {
  const paragraphs = String(essayText || "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const sentenceMatches = essayText.match(/[^.!?]+[.!?]?/g) || [];
  const sentenceCount = sentenceMatches
    .map((item) => item.trim())
    .filter(Boolean).length;
  const connectorCount =
    (essayText.match(
      /\bhowever\b|\btherefore\b|\bmoreover\b|\bfurthermore\b|\bin conclusion\b|\bon the other hand\b/gi,
    ) || []).length;
  const repeatedTokenCount = (() => {
    const tokens = essayText
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    const frequency = new Map();
    tokens.forEach((token) => {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    });
    return Array.from(frequency.values()).filter((count) => count >= 6).length;
  })();

  return {
    wordsCount,
    paragraphCount: paragraphs.length,
    sentenceCount,
    averageWordsPerSentence:
      sentenceCount > 0 ? Number((wordsCount / sentenceCount).toFixed(1)) : wordsCount,
    connectorCount,
    repeatedTokenGroups: repeatedTokenCount,
    timeSpentSeconds,
    lineIndexedParagraphs: paragraphs.map((paragraph, index) => ({
      line: index + 1,
      text: paragraph,
    })),
  };
}

async function requestOpenAiAnalysis({
  question,
  essayText,
  wordsCount,
  timeSpentSeconds,
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is not configured.");
    error.code = "missing_api_key";
    throw error;
  }

  const systemPrompt = `
You are an Expert IELTS Writing Examiner with 20+ years of experience.
Evaluate IELTS Writing Task 2 essays with high precision according to 2026 IELTS standards.
Return diagnostic output only.

Follow this mandatory evaluation sequence:
Step 1: Task Response Evaluation
Step 2: Coherence and Cohesion Check
Step 3: Vocabulary Analysis
Step 4: Grammar Analysis
Step 5: Error Highlighting
Step 6: Score Estimation (Band Prediction)
Step 7: Diagnosis Consolidation

Scoring criteria:
1) Task Response (TR)
2) Coherence and Cohesion (CC)
3) Lexical Resource (LR)
4) Grammatical Range and Accuracy (GRA)

Use calibration intent:
- Band 5.5 style: partial development, limited cohesion/grammar control.
- Band 8.0 style: strong development, clear progression, broad lexical and grammatical control.

Output protocol:
- STRICTLY NO MARKDOWN
- STRICTLY NO CODE FENCES
- Return only a valid JSON object
- Do not include chain-of-thought or internal reasoning text
- Keep output diagnostic, concise, and structured

Use this exact JSON shape:
{
  "overallBand": number,
  "criteriaScores": {
    "taskResponse": number,
    "coherenceCohesion": number,
    "lexicalResource": number,
    "grammaticalRangeAccuracy": number
  },
  "summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "detections": [
    {
      "label": "Grammar | Repetition | Coherence | Vocabulary | Task Response",
      "line": "Line N",
      "issue": "short issue",
      "fix": "short correction",
      "wrongText": "exact problematic phrase from essay",
      "correctedText": "improved phrase"
    }
  ]
}

Hard constraints:
- Bands use 0.5 increments, range 0.0..9.0
- strengths max 4, weaknesses max 5, detections max 6
- summary <= 75 words
- wrongText must be copied exactly from essay text
- line must reference provided lineIndexedParagraphs
- correctedText must be plain corrected phrase

Prompt Style
Token Usage Impact
No verification
Baseline
"Double check" (implicit)
+10% to +50% typically
Explicit step-by-step + verification
+50% to +150%
Two separate calls (answer + review)
~2x (or more)
  `.trim();

  const indicators = buildEssayIndicators(essayText, wordsCount, timeSpentSeconds);

  const userPrompt = JSON.stringify(
    {
      task: "Diagnostic analysis for IELTS Writing Task 2",
      question,
      preprocessedIndicators: indicators,
      essayText,
    },
    null,
    2,
  );

  const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    const classification = classifyOpenAiError(responseBody, response.status);
    const error = new Error(classification.technicalMessage);
    error.code = classification.code;
    error.userMessage = classification.userMessage;
    error.httpStatus = classification.statusCode;
    throw error;
  }

  const rawContent = responseBody?.choices?.[0]?.message?.content;
  const parsed = parseJsonObject(rawContent);

  if (!parsed || typeof parsed !== "object") {
    const error = new Error("AI response is not valid JSON.");
    error.code = "invalid_ai_json";
    throw error;
  }

  return {
    model: DEFAULT_OPENAI_MODEL,
    parsed,
  };
}

function normalizeDetection(detector, index) {
  const label = normalizeText(detector?.label, "Grammar", 40);
  const line = normalizeText(detector?.line, `Line ${index + 1}`, 30);
  const issue = normalizeText(detector?.issue, "Needs revision for IELTS accuracy.", 180);
  const fix = normalizeText(detector?.fix, "Rewrite this part with clearer grammar.", 180);
  const wrongText = normalizeText(detector?.wrongText, "", 150);
  const correctedText = normalizeText(detector?.correctedText, "", 150);

  return {
    label,
    line,
    issue,
    fix,
    wrongText,
    correctedText,
  };
}

function normalizeAiPayload(aiPayload, wordsCount) {
  const fallbackBand = wordsCount >= 250 ? 6.0 : 5.0;
  const overallBand = clampBand(aiPayload?.overallBand, fallbackBand);

  const criteriaScores = {
    taskResponse: clampBand(aiPayload?.criteriaScores?.taskResponse, overallBand),
    coherenceCohesion: clampBand(aiPayload?.criteriaScores?.coherenceCohesion, overallBand),
    lexicalResource: clampBand(aiPayload?.criteriaScores?.lexicalResource, overallBand),
    grammaticalRangeAccuracy: clampBand(
      aiPayload?.criteriaScores?.grammaticalRangeAccuracy,
      overallBand,
    ),
  };

  const summary = normalizeText(
    aiPayload?.summary,
    "The essay is on topic, but it needs more precise grammar and stronger supporting development for a higher IELTS band.",
    400,
  );

  const strengths = normalizeStringList(aiPayload?.strengths, 4, [
    "Essay stays relevant to the prompt.",
    "Main opinion is generally clear.",
  ]);

  const weaknesses = normalizeStringList(aiPayload?.weaknesses, 5, [
    "Develop ideas with more specific examples.",
    "Improve grammar control in longer sentences.",
  ]);

  const detections = Array.isArray(aiPayload?.detections)
    ? aiPayload.detections.slice(0, 6).map(normalizeDetection)
    : [];

  return {
    overallBand,
    criteriaScores,
    summary,
    strengths,
    weaknesses,
    detections,
  };
}

function toAnalysisResponse(analysisDocument) {
  return {
    id: String(analysisDocument._id),
    status: analysisDocument.status,
    setId: analysisDocument.setId,
    source: analysisDocument.source,
    submittedAt: analysisDocument.submittedAt,
    question: analysisDocument.question,
    questionMeta: analysisDocument.questionMeta,
    essayText: analysisDocument.essayText,
    wordsCount: analysisDocument.wordsCount,
    durationSeconds: analysisDocument.durationSeconds,
    remainingSecondsAtSubmit: analysisDocument.remainingSecondsAtSubmit,
    timeSpentSeconds: analysisDocument.timeSpentSeconds,
    aiModel: analysisDocument.aiModel,
    overallBand: analysisDocument.overallBand,
    criteriaScores: analysisDocument.criteriaScores,
    summary: analysisDocument.summary,
    strengths: analysisDocument.strengths,
    weaknesses: analysisDocument.weaknesses,
    detections: analysisDocument.detections,
    failureReason: analysisDocument.failureReason,
    createdAt: analysisDocument.createdAt,
    updatedAt: analysisDocument.updatedAt,
  };
}

async function createWritingTask2Analysis(req, res) {
  const body = req.body || {};
  const question = normalizeText(body.question, "", 1200);
  const essayText = typeof body.essayText === "string" ? body.essayText.trim() : "";

  if (!question) {
    return res.status(400).json({ message: "Question is required." });
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
  const submittedAt = body.submittedAt ? new Date(body.submittedAt) : new Date();
  const safeSubmittedAt = Number.isNaN(submittedAt.valueOf()) ? new Date() : submittedAt;

  const analysis = await WritingTask2Analysis.create({
    setId: normalizeText(body.setId, "", 120),
    source: ["manual", "auto", "focus-lost"].includes(body.source) ? body.source : "manual",
    submittedAt: safeSubmittedAt,
    question,
    questionMeta: Array.isArray(body.questionMeta)
      ? body.questionMeta.map((item) => normalizeText(item, "", 80)).filter(Boolean).slice(0, 6)
      : [],
    essayText,
    wordsCount,
    durationSeconds,
    remainingSecondsAtSubmit,
    timeSpentSeconds,
    status: "processing",
  });

  try {
    const aiResult = await requestOpenAiAnalysis({
      question,
      essayText,
      wordsCount,
      timeSpentSeconds,
    });
    const normalized = normalizeAiPayload(aiResult.parsed, wordsCount);

    analysis.status = "completed";
    analysis.aiModel = aiResult.model;
    analysis.overallBand = normalized.overallBand;
    analysis.criteriaScores = normalized.criteriaScores;
    analysis.summary = normalized.summary;
    analysis.strengths = normalized.strengths;
    analysis.weaknesses = normalized.weaknesses;
    analysis.detections = normalized.detections;
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
          ? "AI is not configured on the server. Add OPENAI_API_KEY."
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

  return res.json({
    analysis: toAnalysisResponse(analysis),
  });
}

module.exports = {
  createWritingTask2Analysis,
  getWritingTask2AnalysisById,
};
