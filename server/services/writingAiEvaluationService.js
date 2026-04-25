const DEFAULT_AI_MODEL =
  process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || "openai/gpt-4.1-mini";
const DEFAULT_MAX_TOKENS = (() => {
  const parsed = Number.parseInt(String(process.env.OPENROUTER_MAX_TOKENS || "20000"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 20000;
  }
  return Math.min(parsed, 20000);
})();
const OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL || "http://localhost:5173";
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || "english-writing-evaluator";

const TASK_CONFIG = {
  writing_task1: {
    taskType: "writing_task1",
    taskName: "IELTS Writing Task 1",
    promptCriterionLabel: "Task Achievement",
    promptCriterionKey: "taskAchievement",
    criteriaKeys: [
      "taskAchievement",
      "coherenceCohesion",
      "lexicalResource",
      "grammaticalRangeAccuracy",
    ],
  },
  writing_task2: {
    taskType: "writing_task2",
    taskName: "IELTS Writing Task 2",
    promptCriterionLabel: "Task Response",
    promptCriterionKey: "taskResponse",
    criteriaKeys: [
      "taskResponse",
      "coherenceCohesion",
      "lexicalResource",
      "grammaticalRangeAccuracy",
    ],
  },
};

const COMMON_STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "as", "at", "by", "for", "from",
  "in", "into", "of", "on", "to", "with", "without", "about", "between", "within", "over", "under",
  "during", "after", "before", "this", "that", "these", "those", "is", "are", "was", "were", "be",
  "been", "being", "it", "its", "their", "there", "they", "them", "he", "she", "his", "her", "we",
  "our", "you", "your", "i", "my", "me", "do", "does", "did", "have", "has", "had", "can", "could",
  "will", "would", "should", "may", "might", "must", "not", "no", "so", "also", "very", "more",
  "most", "less", "least", "many", "much", "some", "such", "other", "another", "each", "per",
]);

const TASK1_GENERIC_WORDS = new Set([
  "chart", "graph", "table", "diagram", "figure", "illustrates", "shows", "show", "compares",
  "comparison", "information", "data", "period", "percentage", "percent", "number", "numbers",
  "amount", "amounts", "total", "totals", "index", "indices", "value", "values", "trend", "trends",
  "increase", "increased", "decrease", "decreased", "rise", "rose", "fall", "fell", "year", "years",
  "day", "days", "month", "months",
]);

function normalizeText(value, fallback = "", maxLength = 420) {
  if (typeof value !== "string") {
    return fallback;
  }

  const safe = value.replace(/\s+/g, " ").trim();
  if (!safe) {
    return fallback;
  }

  return safe.slice(0, maxLength);
}

function normalizeStringList(value, maxItems = 6, fallback = []) {
  if (!Array.isArray(value)) {
    return fallback.slice(0, maxItems);
  }

  const normalized = value
    .map((item) => normalizeText(item, "", 260))
    .filter(Boolean)
    .slice(0, maxItems);

  if (normalized.length > 0) {
    return normalized;
  }

  return fallback.slice(0, maxItems);
}

function normalizeVisualContext(value) {
  const imageId = normalizeText(value?.imageId, "", 120);
  const url = normalizeText(value?.url, "", 1400);
  const mimeType = normalizeText(value?.mimeType, "", 80);
  const rawImageDataUrl = typeof value?.imageDataUrl === "string"
    ? value.imageDataUrl.trim()
    : "";
  const imageDataUrl =
    rawImageDataUrl.startsWith("data:image/") && rawImageDataUrl.length <= 8_000_000
      ? rawImageDataUrl
      : "";

  return {
    imageId,
    url,
    mimeType,
    imageDataUrl,
  };
}

function countWords(value) {
  const safe = String(value || "").trim();
  if (!safe) {
    return 0;
  }

  return safe.split(/\s+/).length;
}

function normalizeToken(token) {
  return String(token || "").trim().toLowerCase();
}

function extractComparableTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => normalizeToken(token))
    .filter((token) => token.length >= 3)
    .filter((token) => !COMMON_STOP_WORDS.has(token))
    .filter((token) => !TASK1_GENERIC_WORDS.has(token));
}

function extractYearSet(value) {
  const matches = String(value || "").match(/\b(?:19|20)\d{2}\b/g) || [];
  return new Set(matches.map((entry) => entry.trim()));
}

function getFirstSentence(value, maxLength = 220) {
  const safe = String(value || "").trim();
  if (!safe) {
    return "";
  }

  const sentence = (safe.match(/[^.!?]+[.!?]?/) || [safe])[0].trim();
  return sentence.slice(0, maxLength);
}

function detectTask1TopicMismatch({
  question,
  questionMeta,
  essayText,
}) {
  const promptContext = `${String(question || "")} ${Array.isArray(questionMeta) ? questionMeta.join(" ") : ""}`;
  const questionTokenSet = new Set(extractComparableTokens(promptContext));
  const essayTokenSet = new Set(extractComparableTokens(essayText));

  const overlapCount = Array.from(questionTokenSet).filter((token) => essayTokenSet.has(token)).length;
  const questionTokenCount = questionTokenSet.size;
  const overlapRatio = questionTokenCount > 0
    ? overlapCount / questionTokenCount
    : 1;

  const questionYears = extractYearSet(promptContext);
  const essayYears = extractYearSet(essayText);
  const yearOverlapCount = Array.from(questionYears).filter((year) => essayYears.has(year)).length;
  const hasYearMismatch = questionYears.size > 0 && essayYears.size > 0 && yearOverlapCount === 0;

  const reasons = [];
  if (questionTokenCount >= 8 && overlapRatio < 0.16) {
    reasons.push("topic_terms_do_not_match_prompt");
  } else if (questionTokenCount >= 6 && overlapRatio < 0.12) {
    reasons.push("very_low_topic_overlap");
  }
  if (hasYearMismatch) {
    reasons.push("time_period_mismatch");
  }

  if (questionYears.size >= 2 && essayYears.size === 0 && overlapRatio < 0.2) {
    reasons.push("essay_misses_required_time_reference");
  }

  const isMismatch = reasons.length > 0;
  const isSevere = hasYearMismatch || overlapRatio < 0.12;
  return {
    isMismatch,
    severity: isMismatch ? (isSevere ? "severe" : "moderate") : "none",
    reasons,
    overlapRatio,
    questionTokenCount,
    questionYears: questionYears.size,
    essayYears: essayYears.size,
    yearOverlapCount,
  };
}

function applyTask1MismatchPenalty(normalizedPayload, mismatchInfo, essayText) {
  if (!mismatchInfo?.isMismatch) {
    return normalizedPayload;
  }

  const isSevere = mismatchInfo.severity === "severe";
  const taskCap = isSevere ? 3.5 : 4.0;
  const overallCap = isSevere ? 4.5 : 5.0;

  if (!normalizedPayload?.criteriaScores || typeof normalizedPayload.criteriaScores !== "object") {
    normalizedPayload.criteriaScores = {};
  }

  const currentTaskScore = Number(normalizedPayload.criteriaScores.taskAchievement);
  normalizedPayload.criteriaScores.taskAchievement = clampBand(
    Number.isFinite(currentTaskScore) ? Math.min(currentTaskScore, taskCap) : taskCap,
    taskCap,
  );
  normalizedPayload.overallBand = clampBand(
    Math.min(Number(normalizedPayload.overallBand) || overallCap, overallCap),
    overallCap,
  );

  const mismatchFeedback =
    "The response appears misaligned with the provided graph/chart content (topic, time period, or key data), which severely limits Task Achievement in IELTS Task 1.";
  normalizedPayload.criteriaFeedback.taskAchievement = normalizeText(
    `${normalizedPayload.criteriaFeedback.taskAchievement || ""} ${mismatchFeedback}`.trim(),
    mismatchFeedback,
    380,
  );

  const mismatchWeakness =
    "The essay does not accurately describe the specific graph/chart data and appears to address a different topic.";
  const mismatchSuggestion =
    "Rewrite using only the provided chart details: correct variables, categories, years/time range, and key comparisons.";
  const mismatchTaskIssue =
    "Task mismatch: content does not align with the given chart/image data.";

  if (!Array.isArray(normalizedPayload.weaknesses)) {
    normalizedPayload.weaknesses = [];
  }
  if (!normalizedPayload.weaknesses.includes(mismatchWeakness)) {
    normalizedPayload.weaknesses.unshift(mismatchWeakness);
    normalizedPayload.weaknesses = normalizedPayload.weaknesses.slice(0, 6);
  }

  if (!Array.isArray(normalizedPayload.suggestions)) {
    normalizedPayload.suggestions = [];
  }
  if (!normalizedPayload.suggestions.includes(mismatchSuggestion)) {
    normalizedPayload.suggestions.unshift(mismatchSuggestion);
    normalizedPayload.suggestions = normalizedPayload.suggestions.slice(0, 6);
  }

  if (!normalizedPayload.diagnosis || typeof normalizedPayload.diagnosis !== "object") {
    normalizedPayload.diagnosis = {};
  }
  if (!Array.isArray(normalizedPayload.diagnosis.taskIssues)) {
    normalizedPayload.diagnosis.taskIssues = [];
  }
  if (!normalizedPayload.diagnosis.taskIssues.includes(mismatchTaskIssue)) {
    normalizedPayload.diagnosis.taskIssues.unshift(mismatchTaskIssue);
    normalizedPayload.diagnosis.taskIssues = normalizedPayload.diagnosis.taskIssues.slice(0, 6);
  }

  if (!Array.isArray(normalizedPayload.detections)) {
    normalizedPayload.detections = [];
  }
  if (normalizedPayload.detections.length < 8) {
    normalizedPayload.detections.unshift(
      normalizeDetection(
        {
          category: "task",
          label: "Task mismatch",
          line: "Line 1",
          issue: "Essay appears off-topic for the given chart/image data.",
          whyItHurtsBand: "Task 1 rewards accurate data description; off-topic content sharply lowers the band.",
          fix: "Describe the exact chart variables, categories, values, and time period shown in the prompt.",
          wrongText: getFirstSentence(essayText, 180),
          correctedText: "",
        },
        0,
      ),
    );
    normalizedPayload.detections = normalizedPayload.detections.slice(0, 8);
  }

  return normalizedPayload;
}

function detectTask2TopicMismatch({
  question,
  questionMeta,
  essayText,
}) {
  const promptContext = `${String(question || "")} ${Array.isArray(questionMeta) ? questionMeta.join(" ") : ""}`;
  const questionTokenSet = new Set(extractComparableTokens(promptContext));
  const essayTokenSet = new Set(extractComparableTokens(essayText));

  const overlapCount = Array.from(questionTokenSet).filter((token) => essayTokenSet.has(token)).length;
  const questionTokenCount = questionTokenSet.size;
  const overlapRatio = questionTokenCount > 0
    ? overlapCount / questionTokenCount
    : 1;

  const reasons = [];
  if (questionTokenCount >= 8 && overlapRatio < 0.18) {
    reasons.push("prompt_terms_do_not_match_essay");
  } else if (questionTokenCount >= 6 && overlapRatio < 0.13) {
    reasons.push("very_low_prompt_overlap");
  }

  const isMismatch = reasons.length > 0;
  const isSevere = overlapRatio < 0.1;
  return {
    isMismatch,
    severity: isMismatch ? (isSevere ? "severe" : "moderate") : "none",
    reasons,
    overlapRatio,
    questionTokenCount,
  };
}

function applyTask2MismatchPenalty(normalizedPayload, mismatchInfo, essayText) {
  if (!mismatchInfo?.isMismatch) {
    return normalizedPayload;
  }

  const isSevere = mismatchInfo.severity === "severe";
  const taskCap = isSevere ? 4.0 : 4.5;
  const overallCap = isSevere ? 5.0 : 5.5;

  if (!normalizedPayload?.criteriaScores || typeof normalizedPayload.criteriaScores !== "object") {
    normalizedPayload.criteriaScores = {};
  }

  const currentTaskScore = Number(normalizedPayload.criteriaScores.taskResponse);
  normalizedPayload.criteriaScores.taskResponse = clampBand(
    Number.isFinite(currentTaskScore) ? Math.min(currentTaskScore, taskCap) : taskCap,
    taskCap,
  );
  normalizedPayload.overallBand = clampBand(
    Math.min(Number(normalizedPayload.overallBand) || overallCap, overallCap),
    overallCap,
  );

  const mismatchFeedback =
    "The essay appears insufficiently aligned with the exact Task 2 question, so Task Response is limited despite language quality.";
  normalizedPayload.criteriaFeedback.taskResponse = normalizeText(
    `${normalizedPayload.criteriaFeedback.taskResponse || ""} ${mismatchFeedback}`.trim(),
    mismatchFeedback,
    380,
  );

  const mismatchWeakness =
    "The response drifts from the specific question focus, reducing direct relevance.";
  const mismatchSuggestion =
    "Rebuild the essay around the exact prompt wording and answer each required part directly.";
  const mismatchTaskIssue =
    "Task mismatch: essay content does not fully address the given Task 2 question.";

  if (!Array.isArray(normalizedPayload.weaknesses)) {
    normalizedPayload.weaknesses = [];
  }
  if (!normalizedPayload.weaknesses.includes(mismatchWeakness)) {
    normalizedPayload.weaknesses.unshift(mismatchWeakness);
    normalizedPayload.weaknesses = normalizedPayload.weaknesses.slice(0, 6);
  }

  if (!Array.isArray(normalizedPayload.suggestions)) {
    normalizedPayload.suggestions = [];
  }
  if (!normalizedPayload.suggestions.includes(mismatchSuggestion)) {
    normalizedPayload.suggestions.unshift(mismatchSuggestion);
    normalizedPayload.suggestions = normalizedPayload.suggestions.slice(0, 6);
  }

  if (!normalizedPayload.diagnosis || typeof normalizedPayload.diagnosis !== "object") {
    normalizedPayload.diagnosis = {};
  }
  if (!Array.isArray(normalizedPayload.diagnosis.taskIssues)) {
    normalizedPayload.diagnosis.taskIssues = [];
  }
  if (!normalizedPayload.diagnosis.taskIssues.includes(mismatchTaskIssue)) {
    normalizedPayload.diagnosis.taskIssues.unshift(mismatchTaskIssue);
    normalizedPayload.diagnosis.taskIssues = normalizedPayload.diagnosis.taskIssues.slice(0, 6);
  }

  if (!Array.isArray(normalizedPayload.detections)) {
    normalizedPayload.detections = [];
  }
  if (normalizedPayload.detections.length < 8) {
    normalizedPayload.detections.unshift(
      normalizeDetection(
        {
          category: "task",
          label: "Off-topic response",
          line: "Line 1",
          issue: "Essay focus does not clearly answer the assigned Task 2 question.",
          whyItHurtsBand: "Task Response rewards relevance to the exact prompt; drift lowers the score.",
          fix: "Address each part of the question directly and keep arguments tied to the prompt wording.",
          wrongText: getFirstSentence(essayText, 180),
          correctedText: "",
        },
        0,
      ),
    );
    normalizedPayload.detections = normalizedPayload.detections.slice(0, 8);
  }

  return normalizedPayload;
}

function roundToHalf(value) {
  return Math.round(Number(value) * 2) / 2;
}

function clampBand(value, fallback = 5.0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return roundToHalf(fallback);
  }

  return roundToHalf(Math.min(Math.max(parsed, 0), 9));
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

function classifyAiProviderError(responseBody, statusCode) {
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
      userMessage: "AI quota exceeded. Please check your OpenRouter plan and billing details.",
      technicalMessage: apiMessage || "OpenRouter quota exceeded.",
    };
  }

  if (statusCode === 429) {
    return {
      code: "rate_limited",
      statusCode: 429,
      userMessage: "AI is rate-limited right now. Please retry in a moment.",
      technicalMessage: apiMessage || "OpenRouter rate limit reached.",
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      code: "auth_failed",
      statusCode: 502,
      userMessage: "AI provider authentication failed. Verify OPENROUTER_API_KEY_V2.",
      technicalMessage: apiMessage || "OpenRouter authentication failed.",
    };
  }

  return {
    code: "ai_provider_error",
    statusCode: 502,
    userMessage: "AI analysis failed. Please try again.",
    technicalMessage: apiMessage || "OpenRouter request failed.",
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
  const connectorCount = (
    essayText.match(
      /\bhowever\b|\btherefore\b|\bmoreover\b|\bfurthermore\b|\bin conclusion\b|\bon the other hand\b|\bfor example\b|\bin contrast\b/gi,
    ) || []
  ).length;
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

function buildSystemPrompt(taskConfig) {
  const taskCriterionKey = taskConfig.promptCriterionKey;
  const taskSpecificStrictness = taskConfig.taskType === "writing_task1"
    ? `
- CRITICAL FOR TASK 1: First interpret the provided graph/chart image and prompt context before scoring.
- Verify the essay matches the graph/chart details (topic, categories, units, time period, indices, and key data relationships).
- If the essay discusses a different subject or mismatched data/timeframe, score Task Achievement very low.
- For clear graph-topic mismatch: set taskAchievement <= 4.0 and keep overallBand typically <= 5.0.
- For severe mismatch (completely different data/topic): taskAchievement can be 3.5 or lower and overallBand should remain low.
`.trim()
    : `
- CRITICAL FOR TASK 2: Score Task Response based on relevance to the exact question and whether all required parts are answered.
- If the essay is off-topic, partially on-topic, or misses a major question part, reduce Task Response even if grammar is strong.
- For clearly off-topic responses: set taskResponse <= 4.5 and keep overallBand typically <= 5.5.
`.trim();

  return `
You are a strict IELTS examiner. Evaluate essays exactly like IELTS Writing scoring.
Task under evaluation: ${taskConfig.taskName}.

Scoring criteria:
1) ${taskConfig.promptCriterionLabel} (${taskCriterionKey})
2) Coherence and Cohesion (coherenceCohesion)
3) Lexical Resource (lexicalResource)
4) Grammatical Range and Accuracy (grammaticalRangeAccuracy)

Required behavior:
- Give realistic IELTS-style scores in 0.5 steps.
- Explain clearly why each criterion received its score.
- Diagnose concrete weaknesses, not generic advice.
- Include grammar/repetition/coherence/task-completion issues when present.
- Use exact problematic phrases in wrongText when possible.
${taskSpecificStrictness ? taskSpecificStrictness : ""}

Output constraints:
- Return ONLY valid JSON object.
- No markdown, no code fences, no extra text.
- overallBand and all criterion scores must be in [0.0, 9.0] and increments of 0.5.
- strengths max 4, weaknesses max 6, suggestions max 6.
- detections max 8.
- summary <= 90 words.

Return exactly this JSON shape:
{
  "overallBand": number,
  "criteriaScores": {
    "${taskCriterionKey}": number,
    "coherenceCohesion": number,
    "lexicalResource": number,
    "grammaticalRangeAccuracy": number
  },
  "criteriaFeedback": {
    "${taskCriterionKey}": "string",
    "coherenceCohesion": "string",
    "lexicalResource": "string",
    "grammaticalRangeAccuracy": "string"
  },
  "summary": "string",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestions": ["string"],
  "diagnosis": {
    "taskIssues": ["string"],
    "coherenceIssues": ["string"],
    "lexicalIssues": ["string"],
    "grammarIssues": ["string"]
  },
  "detections": [
    {
      "category": "task|coherence|lexical|grammar|repetition",
      "label": "short label",
      "line": "Line N",
      "issue": "short issue",
      "whyItHurtsBand": "short reason",
      "fix": "short improvement",
      "wrongText": "exact problematic phrase from essay",
      "correctedText": "improved phrase"
    }
  ]
}
  `.trim();
}

async function requestOpenAiEvaluation({
  taskConfig,
  question,
  questionTopic,
  essayText,
  questionMeta,
  visualContext,
  wordsCount,
  timeSpentSeconds,
}) {
  const apiKey =
    process.env.OPENROUTER_API_KEY_V2
    || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const error = new Error(
      "OPENROUTER_API_KEY_V2 is not configured. Add it to server/.env and restart the server.",
    );
    error.code = "missing_api_key";
    throw error;
  }

  const safeQuestionTopic = normalizeText(questionTopic || question, "", 1600);
  const safeVisualContext = normalizeVisualContext(visualContext);
  const userPrompt = JSON.stringify(
    {
      task: `IELTS evaluation for ${taskConfig.taskName}`,
      taskContext: {
        questionTopic: safeQuestionTopic,
        questionMeta,
        visualAsset:
          taskConfig.taskType === "writing_task1"
            ? {
              imageId: safeVisualContext.imageId,
              url: safeVisualContext.url,
              mimeType: safeVisualContext.mimeType,
              visualImageIncluded: Boolean(safeVisualContext.imageDataUrl),
            }
            : null,
      },
      essayIndicators: buildEssayIndicators(essayText, wordsCount, timeSpentSeconds),
      essayText,
    },
    null,
    2,
  );

  const userMessageContent =
    taskConfig.taskType === "writing_task1" && safeVisualContext.imageDataUrl
      ? [
        {
          type: "text",
          text: `${userPrompt}\n\nInterpret the attached Task 1 graph/chart image and evaluate the essay against that exact visual context.`,
        },
        {
          type: "image_url",
          image_url: {
            url: safeVisualContext.imageDataUrl,
          },
        },
      ]
      : userPrompt;

  async function sendEvaluationRequest(content) {
    const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_SITE_URL,
        "X-Title": OPENROUTER_APP_NAME,
      },
      body: JSON.stringify({
        model: DEFAULT_AI_MODEL,
        temperature: 0.15,
        max_tokens: DEFAULT_MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(taskConfig) },
          { role: "user", content },
        ],
      }),
    });

    const responseBody = await response.json().catch(() => null);
    return { response, responseBody };
  }

  let { response, responseBody } = await sendEvaluationRequest(userMessageContent);
  if (!response.ok && Array.isArray(userMessageContent)) {
    const imageSupportError = String(
      responseBody?.error?.message
      || responseBody?.error?.type
      || responseBody?.error?.code
      || "",
    ).toLowerCase();
    if (imageSupportError.includes("image") || imageSupportError.includes("vision")) {
      const fallbackResult = await sendEvaluationRequest(userPrompt);
      response = fallbackResult.response;
      responseBody = fallbackResult.responseBody;
    }
  }
  if (!response.ok) {
    const classification = classifyAiProviderError(responseBody, response.status);
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
    model: DEFAULT_AI_MODEL,
    parsed,
  };
}

function normalizeDetection(entry, index) {
  return {
    category: normalizeText(entry?.category, "grammar", 30).toLowerCase(),
    label: normalizeText(entry?.label, "Language issue", 64),
    line: normalizeText(entry?.line, `Line ${index + 1}`, 30),
    issue: normalizeText(entry?.issue, "Needs IELTS-focused revision.", 200),
    whyItHurtsBand: normalizeText(
      entry?.whyItHurtsBand,
      "This weakens criterion performance.",
      220,
    ),
    fix: normalizeText(entry?.fix, "Rewrite with clearer and more accurate language.", 220),
    wrongText: normalizeText(entry?.wrongText, "", 180),
    correctedText: normalizeText(entry?.correctedText, "", 180),
  };
}

function normalizeEvaluationPayload(taskConfig, rawPayload, wordsCount) {
  const fallbackBand = wordsCount >= 200 ? 6.0 : 5.0;
  const taskCriterionKey = taskConfig.promptCriterionKey;
  const overallBand = clampBand(rawPayload?.overallBand, fallbackBand);

  const criteriaScores = {};
  taskConfig.criteriaKeys.forEach((criterionKey) => {
    criteriaScores[criterionKey] = clampBand(
      rawPayload?.criteriaScores?.[criterionKey],
      overallBand,
    );
  });

  const criteriaFeedback = {};
  taskConfig.criteriaKeys.forEach((criterionKey) => {
    criteriaFeedback[criterionKey] = normalizeText(
      rawPayload?.criteriaFeedback?.[criterionKey],
      "Criterion needs more precise IELTS-level control and development.",
      380,
    );
  });

  return {
    overallBand,
    criteriaScores,
    criteriaFeedback,
    summary: normalizeText(
      rawPayload?.summary,
      "This essay is relevant but needs stronger development and language control to reach a higher IELTS band.",
      520,
    ),
    strengths: normalizeStringList(rawPayload?.strengths, 4, [
      "The response addresses the task topic.",
      "Main points are generally understandable.",
    ]),
    weaknesses: normalizeStringList(rawPayload?.weaknesses, 6, [
      "Develop ideas with clearer support.",
      "Improve grammar accuracy in complex sentences.",
    ]),
    suggestions: normalizeStringList(rawPayload?.suggestions, 6, [
      "Plan each paragraph around one clear purpose.",
      "Revise sentence grammar and article/preposition accuracy.",
      "Use more precise topic-specific vocabulary.",
    ]),
    diagnosis: {
      taskIssues: normalizeStringList(rawPayload?.diagnosis?.taskIssues, 6, []),
      coherenceIssues: normalizeStringList(rawPayload?.diagnosis?.coherenceIssues, 6, []),
      lexicalIssues: normalizeStringList(rawPayload?.diagnosis?.lexicalIssues, 6, []),
      grammarIssues: normalizeStringList(rawPayload?.diagnosis?.grammarIssues, 6, []),
    },
    detections: Array.isArray(rawPayload?.detections)
      ? rawPayload.detections.slice(0, 8).map(normalizeDetection)
      : [],
    rawAiPayload: rawPayload && typeof rawPayload === "object" ? rawPayload : {},
    taskCriterionKey,
  };
}

async function evaluateWritingEssay({
  taskType,
  question,
  questionTopic = "",
  essayText,
  questionMeta = [],
  visualContext = null,
  wordsCount,
  timeSpentSeconds = 0,
}) {
  const taskConfig = TASK_CONFIG[String(taskType || "").trim().toLowerCase()];
  if (!taskConfig) {
    throw new Error(`Unsupported writing task type: ${taskType}`);
  }

  const safeQuestionTopic = normalizeText(questionTopic || question, "", 1600);
  const safeQuestion = safeQuestionTopic;
  const safeEssayText = String(essayText || "").trim();
  if (!safeQuestionTopic) {
    throw new Error("Question topic is required.");
  }
  if (!safeEssayText) {
    throw new Error("Essay text is required.");
  }

  const safeWordsCount = Number.isFinite(Number(wordsCount))
    ? Math.max(0, Number(wordsCount))
    : countWords(safeEssayText);
  const safeTimeSpentSeconds = Number.isFinite(Number(timeSpentSeconds))
    ? Math.max(0, Number(timeSpentSeconds))
    : 0;

  const aiResult = await requestOpenAiEvaluation({
    taskConfig,
    question: safeQuestion,
    questionTopic: safeQuestionTopic,
    essayText: safeEssayText,
    questionMeta: Array.isArray(questionMeta)
      ? questionMeta.map((entry) => normalizeText(entry, "", 160)).filter(Boolean).slice(0, 10)
      : [],
    visualContext: taskConfig.taskType === "writing_task1"
      ? normalizeVisualContext(visualContext)
      : null,
    wordsCount: safeWordsCount,
    timeSpentSeconds: safeTimeSpentSeconds,
  });

  let normalized = normalizeEvaluationPayload(taskConfig, aiResult.parsed, safeWordsCount);

  if (taskConfig.taskType === "writing_task1") {
    const mismatchInfo = detectTask1TopicMismatch({
      question: safeQuestionTopic,
      questionMeta: Array.isArray(questionMeta)
        ? questionMeta.map((entry) => normalizeText(entry, "", 160)).filter(Boolean).slice(0, 10)
        : [],
      essayText: safeEssayText,
    });

    normalized = applyTask1MismatchPenalty(normalized, mismatchInfo, safeEssayText);
  }

  if (taskConfig.taskType === "writing_task2") {
    const mismatchInfo = detectTask2TopicMismatch({
      question: safeQuestionTopic,
      questionMeta: Array.isArray(questionMeta)
        ? questionMeta.map((entry) => normalizeText(entry, "", 160)).filter(Boolean).slice(0, 10)
        : [],
      essayText: safeEssayText,
    });

    normalized = applyTask2MismatchPenalty(normalized, mismatchInfo, safeEssayText);
  }

  return {
    model: aiResult.model,
    normalized,
  };
}

module.exports = {
  countWords,
  normalizeText,
  evaluateWritingEssay,
};
