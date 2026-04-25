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

function toNormalizedAnswerArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  const safe = normalizeText(value);
  return safe ? [safe] : [];
}

function isBinaryJudgementBlock(questionFamily, blockType) {
  const safeFamily = normalizeEnum(questionFamily);
  const safeBlockType = normalizeEnum(blockType);
  return (
    safeFamily === "binary_judgement"
    || safeBlockType === "true_false_not_given"
    || safeBlockType === "yes_no_not_given"
  );
}

function getCanonicalBinaryOptions(blockType) {
  return normalizeEnum(blockType) === "yes_no_not_given"
    ? ["YES", "NO", "NOT GIVEN"]
    : ["TRUE", "FALSE", "NOT GIVEN"];
}

function normalizeBinaryPromptItem(rawPrompt, promptIndex, normalizedQuestions = []) {
  const source = rawPrompt && typeof rawPrompt === "object"
    ? rawPrompt
    : { text: normalizeText(rawPrompt) };
  const questionByIndex = normalizedQuestions[promptIndex] || null;
  const explicitPromptId = normalizeText(source.qid || source.id);
  const explicitPromptNumber = normalizeNumericValue(source.number);
  const questionById = explicitPromptId
    ? normalizedQuestions.find((question) => normalizeText(question?.id) === explicitPromptId)
    : null;
  const questionByNumber = Number.isFinite(explicitPromptNumber)
    ? normalizedQuestions.find((question) => normalizeNumericValue(question?.number) === explicitPromptNumber)
    : null;
  const mappedQuestion = questionById || questionByNumber || questionByIndex;
  const number = Number.isFinite(explicitPromptNumber)
    ? explicitPromptNumber
    : normalizeNumericValue(mappedQuestion?.number) || promptIndex + 1;
  const qid = explicitPromptId || normalizeText(mappedQuestion?.id) || `q${number}`;
  const textSource = (() => {
    const directCandidates = [source.text, source.statement, source.prompt];
    for (const candidate of directCandidates) {
      if (typeof candidate === "string" || typeof candidate === "number") {
        const normalizedCandidate = normalizeText(candidate);
        if (normalizedCandidate) {
          return normalizedCandidate;
        }
      }

      if (candidate && typeof candidate === "object") {
        const nestedText = normalizeText(
          candidate.text
          || candidate.statement
          || candidate.prompt
          || candidate.value
          || candidate.label
          || candidate.content,
        );
        if (nestedText) {
          return nestedText;
        }
      }
    }

    return "";
  })();
  const text = normalizeText(textSource);

  return {
    qid,
    number,
    text,
  };
}

function normalizeBinaryJudgementDisplay(rawDisplay, normalizedQuestions = [], blockType = "") {
  const source = rawDisplay && typeof rawDisplay === "object" ? { ...rawDisplay } : {};
  const rawPrompts = Array.isArray(source.prompts) ? source.prompts : [];
  const rawStatements = Array.isArray(source.statements) ? source.statements : [];
  const promptSource = rawPrompts.length > 0
    ? rawPrompts
    : rawStatements.map((statement) => (
      statement && typeof statement === "object"
        ? statement
        : { text: normalizeText(statement) }
    ));
  const prompts = promptSource.map((item, index) =>
    normalizeBinaryPromptItem(item, index, normalizedQuestions));
  const canonicalOptions = getCanonicalBinaryOptions(blockType);

  source.options = canonicalOptions;
  source.prompts = prompts;
  delete source.statements;

  return source;
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
  const normalizedQuestionFamily = normalizeEnum(source.questionFamily);
  const normalizedBlockType = normalizeEnum(source.blockType);
  const normalizedQuestions = Array.isArray(source.questions)
    ? source.questions.map((item, index) => normalizeReadingQuestionItem(item, index))
    : [];
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

  const normalizedDisplay = (() => {
    const baseDisplay = source.display && typeof source.display === "object" ? source.display : {};
    if (!isBinaryJudgementBlock(normalizedQuestionFamily, normalizedBlockType)) {
      return baseDisplay;
    }

    return normalizeBinaryJudgementDisplay(baseDisplay, normalizedQuestions, normalizedBlockType);
  })();

  return {
    _id: normalizeText(source._id),
    passageId: normalizeText(source.passageId),
    questionFamily: normalizedQuestionFamily,
    blockType: normalizedBlockType,
    instruction: normalizedInstruction,
    passageScope: {
      ...rawPassageScope,
      type: normalizeEnum(rawPassageScope.type),
      targets: normalizeStringArray(rawPassageScope.targets, (item) => item.toUpperCase()),
    },
    display: normalizedDisplay,
    questions: normalizedQuestions,
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

  if (isBinaryJudgementBlock(safeBlock.questionFamily, safeBlock.blockType)) {
    const expectedOptions = getCanonicalBinaryOptions(safeBlock.blockType);
    const displayOptions = Array.isArray(safeBlock?.display?.options)
      ? safeBlock.display.options.map((item) => normalizeText(item).toUpperCase())
      : [];
    const hasExpectedOptions = (
      displayOptions.length === expectedOptions.length
      && expectedOptions.every((item, index) => displayOptions[index] === item)
    );
    if (!hasExpectedOptions) {
      errors.push(
        `binary_judgement display.options must be exactly: ${expectedOptions.join(", ")}.`,
      );
    }

    const prompts = Array.isArray(safeBlock?.display?.prompts) ? safeBlock.display.prompts : [];
    if (prompts.length === 0) {
      errors.push("binary_judgement display.prompts must be a non-empty array.");
    } else {
      const seenPromptIds = new Set();
      prompts.forEach((prompt, index) => {
        const promptId = normalizeText(prompt?.qid || prompt?.id);
        const promptNumber = normalizeNumericValue(prompt?.number);
        const promptText = normalizeText(prompt?.text || prompt?.statement);

        if (!promptId) {
          errors.push(`display.prompts[${index}].qid is required for binary_judgement.`);
        } else if (seenPromptIds.has(promptId)) {
          errors.push(`display.prompts[${index}].qid '${promptId}' is duplicated.`);
        } else {
          seenPromptIds.add(promptId);
        }

        if (!Number.isFinite(promptNumber)) {
          errors.push(`display.prompts[${index}].number must be numeric for binary_judgement.`);
        }

        if (!promptText) {
          errors.push(`display.prompts[${index}].text is required for binary_judgement.`);
        }
      });
    }
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

  if (isBinaryJudgementBlock(safeBlock.questionFamily, safeBlock.blockType)) {
    const prompts = Array.isArray(safeBlock?.display?.prompts) ? safeBlock.display.prompts : [];
    if (prompts.length > 0 && Array.isArray(safeBlock.questions) && safeBlock.questions.length > 0) {
      const promptIdSet = new Set(
        prompts.map((prompt) => normalizeText(prompt?.qid || prompt?.id)).filter(Boolean),
      );
      const promptNumberSet = new Set(
        prompts
          .map((prompt) => normalizeNumericValue(prompt?.number))
          .filter((value) => Number.isFinite(value))
          .map((value) => String(value)),
      );

      safeBlock.questions.forEach((question, index) => {
        const questionId = normalizeText(question?.id || question?.qid);
        const questionNumber = normalizeNumericValue(question?.number);
        const hasPromptById = questionId ? promptIdSet.has(questionId) : false;
        const hasPromptByNumber = Number.isFinite(questionNumber)
          ? promptNumberSet.has(String(questionNumber))
          : false;
        if (!hasPromptById && !hasPromptByNumber) {
          errors.push(
            `questions[${index}] must map to display.prompts by qid or number for binary_judgement.`,
          );
        }
      });
    }
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

function buildReadingPassageExtractionPrompt() {
  return [
    "Digitize the attached IELTS reading passage image into JSON for `reading_passages`.",
    "Return ONLY a valid JSON object. Do not include markdown fences.",
    "Do not invent any values.",
    "",
    "Use this structure:",
    JSON.stringify(EXAMPLE_READING_PASSAGE),
    "",
    "General rules:",
    "- Keep `_id`, `title`, `section`, `provider`, `book`, `test`, `passageNumber`, `contentBlocks`, `status`.",
    "- Set `section` to `reading`.",
    `- Allowed contentBlocks.type values: ${Array.from(ALLOWED_READING_CONTENT_BLOCK_TYPES).join(", ")}.`,
    "",
    "paragraphId rules:",
    "- paragraphId MUST always exist in paragraph contentBlocks.",
    "- If paragraph letter (A, B, C, D...) is visible in the image, set paragraphId to that letter.",
    "- If paragraph letters are NOT visible in the image, set paragraphId to null.",
    "- DO NOT generate letters automatically.",
    "- DO NOT guess letters.",
    "- DO NOT skip paragraphId field.",
    "",
    "Examples:",
    "",
    "When letters exist in the image:",
    `{ "type": "paragraph", "paragraphId": "A", "text": "..." }`,
    "",
    "When letters do NOT exist in the image:",
    `{ "type": "paragraph", "paragraphId": null, "text": "..." }`,
    "",
    "Text rules:",
    "- Preserve passage text exactly.",
    "- Do not paraphrase.",
    "- Do not shorten.",
    "- Only normalize spacing.",
    "",
    "Structure rules:",
    "- Each paragraph must be a separate contentBlock.",
    "- Keep original paragraph order.",
    "- Do not merge paragraphs.",
    "",
    "Output must be valid JSON only.",
  ].join("\n");
}

function buildReadingBlockExtractionPrompt() {
  return [
    "Digitize the attached IELTS reading question block image into JSON for `reading_blocks`.",
    "Return ONLY a valid JSON object. Do not include markdown fences.",
    "Do not invent values.",
    "",
    "Use this structure:",
    JSON.stringify(EXAMPLE_READING_BLOCK),
    "",
    "Rules:",
    "- Keep `_id`, `passageId`, `questionFamily`, `blockType`, `instruction`, `passageScope`, `display`, `questions`, `status`.",
    "- If `_id` is not visible or not provided, set `_id` to null.",
    "- If `passageId` is not visible or not provided, set `passageId` to null.",
    "- Set `status` to `draft` unless another value is explicitly provided.",
    `- Allowed questionFamily values: ${Array.from(ALLOWED_READING_QUESTION_FAMILIES).join(", ")}.`,
    `- Allowed blockType values: ${Array.from(ALLOWED_READING_BLOCK_TYPES).join(", ")}.`,
    "",
    "Question rules:",
    "- Every question item must include `id`, `number`, and `answers`.",
    "- `answers` must ALWAYS be an array.",
    "- If the correct answer is not visible in the image, set `answers` to [].",
    "",
    "Display rules by blockType:",
    "",
    "multiple_choice_single / multiple_choice_multi:",
    "- store question text and options in display.questions",
    "",
    "matching_*:",
    "- store prompts and options separately",
    "",
    "true_false_not_given / yes_no_not_given:",
    "- use ONE canonical binary_judgement display schema:",
    '{ "display": { "options": ["TRUE","FALSE","NOT GIVEN"], "prompts": [ { "qid":"q1", "number":1, "text":"..." } ] } }',
    "- yes_no_not_given must use options: [\"YES\", \"NO\", \"NOT GIVEN\"]",
    "- true_false_not_given must use options: [\"TRUE\", \"FALSE\", \"NOT GIVEN\"]",
    "- NEVER use display.statements as a plain string array",
    "",
    "short_answer_questions:",
    "- display must contain:",
    '{ "questions":[ { "qid":"q6", "number":6, "text":"..." } ] }',
    "",
    "summary_completion / note_completion / sentence_completion / flow_chart_completion:",
    "- tokenize text using gap objects:",
    '["text ", {"type":"gap","qid":"q1","number":1}, " tail"]',
    "",
    "table_completion:",
    "- display must contain table structure:",
    '{',
    '  "table": {',
    '     "columns": ["col1","col2", ...],',
    '     "rows": [',
    '        [',
    '          "cell 1",',
    '          {"type":"gap","qid":"q5","number":5},',
    '          "cell 3"',
    "        ]",
    "     ]",
    "  }",
    "}",
    "",
    "diagram_label_completion:",
    "- display must contain diagram metadata and labeled gap points.",
    "",
    "Output must be valid JSON only.",
  ].join("\n");
}

module.exports = {
  normalizeReadingPassagePayload,
  validateReadingPassagePayload,
  normalizeReadingBlockPayload,
  validateReadingBlockPayload,
  normalizeReadingTestPayload,
  validateReadingTestPayload,
  buildReadingPassageExtractionPrompt,
  buildReadingBlockExtractionPrompt,
  ALLOWED_READING_CONTENT_BLOCK_TYPES,
  ALLOWED_READING_QUESTION_FAMILIES,
  ALLOWED_READING_BLOCK_TYPES,
};
