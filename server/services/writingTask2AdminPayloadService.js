const WRITING_TASK2_STATUSES = new Set(["draft", "published"]);
const WRITING_TASK2_ESSAY_TYPES = new Set([
  "opinion",
  "discussion",
  "advantages_disadvantages",
  "problem_solution",
  "direct_question",
  "two_part_question",
  "unknown",
]);

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEnum(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
}

function normalizeInteger(value, fallback = null) {
  const numeric = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeWritingTask2ItemPayload(rawItem = {}) {
  const source = rawItem && typeof rawItem === "object" ? rawItem : {};
  const essayType = normalizeEnum(source.essayType);
  const status = normalizeEnum(source.status);
  const minWords = normalizeInteger(source?.instruction?.minWords, 250);

  return {
    section: "writing",
    taskType: "task2",
    essayType: WRITING_TASK2_ESSAY_TYPES.has(essayType) ? essayType : essayType || "unknown",
    questionTopic: normalizeText(source.questionTopic),
    instruction: {
      text: normalizeText(source?.instruction?.text),
      minWords: Math.max(1, minWords || 250),
    },
    source: normalizeText(source.source),
    difficulty: normalizeText(source.difficulty),
    tags: Array.isArray(source.tags)
      ? source.tags.map((item) => normalizeText(item)).filter(Boolean)
      : normalizeText(source.tags)
        .split(",")
        .map((item) => normalizeText(item))
        .filter(Boolean),
    status: WRITING_TASK2_STATUSES.has(status) ? status : status || "draft",
  };
}

function validateWritingTask2ItemPayload(item) {
  const errors = [];
  const safeItem = item && typeof item === "object" ? item : null;

  if (!safeItem) {
    return ["Writing Task 2 item payload must be a JSON object."];
  }

  if (normalizeEnum(safeItem.section) !== "writing") {
    errors.push("`section` must be 'writing'.");
  }

  if (normalizeEnum(safeItem.taskType) !== "task2") {
    errors.push("`taskType` must be 'task2'.");
  }

  if (!normalizeText(safeItem.essayType)) {
    errors.push("`essayType` is required.");
  } else if (!WRITING_TASK2_ESSAY_TYPES.has(normalizeEnum(safeItem.essayType))) {
    errors.push(
      "`essayType` must be one of: opinion, discussion, advantages_disadvantages, problem_solution, direct_question, two_part_question, unknown.",
    );
  }

  if (!normalizeText(safeItem.questionTopic)) {
    errors.push("`questionTopic` is required.");
  }

  if (!safeItem.instruction || typeof safeItem.instruction !== "object") {
    errors.push("`instruction` is required.");
  } else {
    if (!normalizeText(safeItem.instruction.text)) {
      errors.push("`instruction.text` is required.");
    }

    const minWordsValue = Number(safeItem.instruction.minWords);
    if (!Number.isFinite(minWordsValue)) {
      errors.push("`instruction.minWords` must be numeric.");
    } else if (minWordsValue < 1) {
      errors.push("`instruction.minWords` must be at least 1.");
    }
  }

  if (!normalizeText(safeItem.status)) {
    errors.push("`status` is required.");
  } else if (!WRITING_TASK2_STATUSES.has(normalizeEnum(safeItem.status))) {
    errors.push("`status` must be one of: draft, published.");
  }

  return errors;
}

function buildWritingTask2ExtractionPrompt() {
  return [
    "You are extracting IELTS Writing Task 2 data from a source image or source text.",
    "Return JSON only with this exact schema:",
    '{ "questionTopic":"...", "essayType":"opinion|discussion|advantages_disadvantages|problem_solution|direct_question|two_part_question|unknown", "instruction":{"text":"...", "minWords":250} }',
    "",
    "Rules:",
    "- Extract wording exactly where possible. Do not paraphrase.",
    "- Normalize whitespace only.",
    "- Do not add markdown or explanations.",
    "- Do not add keys outside this schema.",
    "- `instruction.text` should usually be 'Write at least 250 words.' when visible or implied.",
    "- `instruction.minWords` should be numeric and usually 250.",
    "",
    "Essay type guidance:",
    "- 'Do you agree or disagree?' => opinion",
    "- 'Discuss both views and give your own opinion.' => discussion",
    "- 'Do the advantages outweigh the disadvantages?' => advantages_disadvantages",
    "- 'What problems... and what solutions...?' => problem_solution",
    "- Single direct questions not matching above => direct_question",
    "- Two distinct questions => two_part_question",
    "- If uncertain => unknown",
  ].join("\n");
}

module.exports = {
  WRITING_TASK2_STATUSES,
  WRITING_TASK2_ESSAY_TYPES,
  normalizeWritingTask2ItemPayload,
  validateWritingTask2ItemPayload,
  buildWritingTask2ExtractionPrompt,
};

