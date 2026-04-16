const path = require("path");
const mongoose = require("mongoose");
const ListeningAudio = require("../models/listeningAudioModel");
const { sendAudioStreamResponse } = require("../utils/audioStream");

const DEFAULT_SUPER_ADMIN_PASSWORD = "3456";
const DEFAULT_OPENROUTER_MODEL = "google/gemini-2.0-flash-001";
const READING_PASSAGES_COLLECTION = "reading_passages";
const READING_BLOCKS_COLLECTION = "reading_blocks";
const READING_TESTS_COLLECTION = "reading_tests";
const READING_STATUSES = new Set(["draft", "published"]);
const ALLOWED_READING_CONTENT_BLOCK_TYPES = new Set([
  "intro",
  "title",
  "subtitle",
  "section_heading",
  "paragraph",
  "note",
  "table",
  "diagram",
]);
const ALLOWED_READING_QUESTION_FAMILIES = new Set([
  "multiple_choice",
  "binary_judgement",
  "matching",
  "gap_fill",
  "short_answer",
  "diagram_labeling",
]);
const ALLOWED_READING_BLOCK_TYPES = new Set([
  "multiple_choice_single",
  "multiple_choice_multi",
  "true_false_not_given",
  "yes_no_not_given",
  "matching_headings",
  "matching_information",
  "matching_features",
  "matching_sentence_endings",
  "multiple_matching",
  "summary_completion",
  "note_completion",
  "table_completion",
  "flow_chart_completion",
  "sentence_completion",
  "diagram_label_completion",
  "short_answer_questions",
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
          [
            "Its colour comes from an uncommon ",
            { type: "gap", qid: "q31", number: 31 },
            ".",
          ],
        ],
      },
    ],
  },
  questions: [
    { id: "q31", number: 31, answer: ["gene"] },
  ],
};

const EXAMPLE_READING_PASSAGE = {
  _id: "rc_cmbr_10_1_1",
  title: "Example Passage Title",
  section: "reading",
  provider: "cambridge",
  book: 10,
  test: 1,
  passageNumber: 1,
  contentBlocks: [
    {
      type: "intro",
      text: "You should spend about 20 minutes on Questions 1-13, which are based on Reading Passage 1 below.",
    },
    {
      type: "title",
      text: "The headline of the passage",
    },
    {
      type: "paragraph",
      paragraphId: "A",
      text: "Paragraph A text...",
    },
  ],
  status: "draft",
};

const EXAMPLE_READING_BLOCK = {
  _id: "rc_cmbr_10_1_1_1-6",
  passageId: "rc_cmbr_10_1_1",
  questionFamily: "matching",
  blockType: "matching_headings",
  instruction: {
    text: "Choose the correct heading for paragraphs A-F from the list of headings below.",
  },
  passageScope: {
    type: "paragraphs",
    targets: ["A", "B", "C", "D", "E", "F"],
  },
  display: {
    headingOptions: [
      { key: "i", text: "Heading 1" },
      { key: "ii", text: "Heading 2" },
    ],
    prompts: [
      { qid: "q1", number: 1, paragraphId: "A" },
      { qid: "q2", number: 2, paragraphId: "B" },
    ],
  },
  questions: [
    { id: "q1", number: 1, answers: ["ii"] },
    { id: "q2", number: 2, answers: ["i"] },
  ],
  status: "draft",
};

function getSuperAdminPassword() {
  return String(process.env.SUPER_ADMIN_PASSWORD || DEFAULT_SUPER_ADMIN_PASSWORD);
}

function hasValidSuperAdminPassword(passwordParam) {
  return String(passwordParam || "") === getSuperAdminPassword();
}

function denyInvalidPassword(res) {
  return res.status(403).json({
    message: "Invalid super admin password.",
  });
}

function getHeaderValue(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

function deriveAudioIdFromFileName(fileName) {
  const normalizedFileName = String(fileName || "").trim();
  const basename = path.basename(normalizedFileName);
  const withoutExtension = basename.replace(/\.[^/.]+$/, "");
  return withoutExtension.trim();
}

function deriveContentTypeFromFileName(fileName) {
  const extension = String(path.extname(fileName || "") || "").toLowerCase();
  if (extension === ".png") {
    return "image/png";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/jpeg";
}

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

function normalizeStringArray(value, transform = (item) => item) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => transform(normalizeText(item)))
    .filter(Boolean);
}

function getOpenRouterApiKey() {
  return normalizeText(process.env.OPENROUTER_API_KEY_V2);
}

function maskApiKey(apiKey) {
  const safe = String(apiKey || "").trim();
  if (!safe) {
    return "";
  }

  if (safe.length <= 12) {
    return `${safe.slice(0, 4)}...`;
  }

  return `${safe.slice(0, 8)}...${safe.slice(-4)}`;
}

function toNormalizedAnswerArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  const safe = normalizeText(value);
  return safe ? [safe] : [];
}

function normalizeQuestionItem(question, fallbackIndex) {
  const safeId = normalizeText(question?.id || question?.qid || "");
  const numericNumber = Number(question?.number);
  const safeNumber = Number.isFinite(numericNumber) ? numericNumber : fallbackIndex + 1;
  const answer = toNormalizedAnswerArray(question?.answer ?? question?.answers);

  return {
    id: safeId || `q${safeNumber}`,
    number: safeNumber,
    answer,
  };
}

function normalizeListeningBlockPayload(rawBlock = {}) {
  const normalized = {
    _id: normalizeText(rawBlock._id),
    questionFamily: normalizeText(rawBlock.questionFamily).toLowerCase(),
    blockType: normalizeText(rawBlock.blockType).toLowerCase(),
    instruction: {
      text: normalizeText(rawBlock?.instruction?.text),
      maxWords: Number.isFinite(Number(rawBlock?.instruction?.maxWords))
        ? Number(rawBlock.instruction.maxWords)
        : null,
    },
    display: rawBlock?.display && typeof rawBlock.display === "object" ? rawBlock.display : {},
    questions: Array.isArray(rawBlock?.questions)
      ? rawBlock.questions.map((question, index) => normalizeQuestionItem(question, index))
      : [],
  };

  if (
    normalized.display &&
    typeof normalized.display === "object" &&
    Object.prototype.hasOwnProperty.call(normalized.display, "title")
  ) {
    normalized.display.title = normalizeText(normalized.display.title);
  }

  return normalized;
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
  }

  if (!normalizeText(safeBlock.blockType)) {
    errors.push("`blockType` is required.");
  }

  if (!safeBlock.instruction || typeof safeBlock.instruction !== "object") {
    errors.push("`instruction` object is required.");
  } else if (!normalizeText(safeBlock.instruction.text)) {
    errors.push("`instruction.text` is required.");
  }

  if (!safeBlock.display || typeof safeBlock.display !== "object") {
    errors.push("`display` object is required.");
  }

  if (!Array.isArray(safeBlock.questions) || safeBlock.questions.length === 0) {
    errors.push("`questions` must be a non-empty array.");
  } else {
    const seenQuestionIds = new Set();
    safeBlock.questions.forEach((question, index) => {
      const safeId = normalizeText(question?.id);
      const number = Number(question?.number);

      if (!safeId) {
        errors.push(`questions[${index}].id is required.`);
      } else if (seenQuestionIds.has(safeId)) {
        errors.push(`questions[${index}].id '${safeId}' is duplicated.`);
      } else {
        seenQuestionIds.add(safeId);
      }

      if (!Number.isFinite(number)) {
        errors.push(`questions[${index}].number must be numeric.`);
      }
    });
  }

  return errors;
}

function normalizeReadingPassageContentBlock(rawContentBlock = {}) {
  const source = rawContentBlock && typeof rawContentBlock === "object" ? rawContentBlock : {};
  const normalized = { ...source };

  normalized.type = normalizeEnum(source.type);

  if (Object.prototype.hasOwnProperty.call(source, "text")) {
    normalized.text = normalizeText(source.text);
  }

  if (Object.prototype.hasOwnProperty.call(source, "paragraphId")) {
    const paragraphId = normalizeText(source.paragraphId).toUpperCase();
    if (paragraphId) {
      normalized.paragraphId = paragraphId;
    } else {
      delete normalized.paragraphId;
    }
  }

  return normalized;
}

function normalizeReadingPassagePayload(rawPassage = {}) {
  const source = rawPassage && typeof rawPassage === "object" ? rawPassage : {};

  return {
    _id: normalizeText(source._id),
    title: normalizeText(source.title),
    section: "reading",
    provider: normalizeEnum(source.provider),
    book: normalizeNumericValue(source.book),
    test: normalizeNumericValue(source.test),
    passageNumber: normalizeNumericValue(source.passageNumber),
    contentBlocks: Array.isArray(source.contentBlocks)
      ? source.contentBlocks.map((item) => normalizeReadingPassageContentBlock(item))
      : [],
    status: normalizeEnum(source.status) || "draft",
  };
}

function validateReadingPassagePayload(passage) {
  const errors = [];
  const safePassage = passage && typeof passage === "object" ? passage : null;

  if (!safePassage) {
    return ["Passage payload must be a JSON object."];
  }

  if (!normalizeText(safePassage._id)) {
    errors.push("`_id` is required.");
  }

  if (!normalizeText(safePassage.title)) {
    errors.push("`title` is required.");
  }

  if (normalizeEnum(safePassage.section) !== "reading") {
    errors.push("`section` must be 'reading'.");
  }

  if (!normalizeText(safePassage.provider)) {
    errors.push("`provider` is required.");
  }

  if (!Number.isFinite(Number(safePassage.book))) {
    errors.push("`book` must be numeric.");
  }

  if (!Number.isFinite(Number(safePassage.test))) {
    errors.push("`test` must be numeric.");
  }

  if (!Number.isFinite(Number(safePassage.passageNumber))) {
    errors.push("`passageNumber` must be numeric.");
  }

  if (!READING_STATUSES.has(normalizeEnum(safePassage.status))) {
    errors.push("`status` must be one of: draft, published.");
  }

  if (!Array.isArray(safePassage.contentBlocks) || safePassage.contentBlocks.length === 0) {
    errors.push("`contentBlocks` must be a non-empty array.");
  } else {
    safePassage.contentBlocks.forEach((item, index) => {
      const contentType = normalizeEnum(item?.type);
      if (!contentType) {
        errors.push(`contentBlocks[${index}].type is required.`);
      } else if (!ALLOWED_READING_CONTENT_BLOCK_TYPES.has(contentType)) {
        errors.push(`contentBlocks[${index}].type '${contentType}' is not supported.`);
      }

      if (Object.prototype.hasOwnProperty.call(item || {}, "paragraphId")) {
        const paragraphId = normalizeText(item?.paragraphId);
        if (!paragraphId) {
          errors.push(`contentBlocks[${index}].paragraphId cannot be empty.`);
        }
      }

      if (["intro", "title", "subtitle", "section_heading", "paragraph", "note"].includes(contentType)) {
        if (!normalizeText(item?.text)) {
          errors.push(`contentBlocks[${index}].text is required for type '${contentType}'.`);
        }
      }
    });
  }

  return errors;
}

function normalizeReadingQuestionItem(question, fallbackIndex) {
  const source = question && typeof question === "object" ? question : {};
  const safeId = normalizeText(source.id || source.qid);
  const safeNumber = normalizeNumericValue(source.number) || fallbackIndex + 1;
  const answers = toNormalizedAnswerArray(source.answers ?? source.answer);
  const normalized = { ...source };

  delete normalized.qid;
  delete normalized.answer;
  delete normalized.answers;

  normalized.id = safeId || `q${safeNumber}`;
  normalized.number = safeNumber;
  normalized.answers = answers;

  return normalized;
}

function normalizeReadingBlockPayload(rawBlock = {}) {
  const source = rawBlock && typeof rawBlock === "object" ? rawBlock : {};
  const rawInstruction = source.instruction && typeof source.instruction === "object" ? source.instruction : {};
  const rawPassageScope = source.passageScope && typeof source.passageScope === "object" ? source.passageScope : {};
  const normalizedInstruction = { ...rawInstruction, text: normalizeText(rawInstruction.text) };

  const maxWords = normalizeNumericValue(rawInstruction.maxWords);
  if (Number.isFinite(maxWords)) {
    normalizedInstruction.maxWords = maxWords;
  } else {
    delete normalizedInstruction.maxWords;
  }

  const correctCount = normalizeNumericValue(rawInstruction.correctCount);
  if (Number.isFinite(correctCount)) {
    normalizedInstruction.correctCount = correctCount;
  } else {
    delete normalizedInstruction.correctCount;
  }

  return {
    _id: normalizeText(source._id),
    passageId: normalizeText(source.passageId),
    questionFamily: normalizeEnum(source.questionFamily),
    blockType: normalizeEnum(source.blockType),
    instruction: normalizedInstruction,
    passageScope: {
      ...rawPassageScope,
      type: normalizeEnum(rawPassageScope.type),
      targets: normalizeStringArray(rawPassageScope.targets, (item) => item.toUpperCase()),
    },
    display: source.display && typeof source.display === "object" ? source.display : {},
    questions: Array.isArray(source.questions)
      ? source.questions.map((item, index) => normalizeReadingQuestionItem(item, index))
      : [],
    status: normalizeEnum(source.status) || "draft",
  };
}

function validateReadingBlockPayload(block) {
  const errors = [];
  const safeBlock = block && typeof block === "object" ? block : null;

  if (!safeBlock) {
    return ["Block payload must be a JSON object."];
  }

  if (!normalizeText(safeBlock._id)) {
    errors.push("`_id` is required.");
  }

  if (!normalizeText(safeBlock.passageId)) {
    errors.push("`passageId` is required.");
  }

  if (!normalizeText(safeBlock.questionFamily)) {
    errors.push("`questionFamily` is required.");
  } else if (!ALLOWED_READING_QUESTION_FAMILIES.has(normalizeEnum(safeBlock.questionFamily))) {
    errors.push(
      `\`questionFamily\` must be one of: ${Array.from(ALLOWED_READING_QUESTION_FAMILIES).join(", ")}.`,
    );
  }

  if (!normalizeText(safeBlock.blockType)) {
    errors.push("`blockType` is required.");
  } else if (!ALLOWED_READING_BLOCK_TYPES.has(normalizeEnum(safeBlock.blockType))) {
    errors.push(`\`blockType\` must be one of: ${Array.from(ALLOWED_READING_BLOCK_TYPES).join(", ")}.`);
  }

  if (!safeBlock.instruction || typeof safeBlock.instruction !== "object") {
    errors.push("`instruction` object is required.");
  } else if (!normalizeText(safeBlock.instruction.text)) {
    errors.push("`instruction.text` is required.");
  }

  if (!safeBlock.display || typeof safeBlock.display !== "object") {
    errors.push("`display` object is required.");
  }

  if (!Array.isArray(safeBlock.questions) || safeBlock.questions.length === 0) {
    errors.push("`questions` must be a non-empty array.");
  } else {
    const seenQuestionIds = new Set();
    safeBlock.questions.forEach((question, index) => {
      const safeId = normalizeText(question?.id || question?.qid);
      const safeNumber = normalizeNumericValue(question?.number);
      const answers = toNormalizedAnswerArray(question?.answers ?? question?.answer);

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

      if (!Array.isArray(question?.answers) && !Array.isArray(question?.answer)) {
        errors.push(`questions[${index}].answers must be an array.`);
      }

      if (answers.length === 0) {
        errors.push(`questions[${index}].answers must include at least one accepted answer.`);
      }
    });
  }

  const normalizedStatus = normalizeEnum(safeBlock.status);
  if (!READING_STATUSES.has(normalizedStatus)) {
    errors.push("`status` must be one of: draft, published.");
  }

  const safePassageId = normalizeText(safeBlock.passageId);
  const safeBlockId = normalizeText(safeBlock._id);
  if (safePassageId && safeBlockId && !safeBlockId.startsWith(`${safePassageId}_`)) {
    errors.push("`_id` must start with `<passageId>_` to match the passage relation.");
  }

  return errors;
}

function normalizeReadingTestPassageBlockRef(rawBlockRef = {}, fallbackIndex = 0) {
  return {
    blockId: normalizeText(rawBlockRef.blockId),
    order: normalizeNumericValue(rawBlockRef.order) || fallbackIndex + 1,
  };
}

function normalizeReadingTestPassageEntry(rawPassage = {}, fallbackIndex = 0) {
  const blocks = Array.isArray(rawPassage.blocks)
    ? rawPassage.blocks.map((item, index) => normalizeReadingTestPassageBlockRef(item, index))
    : [];

  return {
    passageNumber: normalizeNumericValue(rawPassage.passageNumber) || fallbackIndex + 1,
    passageId: normalizeText(rawPassage.passageId),
    questionRange: {
      start: normalizeNumericValue(rawPassage?.questionRange?.start),
      end: normalizeNumericValue(rawPassage?.questionRange?.end),
    },
    blocks: blocks.sort((left, right) => Number(left.order || 0) - Number(right.order || 0)),
  };
}

function normalizeReadingTestPayload(rawTest = {}) {
  const source = rawTest && typeof rawTest === "object" ? rawTest : {};
  const passages = Array.isArray(source.passages)
    ? source.passages.map((item, index) => normalizeReadingTestPassageEntry(item, index))
    : [];

  return {
    _id: normalizeText(source._id),
    title: normalizeText(source.title),
    section: "reading",
    module: normalizeEnum(source.module) || "academic",
    totalQuestions: normalizeNumericValue(source.totalQuestions),
    status: normalizeEnum(source.status) || "draft",
    passages: passages.sort((left, right) => Number(left.passageNumber || 0) - Number(right.passageNumber || 0)),
  };
}

function validateReadingTestPayload(test) {
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

  if (normalizeEnum(safeTest.section) !== "reading") {
    errors.push("`section` must be 'reading'.");
  }

  if (!normalizeText(safeTest.module)) {
    errors.push("`module` is required.");
  }

  if (!Number.isFinite(Number(safeTest.totalQuestions))) {
    errors.push("`totalQuestions` must be numeric.");
  }

  if (!READING_STATUSES.has(normalizeEnum(safeTest.status))) {
    errors.push("`status` must be one of: draft, published.");
  }

  if (!Array.isArray(safeTest.passages) || safeTest.passages.length === 0) {
    errors.push("`passages` must be a non-empty array.");
    return errors;
  }

  const seenPassageIds = new Set();
  const ranges = [];
  let coveredQuestions = 0;
  const seenBlockIdsGlobal = new Set();

  safeTest.passages.forEach((passageEntry, passageIndex) => {
    const safePassageId = normalizeText(passageEntry?.passageId);
    const safePassageNumber = normalizeNumericValue(passageEntry?.passageNumber);
    const rangeStart = normalizeNumericValue(passageEntry?.questionRange?.start);
    const rangeEnd = normalizeNumericValue(passageEntry?.questionRange?.end);
    const blocks = Array.isArray(passageEntry?.blocks) ? passageEntry.blocks : [];

    if (!Number.isFinite(safePassageNumber)) {
      errors.push(`passages[${passageIndex}].passageNumber must be numeric.`);
    }

    if (!safePassageId) {
      errors.push(`passages[${passageIndex}].passageId is required.`);
    } else if (seenPassageIds.has(safePassageId)) {
      errors.push(`passages[${passageIndex}].passageId '${safePassageId}' is duplicated.`);
    } else {
      seenPassageIds.add(safePassageId);
    }

    if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) {
      errors.push(`passages[${passageIndex}].questionRange.start and .end must be numeric.`);
    } else if (rangeStart > rangeEnd) {
      errors.push(`passages[${passageIndex}].questionRange.start must be <= end.`);
    } else {
      ranges.push({
        start: rangeStart,
        end: rangeEnd,
        index: passageIndex,
      });
      coveredQuestions += rangeEnd - rangeStart + 1;
    }

    if (!Array.isArray(blocks) || blocks.length === 0) {
      errors.push(`passages[${passageIndex}].blocks must be a non-empty array.`);
    } else {
      const seenPassageBlockIds = new Set();
      blocks.forEach((blockRef, blockIndex) => {
        const safeBlockId = normalizeText(blockRef?.blockId);
        const safeOrder = normalizeNumericValue(blockRef?.order);

        if (!safeBlockId) {
          errors.push(`passages[${passageIndex}].blocks[${blockIndex}].blockId is required.`);
        } else {
          if (seenPassageBlockIds.has(safeBlockId)) {
            errors.push(
              `passages[${passageIndex}].blocks[${blockIndex}].blockId '${safeBlockId}' is duplicated inside this passage.`,
            );
          } else {
            seenPassageBlockIds.add(safeBlockId);
          }

          if (seenBlockIdsGlobal.has(safeBlockId)) {
            errors.push(`blockId '${safeBlockId}' is used in multiple passage entries.`);
          } else {
            seenBlockIdsGlobal.add(safeBlockId);
          }

          if (safePassageId && !safeBlockId.startsWith(`${safePassageId}_`)) {
            errors.push(
              `blockId '${safeBlockId}' must start with '${safePassageId}_' to match passage relation.`,
            );
          }
        }

        if (!Number.isFinite(safeOrder)) {
          errors.push(`passages[${passageIndex}].blocks[${blockIndex}].order must be numeric.`);
        }
      });
    }
  });

  const sortedRanges = ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < sortedRanges.length; index += 1) {
    const previous = sortedRanges[index - 1];
    const current = sortedRanges[index];
    if (current.start <= previous.end) {
      errors.push(
        `questionRange overlap between passages[${previous.index}] and passages[${current.index}].`,
      );
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

async function getListeningBlocksCollectionName() {
  const db = mongoose.connection.db;
  const defaultCollectionName = "listening_blocks";
  const legacyCollectionName = "listeninig_blocks";
  const hasDefaultCollection = Boolean(
    await db.listCollections({ name: defaultCollectionName }, { nameOnly: true }).next(),
  );

  if (hasDefaultCollection) {
    const count = await db.collection(defaultCollectionName).estimatedDocumentCount();
    if (count > 0) {
      return defaultCollectionName;
    }
  }

  const hasLegacyCollection = Boolean(
    await db.listCollections({ name: legacyCollectionName }, { nameOnly: true }).next(),
  );

  if (hasLegacyCollection) {
    const count = await db.collection(legacyCollectionName).estimatedDocumentCount();
    if (count > 0) {
      return legacyCollectionName;
    }
  }

  return defaultCollectionName;
}

function buildListeningBlockExtractionPrompt() {
  return [
    "Digitize the attached IELTS listening block image into JSON.",
    "Return ONLY a valid JSON object. Do not include markdown fences.",
    "Use this structure:",
    JSON.stringify(EXAMPLE_LISTENING_BLOCK),
    "Rules:",
    "- Keep `_id`, `questionFamily`, `blockType`, `instruction`, `display`, `questions`.",
    "- Every question item must include `id`, `number`, and `answer` (array of accepted answers).",
    "- For content with blanks, split text and gap token objects like:",
    '["Text ", {"type":"gap","qid":"q1","number":1}, " tail"]',
  ].join("\n");
}

function buildReadingPassageExtractionPrompt() {
  return [
    "Digitize the attached IELTS reading passage image into JSON for `reading_passages`.",
    "Return ONLY a valid JSON object. Do not include markdown fences. Do not include any value from youself, if there is no nedded value put 'Null' ",
    "Use this structure:",
    JSON.stringify(EXAMPLE_READING_PASSAGE),
    "Rules:",
    "- Keep `_id`, `title`, `section`, `provider`, `book`, `test`, `passageNumber`, `contentBlocks`, `status`.",
    "- Set `section` to `reading`.",
    `- Allowed contentBlocks.type values: ${Array.from(ALLOWED_READING_CONTENT_BLOCK_TYPES).join(", ")}.`,
    "- Use `paragraphId` only where it is visible and relevant (A/B/C...).",
    "- Preserve passage text exactly; normalize spacing only.",
  ].join("\n");
}

function buildReadingBlockExtractionPrompt() {
  return [
    "Digitize the attached IELTS reading question block image into JSON for `reading_blocks`.",
    "Return ONLY a valid JSON object. Do not include markdown fences.",
    "Use this structure:",
    JSON.stringify(EXAMPLE_READING_BLOCK),
    "Rules:",
    "- Keep `_id`, `passageId`, `questionFamily`, `blockType`, `instruction`, `passageScope`, `display`, `questions`, `status`.",
    `- Allowed questionFamily values: ${Array.from(ALLOWED_READING_QUESTION_FAMILIES).join(", ")}.`,
    `- Allowed blockType values: ${Array.from(ALLOWED_READING_BLOCK_TYPES).join(", ")}.`,
    "- Every question item must include `id`, `number`, and `answers` (array, always).",
    "- For gap-fill content, tokenize with gap objects like:",
    '["Text ", {"type":"gap","qid":"q1","number":1}, " tail"]',
    "- For matching and multiple-choice displays, preserve options and prompt structures.",
  ].join("\n");
}

function stripMarkdownFences(text) {
  const safe = String(text || "").trim();
  if (!safe.startsWith("```")) {
    return safe;
  }

  const lines = safe.split("\n");
  if (lines.length <= 2) {
    return safe.replace(/```json/gi, "").replace(/```/g, "").trim();
  }

  return lines.slice(1, -1).join("\n").trim();
}

async function requestOpenRouterImageJson({
  req,
  prompt,
  modelEnvKey,
  fallbackTitle,
  userText,
}) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return {
      status: 500,
      payload: {
        message:
          "OpenRouter API key is not configured. Set OPENROUTER_API_KEY_V2 in server/.env and restart server.",
      },
    };
  }

  if (typeof fetch !== "function") {
    return {
      status: 500,
      payload: {
        message: "Server runtime does not support fetch(). Use Node.js 18+.",
      },
    };
  }

  const contentTypeHeader = normalizeText(getHeaderValue(req.headers, "content-type"));
  const mimeType = (contentTypeHeader.split(";")[0] || "").trim() || "image/jpeg";
  const imageFileName = normalizeText(getHeaderValue(req.headers, "x-image-filename")) || "pasted-image.jpg";
  const fallbackMimeType = deriveContentTypeFromFileName(imageFileName);
  const effectiveMimeType = mimeType.startsWith("image/") ? mimeType : fallbackMimeType;

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return {
      status: 400,
      payload: {
        message: "Image payload is missing. Paste or upload an image first.",
      },
    };
  }

  if (!effectiveMimeType.startsWith("image/")) {
    return {
      status: 400,
      payload: {
        message: "Content-Type must be an image type.",
      },
    };
  }

  const model = normalizeText(process.env[modelEnvKey]) || DEFAULT_OPENROUTER_MODEL;
  const base64Image = Buffer.from(req.body).toString("base64");
  const dataUrl = `data:${effectiveMimeType};base64,${base64Image}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.CLIENT_ORIGIN || "http://localhost:5173",
      "X-Title": fallbackTitle,
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `${userText} (${imageFileName}).` },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  const responseText = await response.text();
  let responseBody = null;
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = { message: responseText };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      return {
        status: 401,
        payload: {
          message:
            "OpenRouter authentication failed (401). API key is invalid/revoked or belongs to a deleted account. Update OPENROUTER_API_KEY_V2 in server/.env and restart server.",
          keyPreview: maskApiKey(apiKey),
          raw: responseBody,
        },
      };
    }

    return {
      status: response.status,
      payload: {
        message: responseBody?.error?.message || responseBody?.message || "OpenRouter extraction failed.",
        raw: responseBody,
      },
    };
  }

  const rawContent = responseBody?.choices?.[0]?.message?.content || "";
  if (!rawContent) {
    return {
      status: 502,
      payload: {
        message: "OpenRouter returned empty content.",
        raw: responseBody,
      },
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(stripMarkdownFences(rawContent));
  } catch {
    return {
      status: 502,
      payload: {
        message: "Extracted content is not valid JSON.",
        rawContent,
      },
    };
  }

  return {
    status: 200,
    payload: {
      model,
      parsed,
    },
  };
}

async function getSuperAdminStatus(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  return res.json({
    message: "Super admin access granted.",
    sections: [
      {
        key: "listening",
        label: "Listening tests",
        path: `/super-admin/${req.params.password}/listening`,
      },
      {
        key: "reading",
        label: "Reading tests",
        path: `/super-admin/${req.params.password}/reading`,
      },
    ],
  });
}

async function listListeningAudios(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const audios = await ListeningAudio.find({}, { audioData: 0 })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  return res.json({
    collection: "listening_audios",
    audios,
  });
}

async function uploadListeningAudio(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const fileNameHeader = getHeaderValue(req.headers, "x-audio-filename");
  const audioId = deriveAudioIdFromFileName(fileNameHeader);
  const mimeType = getHeaderValue(req.headers, "content-type").split(";")[0].trim();

  if (!fileNameHeader || !audioId) {
    return res.status(400).json({
      message: "Provide a valid `X-Audio-Filename` header (for example: aps.mp3).",
    });
  }

  if (!mimeType.startsWith("audio/")) {
    return res.status(400).json({
      message: "Content-Type must be an audio type, for example audio/mpeg.",
    });
  }

  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({
      message: "Audio payload is missing. Send raw audio bytes in the request body.",
    });
  }

  const didExist = Boolean(await ListeningAudio.exists({ _id: audioId }));

  await ListeningAudio.findByIdAndUpdate(
    audioId,
    {
      $set: {
        _id: audioId,
        originalFileName: path.basename(fileNameHeader),
        mimeType,
        fileSizeBytes: req.body.length,
        audioData: req.body,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  const audio = await ListeningAudio.findById(audioId, { audioData: 0 }).lean();

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Listening audio '${audioId}' updated.`
      : `Listening audio '${audioId}' uploaded.`,
    audio,
  });
}

async function streamListeningAudio(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const audioId = String(req.params.audioId || "").trim();
  const audio = await ListeningAudio.findById(audioId);

  if (!audio) {
    return res.status(404).json({
      message: `Listening audio '${audioId}' not found.`,
    });
  }

  return sendAudioStreamResponse(req, res, audio.audioData, {
    mimeType: audio.mimeType,
    fileName: audio.originalFileName,
  });
}

async function deleteListeningAudio(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const audioId = String(req.params.audioId || "").trim();
  const deletedAudio = await ListeningAudio.findByIdAndDelete(audioId).lean();

  if (!deletedAudio) {
    return res.status(404).json({
      message: `Listening audio '${audioId}' not found.`,
    });
  }

  return res.json({
    message: `Listening audio '${audioId}' deleted.`,
    audio: {
      _id: deletedAudio._id,
      originalFileName: deletedAudio.originalFileName,
      mimeType: deletedAudio.mimeType,
      fileSizeBytes: deletedAudio.fileSizeBytes,
      createdAt: deletedAudio.createdAt,
      updatedAt: deletedAudio.updatedAt,
    },
  });
}

async function extractListeningBlockFromImage(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildListeningBlockExtractionPrompt(),
      modelEnvKey: "OPENROUTER_LISTENING_MODEL",
      fallbackTitle: "IELTS Super Admin Listening Extractor",
      userText: "Extract block JSON from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedBlock = normalizeListeningBlockPayload(extractionResult.payload.parsed);
    const validationErrors = validateListeningBlockPayload(normalizedBlock);

    return res.json({
      message: validationErrors.length > 0
        ? "Block extracted. Please fix validation errors before saving."
        : "Block extracted successfully.",
      model: extractionResult.payload.model,
      block: normalizedBlock,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Listening block extraction failed.",
    });
  }
}

async function saveListeningBlock(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawBlock = req.body?.block;
  const normalizedBlock = normalizeListeningBlockPayload(rawBlock);
  const validationErrors = validateListeningBlockPayload(normalizedBlock);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Block JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const collectionName = await getListeningBlocksCollectionName();
  const collection = mongoose.connection.db.collection(collectionName);
  const didExist = Boolean(await collection.findOne({ _id: normalizedBlock._id }, { projection: { _id: 1 } }));

  await collection.updateOne(
    { _id: normalizedBlock._id },
    {
      $set: normalizedBlock,
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Listening block '${normalizedBlock._id}' updated.`
      : `Listening block '${normalizedBlock._id}' created.`,
    block: normalizedBlock,
    collection: collectionName,
  });
}

async function getReadingAdminEntry(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const db = mongoose.connection.db;
  const [passagesCount, blocksCount, testsCount] = await Promise.all([
    db.collection(READING_PASSAGES_COLLECTION).countDocuments({}),
    db.collection(READING_BLOCKS_COLLECTION).countDocuments({}),
    db.collection(READING_TESTS_COLLECTION).countDocuments({}),
  ]);

  return res.json({
    message: "Reading super admin access granted.",
    collections: {
      passages: READING_PASSAGES_COLLECTION,
      blocks: READING_BLOCKS_COLLECTION,
      tests: READING_TESTS_COLLECTION,
    },
    counts: {
      passages: passagesCount,
      blocks: blocksCount,
      tests: testsCount,
    },
  });
}

async function listReadingPassages(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const passages = await mongoose.connection.db
    .collection(READING_PASSAGES_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: READING_PASSAGES_COLLECTION,
    passages,
  });
}

async function listReadingBlocks(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const blocks = await mongoose.connection.db
    .collection(READING_BLOCKS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: READING_BLOCKS_COLLECTION,
    blocks,
  });
}

async function listReadingTests(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const tests = await mongoose.connection.db
    .collection(READING_TESTS_COLLECTION)
    .find({})
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  return res.json({
    collection: READING_TESTS_COLLECTION,
    tests,
  });
}

async function extractReadingPassageFromImage(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildReadingPassageExtractionPrompt(),
      modelEnvKey: "OPENROUTER_READING_MODEL",
      fallbackTitle: "IELTS Super Admin Reading Passage Extractor",
      userText: "Extract reading passage JSON from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedPassage = normalizeReadingPassagePayload(extractionResult.payload.parsed);
    const validationErrors = validateReadingPassagePayload(normalizedPassage);

    return res.json({
      message: validationErrors.length > 0
        ? "Passage extracted. Please fix validation errors before saving."
        : "Passage extracted successfully.",
      model: extractionResult.payload.model,
      passage: normalizedPassage,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Reading passage extraction failed.",
    });
  }
}

async function extractReadingBlockFromImage(req, res) {
  try {
    if (!hasValidSuperAdminPassword(req.params.password)) {
      return denyInvalidPassword(res);
    }

    const extractionResult = await requestOpenRouterImageJson({
      req,
      prompt: buildReadingBlockExtractionPrompt(),
      modelEnvKey: "OPENROUTER_READING_MODEL",
      fallbackTitle: "IELTS Super Admin Reading Block Extractor",
      userText: "Extract reading block JSON from this image",
    });

    if (extractionResult.status !== 200) {
      return res.status(extractionResult.status).json(extractionResult.payload);
    }

    const normalizedBlock = normalizeReadingBlockPayload(extractionResult.payload.parsed);
    const validationErrors = validateReadingBlockPayload(normalizedBlock);

    return res.json({
      message: validationErrors.length > 0
        ? "Block extracted. Please fix validation errors before saving."
        : "Block extracted successfully.",
      model: extractionResult.payload.model,
      block: normalizedBlock,
      validation: {
        isValid: validationErrors.length === 0,
        errors: validationErrors,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error?.message || "Reading block extraction failed.",
    });
  }
}

async function saveReadingPassage(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawPassage = req.body?.passage;
  const normalizedPassage = normalizeReadingPassagePayload(rawPassage);
  const validationErrors = validateReadingPassagePayload(normalizedPassage);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Passage JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const collection = mongoose.connection.db.collection(READING_PASSAGES_COLLECTION);
  const didExist = Boolean(await collection.findOne({ _id: normalizedPassage._id }, { projection: { _id: 1 } }));
  const now = new Date().toISOString();

  await collection.updateOne(
    { _id: normalizedPassage._id },
    {
      $set: {
        ...normalizedPassage,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Reading passage '${normalizedPassage._id}' updated.`
      : `Reading passage '${normalizedPassage._id}' created.`,
    passage: normalizedPassage,
    collection: READING_PASSAGES_COLLECTION,
  });
}

async function saveReadingBlock(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawBlock = req.body?.block;
  const normalizedBlock = normalizeReadingBlockPayload(rawBlock);
  const validationErrors = validateReadingBlockPayload(normalizedBlock);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Block JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const collection = mongoose.connection.db.collection(READING_BLOCKS_COLLECTION);
  const didExist = Boolean(await collection.findOne({ _id: normalizedBlock._id }, { projection: { _id: 1 } }));
  const now = new Date().toISOString();

  await collection.updateOne(
    { _id: normalizedBlock._id },
    {
      $set: {
        ...normalizedBlock,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Reading block '${normalizedBlock._id}' updated.`
      : `Reading block '${normalizedBlock._id}' created.`,
    block: normalizedBlock,
    collection: READING_BLOCKS_COLLECTION,
  });
}

async function saveReadingTest(req, res) {
  if (!hasValidSuperAdminPassword(req.params.password)) {
    return denyInvalidPassword(res);
  }

  const rawTest = req.body?.test;
  const normalizedTest = normalizeReadingTestPayload(rawTest);
  const validationErrors = validateReadingTestPayload(normalizedTest);

  if (validationErrors.length > 0) {
    return res.status(400).json({
      message: "Test JSON is invalid.",
      validation: {
        isValid: false,
        errors: validationErrors,
      },
    });
  }

  const passagesCollection = mongoose.connection.db.collection(READING_PASSAGES_COLLECTION);
  const blocksCollection = mongoose.connection.db.collection(READING_BLOCKS_COLLECTION);

  const passageIds = normalizedTest.passages.map((entry) => entry.passageId);
  const blockIds = normalizedTest.passages.flatMap((entry) => entry.blocks.map((item) => item.blockId));

  const [passages, blocks] = await Promise.all([
    passagesCollection.find({ _id: { $in: passageIds } }, { projection: { _id: 1 } }).toArray(),
    blocksCollection.find({ _id: { $in: blockIds } }, { projection: { _id: 1, passageId: 1 } }).toArray(),
  ]);

  const foundPassageIds = new Set(passages.map((item) => item._id));
  const foundBlocksById = new Map(blocks.map((item) => [item._id, item]));
  const relationErrors = [];

  passageIds.forEach((passageId) => {
    if (!foundPassageIds.has(passageId)) {
      relationErrors.push(`Referenced passageId '${passageId}' does not exist in ${READING_PASSAGES_COLLECTION}.`);
    }
  });

  normalizedTest.passages.forEach((passageEntry) => {
    passageEntry.blocks.forEach((blockRef) => {
      const blockDoc = foundBlocksById.get(blockRef.blockId);
      if (!blockDoc) {
        relationErrors.push(`Referenced blockId '${blockRef.blockId}' does not exist in ${READING_BLOCKS_COLLECTION}.`);
        return;
      }

      if (normalizeText(blockDoc.passageId) !== normalizeText(passageEntry.passageId)) {
        relationErrors.push(
          `Block '${blockRef.blockId}' belongs to passage '${blockDoc.passageId}', but test passage entry uses '${passageEntry.passageId}'.`,
        );
      }
    });
  });

  if (relationErrors.length > 0) {
    return res.status(400).json({
      message: "Test references are invalid.",
      validation: {
        isValid: false,
        errors: relationErrors,
      },
    });
  }

  const testsCollection = mongoose.connection.db.collection(READING_TESTS_COLLECTION);
  const didExist = Boolean(await testsCollection.findOne({ _id: normalizedTest._id }, { projection: { _id: 1 } }));
  const now = new Date().toISOString();

  await testsCollection.updateOne(
    { _id: normalizedTest._id },
    {
      $set: {
        ...normalizedTest,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    },
  );

  return res.status(didExist ? 200 : 201).json({
    message: didExist
      ? `Reading test '${normalizedTest._id}' updated.`
      : `Reading test '${normalizedTest._id}' created.`,
    test: normalizedTest,
    collection: READING_TESTS_COLLECTION,
  });
}

module.exports = {
  getSuperAdminStatus,
  listListeningAudios,
  uploadListeningAudio,
  streamListeningAudio,
  deleteListeningAudio,
  extractListeningBlockFromImage,
  saveListeningBlock,
  getReadingAdminEntry,
  listReadingPassages,
  listReadingBlocks,
  listReadingTests,
  extractReadingPassageFromImage,
  extractReadingBlockFromImage,
  saveReadingPassage,
  saveReadingBlock,
  saveReadingTest,
  normalizeReadingPassagePayload,
  normalizeReadingBlockPayload,
  normalizeReadingTestPayload,
  validateReadingPassagePayload,
  validateReadingBlockPayload,
  validateReadingTestPayload,
  buildReadingPassageExtractionPrompt,
  buildReadingBlockExtractionPrompt,
};
