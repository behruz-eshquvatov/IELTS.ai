const LISTENING_STATUSES = new Set(["draft", "published"]);
const LISTENING_MODULES = new Set(["academic", "general", "general_training"]);
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
const BLOCK_RANGE_ID_PATTERN = /^(.*)_(\d+)-(\d+)$/;

const EXAMPLE_LISTENING_TEST = {
  _id: "lc_cmbr_10_1",
  title: "Cambridge 10 Test 1 Listening",
  section: "listening",
  module: "academic",
  totalQuestions: 40,
  status: "draft",
  parts: [
    {
      partNumber: 1,
      questionRange: { start: 1, end: 10 },
      blocks: [
        { blockId: "lc_cmbr_10_1_1-6", audioRef: "lc_cmbr_10_1_1-6", order: 1 },
        { blockId: "lc_cmbr_10_1_7-10", audioRef: "lc_cmbr_10_1_7-10", order: 2 },
      ],
    },
    {
      partNumber: 2,
      questionRange: { start: 11, end: 20 },
      blocks: [
        { blockId: "lc_cmbr_10_1_11-12", audioRef: "lc_cmbr_10_1_11-12", order: 1 },
        { blockId: "lc_cmbr_10_1_13-20", audioRef: "lc_cmbr_10_1_13-20", order: 2 },
      ],
    },
    {
      partNumber: 3,
      questionRange: { start: 21, end: 30 },
      blocks: [
        { blockId: "lc_cmbr_10_1_21-25", audioRef: "lc_cmbr_10_1_21-25", order: 1 },
        { blockId: "lc_cmbr_10_1_26-30", audioRef: "lc_cmbr_10_1_26-30", order: 2 },
      ],
    },
    {
      partNumber: 4,
      questionRange: { start: 31, end: 40 },
      blocks: [
        { blockId: "lc_cmbr_10_1_31-40", audioRef: "lc_cmbr_10_1_31-40", order: 1 },
      ],
    },
  ],
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

function normalizeChoiceOptionItem(option, fallbackIndex = 0) {
  const source = option && typeof option === "object" ? option : {};
  const safeKey = normalizeText(source.key || source.label || source.id || source.value);
  const safeText = normalizeText(source.text || source.title || source.value || source.label);
  const fallbackKey = String.fromCharCode(65 + fallbackIndex);

  return {
    key: safeKey || fallbackKey,
    text: safeText || safeKey || fallbackKey,
  };
}

function normalizeChoiceOptions(options = []) {
  if (!Array.isArray(options)) {
    return [];
  }

  return options
    .map((option, index) => normalizeChoiceOptionItem(option, index))
    .filter((option) => normalizeText(option.key));
}

function normalizeQuestionNumberList(values = []) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seen = new Set();
  const numbers = [];

  values.forEach((value) => {
    const safeNumber = normalizeNumericValue(value);
    if (!Number.isFinite(safeNumber) || seen.has(safeNumber)) {
      return;
    }

    seen.add(safeNumber);
    numbers.push(safeNumber);
  });

  return numbers;
}

function normalizeMultipleChoiceMultiDisplay(display = {}, normalizedQuestions = []) {
  const source = display && typeof display === "object" ? display : {};
  const legacyQuestions = Array.isArray(source.questions) ? source.questions : [];
  const firstLegacyQuestion = legacyQuestions[0] || {};
  const normalizedDisplay = {};

  const safeTitle = normalizeText(source.title);
  if (safeTitle) {
    normalizedDisplay.title = safeTitle;
  }

  const prompt = normalizeText(
    source.prompt || source.question || source.stem || firstLegacyQuestion.text,
  );
  if (prompt) {
    normalizedDisplay.prompt = prompt;
  }

  const questionNumbersFromDisplay = normalizeQuestionNumberList(source.questionNumbers);
  const questionNumbersFromQuestions = normalizeQuestionNumberList(
    normalizedQuestions.map((question) => question.number),
  );
  const questionNumbersFromLegacyDisplayQuestions = normalizeQuestionNumberList(
    legacyQuestions.map((question) => question?.number),
  );
  const resolvedQuestionNumbers =
    questionNumbersFromDisplay.length > 0
      ? questionNumbersFromDisplay
      : questionNumbersFromQuestions.length > 0
        ? questionNumbersFromQuestions
        : questionNumbersFromLegacyDisplayQuestions;
  normalizedDisplay.questionNumbers = resolvedQuestionNumbers;

  const optionsFromDisplay = normalizeChoiceOptions(source.options);
  const optionsFromLegacy = normalizeChoiceOptions(firstLegacyQuestion.options);
  normalizedDisplay.options = optionsFromDisplay.length > 0 ? optionsFromDisplay : optionsFromLegacy;

  return normalizedDisplay;
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

function parseBlockRangeFromId(blockId) {
  const safeBlockId = normalizeText(blockId);
  if (!safeBlockId) {
    return null;
  }

  const match = safeBlockId.match(BLOCK_RANGE_ID_PATTERN);
  if (!match) {
    return null;
  }

  const start = normalizeNumericValue(match[2]);
  const end = normalizeNumericValue(match[3]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return null;
  }

  return {
    testPrefix: normalizeText(match[1]),
    start,
    end,
  };
}

function normalizeListeningBlockPayload(rawBlock = {}) {
  const source = rawBlock && typeof rawBlock === "object" ? rawBlock : {};
  const normalizedBlockType = normalizeEnum(source.blockType);
  const isMultipleChoiceBlock = /^multiple[_-]?choice/.test(normalizedBlockType);
  const rawInstruction = source.instruction && typeof source.instruction === "object" ? source.instruction : {};
  const normalizedInstruction = {
    text: normalizeText(rawInstruction.text),
  };

  if (!isMultipleChoiceBlock) {
    normalizedInstruction.maxWords = normalizeNumericValue(rawInstruction.maxWords);
  }

  if (Object.prototype.hasOwnProperty.call(rawInstruction, "correctCount")) {
    normalizedInstruction.correctCount = normalizeNumericValue(rawInstruction.correctCount);
  }

  const normalizedQuestions = Array.isArray(source.questions)
    ? source.questions.map((question, index) => normalizeListeningQuestionItem(question, index))
    : [];
  const sourceDisplay = source.display && typeof source.display === "object" ? source.display : {};
  const normalizedDisplay =
    normalizedBlockType === "multiple_choice_multi"
      ? normalizeMultipleChoiceMultiDisplay(sourceDisplay, normalizedQuestions)
      : sourceDisplay;

  return {
    _id: normalizeText(source._id),
    questionFamily: normalizeEnum(source.questionFamily),
    blockType: normalizedBlockType,
    instruction: normalizedInstruction,
    display: normalizedDisplay,
    questions: normalizedQuestions,
    status: normalizeEnum(source.status) || "draft",
  };
}

function validateListeningBlockPayload(block) {
  const errors = [];
  const safeBlock = block && typeof block === "object" ? block : null;
  const blockType = normalizeEnum(safeBlock?.blockType);
  const isMultipleChoiceBlock = /^multiple[_-]?choice/.test(blockType);
  const isMultipleChoiceMultiBlock = blockType === "multiple_choice_multi";

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
      isMultipleChoiceBlock &&
      safeBlock.instruction.maxWords !== null &&
      safeBlock.instruction.maxWords !== undefined
    ) {
      errors.push("Remove `instruction.maxWords` for multiple_choice blocks.");
    }

    if (
      Object.prototype.hasOwnProperty.call(safeBlock.instruction, "correctCount") &&
      safeBlock.instruction.correctCount !== null &&
      safeBlock.instruction.correctCount !== undefined &&
      !Number.isFinite(Number(safeBlock.instruction.correctCount))
    ) {
      errors.push("`instruction.correctCount` must be numeric when provided.");
    }

    if (isMultipleChoiceMultiBlock) {
      const correctCount = Number(safeBlock.instruction.correctCount);
      if (!Number.isFinite(correctCount) || correctCount < 2) {
        errors.push("`instruction.correctCount` must be numeric and >= 2 for multiple_choice_multi.");
      }
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

  if (isMultipleChoiceMultiBlock) {
    const safePrompt = normalizeText(
      safeBlock?.display?.prompt || safeBlock?.display?.question || safeBlock?.display?.stem,
    );
    if (!safePrompt) {
      errors.push("`display.prompt` is required for multiple_choice_multi.");
    }

    const options = Array.isArray(safeBlock?.display?.options) ? safeBlock.display.options : [];
    if (options.length === 0) {
      errors.push("`display.options` must be a non-empty array for multiple_choice_multi.");
    } else {
      options.forEach((option, optionIndex) => {
        if (!normalizeText(option?.key)) {
          errors.push(`display.options[${optionIndex}].key is required for multiple_choice_multi.`);
        }

        if (!normalizeText(option?.text)) {
          errors.push(`display.options[${optionIndex}].text is required for multiple_choice_multi.`);
        }
      });
    }

    const rawQuestionNumbers = Array.isArray(safeBlock?.display?.questionNumbers)
      ? safeBlock.display.questionNumbers
      : [];
    const questionNumbers = normalizeQuestionNumberList(rawQuestionNumbers);
    if (questionNumbers.length === 0) {
      errors.push("`display.questionNumbers` must be a non-empty numeric array for multiple_choice_multi.");
    } else if (questionNumbers.length !== rawQuestionNumbers.length) {
      errors.push("`display.questionNumbers` contains invalid or duplicated numbers.");
    }

    if (Array.isArray(safeBlock.questions) && questionNumbers.length > 0) {
      if (safeBlock.questions.length !== questionNumbers.length) {
        errors.push("`questions` length must match `display.questionNumbers` length for multiple_choice_multi.");
      } else {
        const questionNumberSet = new Set(
          safeBlock.questions
            .map((question) => normalizeNumericValue(question?.number))
            .filter((number) => Number.isFinite(number))
            .map((number) => String(number)),
        );
        const displayNumberSet = new Set(questionNumbers.map((number) => String(number)));
        const sameSize = questionNumberSet.size === displayNumberSet.size;
        const sameMembers = sameSize && Array.from(displayNumberSet).every((number) => questionNumberSet.has(number));
        if (!sameMembers) {
          errors.push("`questions[].number` must match `display.questionNumbers` for multiple_choice_multi.");
        }
      }
    }
  }

  if (!LISTENING_STATUSES.has(normalizeEnum(safeBlock.status))) {
    errors.push("`status` must be one of: draft, published.");
  }

  return errors;
}

function normalizeListeningTestPartBlockRef(rawBlockRef = {}, fallbackIndex = 0) {
  const safeBlockId = normalizeText(rawBlockRef?.blockId);
  const safeAudioRef = normalizeText(rawBlockRef?.audioRef) || safeBlockId;
  return {
    blockId: safeBlockId,
    audioRef: safeAudioRef,
    order: normalizeNumericValue(rawBlockRef?.order) || fallbackIndex + 1,
  };
}

function normalizeListeningTestPartEntry(rawPart = {}, fallbackIndex = 0) {
  const blocks = Array.isArray(rawPart?.blocks)
    ? rawPart.blocks.map((blockRef, index) => normalizeListeningTestPartBlockRef(blockRef, index))
    : [];

  return {
    partNumber: normalizeNumericValue(rawPart?.partNumber) || fallbackIndex + 1,
    questionRange: {
      start: normalizeNumericValue(rawPart?.questionRange?.start),
      end: normalizeNumericValue(rawPart?.questionRange?.end),
    },
    blocks: blocks.sort((left, right) => Number(left?.order || 0) - Number(right?.order || 0)),
  };
}

function normalizeListeningTestPayload(rawTest = {}) {
  const source = rawTest && typeof rawTest === "object" ? rawTest : {};
  const parts = Array.isArray(source?.parts)
    ? source.parts.map((part, index) => normalizeListeningTestPartEntry(part, index))
    : [];

  const normalizedModule = normalizeEnum(source?.module) || "academic";
  return {
    _id: normalizeText(source?._id),
    title: normalizeText(source?.title),
    section: "listening",
    module: LISTENING_MODULES.has(normalizedModule) ? normalizedModule : "academic",
    totalQuestions: normalizeNumericValue(source?.totalQuestions),
    status: normalizeEnum(source?.status) || "draft",
    parts: parts.sort((left, right) => Number(left?.partNumber || 0) - Number(right?.partNumber || 0)),
  };
}

function validateListeningTestPayload(test) {
  const errors = [];
  const safeTest = test && typeof test === "object" ? test : null;

  if (!safeTest) {
    return ["Test payload must be a JSON object."];
  }

  if (!normalizeText(safeTest._id)) {
    errors.push("`_id` is required.");
  }

  if (!normalizeText(safeTest.title)) {
    errors.push("`title` is required.");
  }

  if (normalizeEnum(safeTest.section) !== "listening") {
    errors.push("`section` must be 'listening'.");
  }

  if (!normalizeText(safeTest.module)) {
    errors.push("`module` is required.");
  } else if (!LISTENING_MODULES.has(normalizeEnum(safeTest.module))) {
    errors.push("`module` must be one of: academic, general, general_training.");
  }

  if (!Number.isFinite(Number(safeTest.totalQuestions))) {
    errors.push("`totalQuestions` must be numeric.");
  }

  if (!LISTENING_STATUSES.has(normalizeEnum(safeTest.status))) {
    errors.push("`status` must be one of: draft, published.");
  }

  if (!Array.isArray(safeTest.parts) || safeTest.parts.length === 0) {
    errors.push("`parts` must be a non-empty array.");
    return errors;
  }

  const seenPartNumbers = new Set();
  const seenBlockIds = new Set();
  const ranges = [];
  let coveredQuestions = 0;

  safeTest.parts.forEach((part, partIndex) => {
    const partNumber = normalizeNumericValue(part?.partNumber);
    const rangeStart = normalizeNumericValue(part?.questionRange?.start);
    const rangeEnd = normalizeNumericValue(part?.questionRange?.end);
    const blocks = Array.isArray(part?.blocks) ? part.blocks : [];
    const seenOrders = new Set();

    if (!Number.isFinite(partNumber)) {
      errors.push(`parts[${partIndex}].partNumber must be numeric.`);
    } else if (seenPartNumbers.has(partNumber)) {
      errors.push(`parts[${partIndex}].partNumber '${partNumber}' is duplicated.`);
    } else {
      seenPartNumbers.add(partNumber);
    }

    if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) {
      errors.push(`parts[${partIndex}].questionRange.start and .end must be numeric.`);
    } else if (rangeStart > rangeEnd) {
      errors.push(`parts[${partIndex}].questionRange.start must be <= end.`);
    } else {
      ranges.push({ start: rangeStart, end: rangeEnd, index: partIndex });
      coveredQuestions += rangeEnd - rangeStart + 1;
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      errors.push(`parts[${partIndex}].blocks must be a non-empty array.`);
      return;
    }

    blocks.forEach((blockRef, blockIndex) => {
      const blockId = normalizeText(blockRef?.blockId);
      const audioRef = normalizeText(blockRef?.audioRef);
      const order = normalizeNumericValue(blockRef?.order);

      if (!blockId) {
        errors.push(`parts[${partIndex}].blocks[${blockIndex}].blockId is required.`);
      } else {
        if (seenBlockIds.has(blockId)) {
          errors.push(`blockId '${blockId}' is used more than once in this listening test.`);
        } else {
          seenBlockIds.add(blockId);
        }

        const blockRange = parseBlockRangeFromId(blockId);
        if (!blockRange) {
          errors.push(
            `parts[${partIndex}].blocks[${blockIndex}].blockId '${blockId}' must follow '<testId>_<start>-<end>'.`,
          );
        } else {
          if (normalizeText(safeTest._id) && blockRange.testPrefix !== normalizeText(safeTest._id)) {
            errors.push(
              `blockId '${blockId}' must start with '${normalizeText(safeTest._id)}_' to match test id.`,
            );
          }

          if (Number.isFinite(rangeStart) && Number.isFinite(rangeEnd)) {
            if (blockRange.start < rangeStart || blockRange.end > rangeEnd) {
              errors.push(
                `blockId '${blockId}' range ${blockRange.start}-${blockRange.end} must stay within part range ${rangeStart}-${rangeEnd}.`,
              );
            }
          }
        }
      }

      if (!audioRef) {
        errors.push(`parts[${partIndex}].blocks[${blockIndex}].audioRef is required.`);
      } else if (blockId && audioRef !== blockId) {
        errors.push(`audioRef '${audioRef}' must match blockId '${blockId}' for per-block audio linkage.`);
      }

      if (!Number.isFinite(order)) {
        errors.push(`parts[${partIndex}].blocks[${blockIndex}].order must be numeric.`);
      } else if (seenOrders.has(order)) {
        errors.push(`parts[${partIndex}] has duplicated block order '${order}'.`);
      } else {
        seenOrders.add(order);
      }
    });
  });

  const sortedRanges = ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < sortedRanges.length; index += 1) {
    const previous = sortedRanges[index - 1];
    const current = sortedRanges[index];
    if (current.start <= previous.end) {
      errors.push(`questionRange overlap between parts[${previous.index}] and parts[${current.index}].`);
    }
  }

  const totalQuestions = normalizeNumericValue(safeTest.totalQuestions);
  if (Number.isFinite(totalQuestions) && totalQuestions !== coveredQuestions) {
    errors.push(
      `totalQuestions (${totalQuestions}) does not match covered question ranges (${coveredQuestions}).`,
    );
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
    '  "instruction": { "text": "...", "correctCount": 2 },',
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
    "- Do not include `instruction.maxWords`.",
    "",
    "2) multiple_choice_multi",
    "- display must use ONE shared structure (NOT display.questions).",
    "- Required display shape:",
    '  { "prompt":"...", "questionNumbers":[11,12], "options":[{"key":"A","text":"..."}, ...] }',
    "- `questions` array must still contain one item per question number in `display.questionNumbers`.",
    "- If instruction indicates choosing 2 or 3 answers, include `instruction.correctCount`.",
    "- Do not include `instruction.maxWords`.",
    "",
    "3) matching",
    "- display must include `prompts` and `options`.",
    "- prompts: array of { qid, number, text }",
    "- options: array of { key, text }",
    "",
    "4) form_completion / note_completion",
    "- Preserve title/sections/labels and text flow.",
    "- Include `instruction.maxWords` only when visible/relevant.",
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
  LISTENING_STATUSES,
  LISTENING_MODULES,
  ALLOWED_LISTENING_QUESTION_FAMILIES,
  ALLOWED_LISTENING_BLOCK_TYPES,
  EXAMPLE_LISTENING_BLOCK,
  EXAMPLE_LISTENING_TEST,
  normalizeListeningBlockPayload,
  validateListeningBlockPayload,
  normalizeListeningTestPayload,
  validateListeningTestPayload,
  buildListeningBlockExtractionPrompt,
};
