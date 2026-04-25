const WRITING_TASK1_STATUSES = new Set(["draft", "published"]);
const WRITING_TASK1_VISUAL_TYPES = new Set([
  "line_chart",
  "bar_chart",
  "pie_chart",
  "table",
  "process_diagram",
  "map",
  "mixed_visual",
]);

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEnum(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, "_");
}

function normalizeWritingTask1ItemPayload(rawItem = {}) {
  const source = rawItem && typeof rawItem === "object" ? rawItem : {};
  const visualType = normalizeEnum(source.visualType);
  const status = normalizeEnum(source.status);
  const imageId = normalizeText(source?.visualAsset?.imageId || source?.imageId);
  const visualUrl = normalizeText(source?.visualAsset?.url);

  return {
    section: "writing",
    taskType: "task1",
    visualType: WRITING_TASK1_VISUAL_TYPES.has(visualType) ? visualType : visualType,
    questionTopic: normalizeText(source.questionTopic),
    visualAsset: {
      imageId,
      url: visualUrl,
    },
    title: normalizeText(source.title),
    source: normalizeText(source.source),
    provider: normalizeText(source.provider),
    status: WRITING_TASK1_STATUSES.has(status) ? status : status || "draft",
  };
}

function validateWritingTask1ItemPayload(item) {
  const errors = [];
  const safeItem = item && typeof item === "object" ? item : null;

  if (!safeItem) {
    return ["Writing Task 1 item payload must be a JSON object."];
  }

  if (normalizeEnum(safeItem.section) !== "writing") {
    errors.push("`section` must be 'writing'.");
  }

  if (normalizeEnum(safeItem.taskType) !== "task1") {
    errors.push("`taskType` must be 'task1'.");
  }

  if (!normalizeText(safeItem.visualType)) {
    errors.push("`visualType` is required.");
  } else if (!WRITING_TASK1_VISUAL_TYPES.has(normalizeEnum(safeItem.visualType))) {
    errors.push(
      "`visualType` must be one of: line_chart, bar_chart, pie_chart, table, process_diagram, map, mixed_visual.",
    );
  }

  if (!normalizeText(safeItem.questionTopic)) {
    errors.push("`questionTopic` is required.");
  }

  if (!safeItem.visualAsset || typeof safeItem.visualAsset !== "object") {
    errors.push("`visualAsset` is required.");
  } else {
    if (!normalizeText(safeItem.visualAsset.imageId)) {
      errors.push("`visualAsset.imageId` is required.");
    }

    if (!normalizeText(safeItem.visualAsset.url)) {
      errors.push("`visualAsset.url` is required.");
    }
  }

  if (!normalizeText(safeItem.status)) {
    errors.push("`status` is required.");
  } else if (!WRITING_TASK1_STATUSES.has(normalizeEnum(safeItem.status))) {
    errors.push("`status` must be one of: draft, published.");
  }

  return errors;
}

function buildWritingTask1QuestionTopicExtractionPrompt() {
  return [
    "You are extracting IELTS Writing Task 1 prompt text from an image.",
    "Return JSON only with this exact schema:",
    '{ "questionTopic":"..." }',
    "",
    "Rules:",
    "- Extract the visible task instruction text exactly.",
    "- Preserve original wording. Do not paraphrase.",
    "- Normalize whitespace only.",
    "- Do not include chart title text when the title belongs to the visual itself.",
    "- Do not describe the graph/chart/table/process/map.",
    "- Do not return visual metadata, crop data, or extra keys.",
    "- Do not add markdown or explanations.",
  ].join("\n");
}

module.exports = {
  WRITING_TASK1_STATUSES,
  WRITING_TASK1_VISUAL_TYPES,
  normalizeWritingTask1ItemPayload,
  validateWritingTask1ItemPayload,
  buildWritingTask1QuestionTopicExtractionPrompt,
};
