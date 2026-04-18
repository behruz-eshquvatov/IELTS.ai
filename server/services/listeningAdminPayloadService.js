const LISTENING_STATUSES = new Set(["draft", "published"]);
const ALLOWED_LISTENING_QUESTION_FAMILIES = new Set([
  "multiple_choice",
  "matching",
  "gap_fill",
  "map_labeling",
  "diagram_labeling",
]);
const ALLOWED_LISTENING_BLOCK_TYPES = new Set([
  "multiple_choice_single",
  "multiple_choice_multi",
  "matching",
  "form_completion",
  "note_completion",
  "table_completion",
  "sentence_completion",
  "map_labeling",
  "diagram_labeling",
]);

const EXAMPLE_LISTENING_BLOCK = {
  _id: "lc_cmbr_10_1_31-40",
  questionFamily: "gap_fill",
  blockType: "note_completion",
  instruction: {
    text: "Write ONE WORD ONLY for each answer.",
    maxWords: 1,
  },
  display: {
    title: "THE SPIRIT BEAR",
    sections: [
      {
        heading: "General facts",
        items: [
          ["It is a white bear belonging to the black bear family."],
          ["Its colour comes from an uncommon ", { type: "gap", qid: "q31", number: 31 }, "."],
        ],
      },
    ],
  },
  questions: [{ id: "q31", number: 31, answer: ["gene"] }],
  status: "draft",
};

function normalizeText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeEnum(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeNumericValue(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNormalizedAnswerArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  const safe = normalizeText(value);
  return safe ? [safe] : [];
}

function normalizeListeningQuestionItem(question, fallbackIndex) {
  const source = question && typeof question === "object" ? question : {};
  const safeNumber = normalizeNumericValue(source.number) || fallbackIndex + 1;
  const safeId = normalizeText(source.id || source.qid || `q${safeNumber}`);

  return {
    id: safeId || `q${safeNumber}`,
    number: safeNumber,
    answer: toNormalizedAnswerArray(source.answer ?? source.answers),
  };
}

function normalizeListeningBlockPayload(rawBlock = {}) {
  const source = rawBlock && typeof rawBlock === "object" ? rawBlock : {};
  const rawInstruction = source.instruction && typeof source.instruction === "object" ? source.instruction : {};
  const normalizedInstruction = {
    text: normalizeText(rawInstruction.text),
    maxWords: normalizeNumericValue(rawInstruction.maxWords),
  };

  if (Object.prototype.hasOwnProperty.call(rawInstruction, "correctCount")) {
    normalizedInstruction.correctCount = normalizeNumericValue(rawInstruction.correctCount);
  }

  return {
    _id: normalizeText(source._id),
    questionFamily: normalizeEnum(source.questionFamily),
    blockType: normalizeEnum(source.blockType),
    instruction: normalizedInstruction,
    display: source.display && typeof source.display === "object" ? source.display : {},
    questions: Array.isArray(source.questions)
      ? source.questions.map((question, index) => normalizeListeningQuestionItem(question, index))
      : [],
    status: normalizeEnum(source.status) || "draft",
  };
}

function validateListeningBlockPayload(block) {
  const errors = [];
  const safeBlock = block && typeof block === "object" ? block : null;

  if (!safeBlock) {
    return ["Block payload must be a JSON object."];
  }

  if (!normalizeText(safeBlock._id)) {
    errors.push("`_id` is required.");
  }

  if (!normalizeText(safeBlock.questionFamily)) {
    errors.push("`questionFamily` is required.");
  } else if (!ALLOWED_LISTENING_QUESTION_FAMILIES.has(normalizeEnum(safeBlock.questionFamily))) {
    errors.push(
      `\`questionFamily\` must be one of: ${Array.from(ALLOWED_LISTENING_QUESTION_FAMILIES).join(", ")}.`,
    );
  }

  if (!normalizeText(safeBlock.blockType)) {
    errors.push("`blockType` is required.");
  } else if (!ALLOWED_LISTENING_BLOCK_TYPES.has(normalizeEnum(safeBlock.blockType))) {
    errors.push(`\`blockType\` must be one of: ${Array.from(ALLOWED_LISTENING_BLOCK_TYPES).join(", ")}.`);
  }

  if (!safeBlock.instruction || typeof safeBlock.instruction !== "object" || Array.isArray(safeBlock.instruction)) {
    errors.push("`instruction` object is required.");
  } else {
    if (!normalizeText(safeBlock.instruction.text)) {
      errors.push("`instruction.text` is required.");
    }

    if (
      safeBlock.instruction.maxWords !== null &&
      safeBlock.instruction.maxWords !== undefined &&
      !Number.isFinite(Number(safeBlock.instruction.maxWords))
    ) {
      errors.push("`instruction.maxWords` must be numeric when provided.");
    }

    if (
      Object.prototype.hasOwnProperty.call(safeBlock.instruction, "correctCount") &&
      safeBlock.instruction.correctCount !== null &&
      safeBlock.instruction.correctCount !== undefined &&
      !Number.isFinite(Number(safeBlock.instruction.correctCount))
    ) {
      errors.push("`instruction.correctCount` must be numeric when provided.");
    }
  }

  if (!safeBlock.display || typeof safeBlock.display !== "object" || Array.isArray(safeBlock.display)) {
    errors.push("`display` object is required.");
  }

  if (!Array.isArray(safeBlock.questions) || safeBlock.questions.length === 0) {
    errors.push("`questions` must be a non-empty array.");
  } else {
    const seenQuestionIds = new Set();
    safeBlock.questions.forEach((question, index) => {
      const safeQuestion = question && typeof question === "object" ? question : null;
      const safeId = normalizeText(safeQuestion?.id || safeQuestion?.qid);
      const safeNumber = normalizeNumericValue(safeQuestion?.number);
      const answer = safeQuestion?.answer;

      if (!safeId) {
        errors.push(`questions[${index}].id is required.`);
      } else if (seenQuestionIds.has(safeId)) {
        errors.push(`questions[${index}].id '${safeId}' is duplicated.`);
      } else {
        seenQuestionIds.add(safeId);
      }

      if (!Number.isFinite(safeNumber)) {
        errors.push(`questions[${index}].number must be numeric.`);
      }

      if (!Array.isArray(answer)) {
        errors.push(`questions[${index}].answer must be an array.`);
      }
    });
  }

  if (!LISTENING_STATUSES.has(normalizeEnum(safeBlock.status))) {
    errors.push("`status` must be one of: draft, published.");
  }

  return errors;
}

function buildListeningBlockExtractionPrompt() {
  return [
    "Digitize the attached IELTS listening question block image into JSON for `listening_blocks`.",
    "Return ONLY a valid JSON object.",
    "Do not include markdown fences.",
    "Do not include explanations.",
    "Do not invent values.",
    "Do not hallucinate missing structure.",
    "Preserve visible wording exactly; only normalize spacing.",
    "",
    "Required top-level shape:",
    "{",
    '  "_id": "...",',
    '  "questionFamily": "...",',
    '  "blockType": "...",',
    '  "instruction": { "text": "...", "maxWords": 1, "correctCount": 2 },',
    '  "display": { ... },',
    '  "questions": [ { "id": "q1", "number": 1, "answer": ["..."] } ],',
    '  "status": "draft"',
    "}",
    "",
    "Canonical question answer field:",
    "- Use `answer` (NOT `answers`).",
    "- `answer` must always be an array.",
    "- If answers are not visible in the image, set `answer` to [].",
    "",
    "Allowed questionFamily values:",
    `- ${Array.from(ALLOWED_LISTENING_QUESTION_FAMILIES).join(", ")}`,
    "",
    "Allowed blockType values:",
    `- ${Array.from(ALLOWED_LISTENING_BLOCK_TYPES).join(", ")}`,
    "",
    "Numbering and options rules:",
    "- Preserve question numbering exactly as shown.",
    "- Preserve option letters exactly as shown (A/B/C..., i/ii/iii..., etc).",
    "- Do not merge separate questions.",
    "- Do not create extra questions.",
    "",
    "Block-type specific display rules:",
    "",
    "1) multiple_choice_single",
    "- display must include a `questions` array.",
    "- Each display question object must include `qid`, `number`, `text`, `options`.",
    "- `options` must be an array of { key, text }.",
    "",
    "2) multiple_choice_multi",
    "- Keep one shared prompt/instruction area if the image uses shared options.",
    "- Keep options once in display if shared.",
    "- `questions` array must still contain one item per question number.",
    "- If instruction indicates choosing 2 or 3 answers, include `instruction.correctCount` when visible.",
    "",
    "3) matching",
    "- display must include `prompts` and `options`.",
    "- prompts: array of { qid, number, text }",
    "- options: array of { key, text }",
    "",
    "4) form_completion / note_completion",
    "- Preserve title/sections/labels and text flow.",
    "- Tokenize blanks as gap objects inside token arrays.",
    '- Gap token format: { "type":"gap", "qid":"q31", "number":31 }',
    "- Example tokenized line:",
    '  ["text ", { "type":"gap", "qid":"q31", "number":31 }, " text"]',
    "",
    "5) table_completion",
    "- display must contain `table.columns` and `table.rows`.",
    "- Preserve cell order exactly.",
    "- Use token arrays with gap objects in cells containing blanks.",
    "",
    "6) sentence_completion",
    "- display must contain `items` array.",
    "- Each item must preserve original sentence text and tokenize blanks with gap objects.",
    "",
    "7) map_labeling",
    "- display must not be empty.",
    "- Preserve visible title, prompts, and visible labels.",
    "- If coordinates/geometry are unclear, DO NOT invent them.",
    "- Store only reliable textual structure.",
    "",
    "8) diagram_labeling",
    "- Same rule as map_labeling.",
    "- Preserve visible labels and textual structure only.",
    "- Do not invent coordinates or shapes.",
    "",
    "Output defaults:",
    "- Set `status` to `draft` when status is not shown.",
    "",
    "Reference example JSON:",
    JSON.stringify(EXAMPLE_LISTENING_BLOCK),
  ].join("\n");
}

module.exports = {
  ALLOWED_LISTENING_QUESTION_FAMILIES,
  ALLOWED_LISTENING_BLOCK_TYPES,
  EXAMPLE_LISTENING_BLOCK,
  normalizeListeningBlockPayload,
  validateListeningBlockPayload,
  buildListeningBlockExtractionPrompt,
};
