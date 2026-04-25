import { parseJsonInput } from "./jsonParsing";

export const PASSAGE_TEMPLATE = {
  _id: "rc_cmbr_10_1_1",
  title: "Passage title",
  section: "reading",
  provider: "cambridge",
  book: 10,
  test: 1,
  passageNumber: 1,
  contentBlocks: [
    { type: "intro", text: "Intro..." },
    { type: "paragraph", paragraphId: "A", text: "Paragraph A..." },
  ],
  status: "draft",
};

export const BLOCK_TEMPLATE = {
  _id: "rc_cmbr_10_1_1_1-6",
  passageId: "rc_cmbr_10_1_1",
  questionFamily: "matching",
  blockType: "matching_headings",
  instruction: { text: "Choose headings." },
  passageScope: { type: "paragraphs", targets: ["A", "B"] },
  display: {
    headingOptions: [{ key: "i", text: "Heading 1" }],
    prompts: [{ qid: "q1", number: 1, paragraphId: "A" }],
  },
  questions: [{ id: "q1", number: 1, answers: ["i"] }],
  status: "draft",
};

export const TEST_TEMPLATE = {
  _id: "rc_cmbr_10_1",
  title: "Cambridge 10 Test 1 Reading",
  section: "reading",
  module: "academic",
  totalQuestions: 40,
  status: "draft",
  passages: [
    {
      passageNumber: 1,
      passageId: "rc_cmbr_10_1_1",
      questionRange: { start: 1, end: 13 },
      blocks: [{ blockId: "rc_cmbr_10_1_1_1-6", order: 1 }],
    },
  ],
};

const EMPTY_TEST_DRAFT = {
  _id: "",
  title: "",
  section: "reading",
  module: "academic",
  totalQuestions: 40,
  status: "draft",
  passages: [],
};

export function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function toAnswersArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  const safe = normalizeText(value);
  return safe ? [safe] : [];
}

function isBinaryJudgementBlock(questionFamily, blockType) {
  const safeFamily = normalizeText(questionFamily).toLowerCase();
  const safeBlockType = normalizeText(blockType).toLowerCase();
  return (
    safeFamily === "binary_judgement"
    || safeBlockType === "true_false_not_given"
    || safeBlockType === "yes_no_not_given"
  );
}

function getCanonicalBinaryOptions(blockType) {
  return normalizeText(blockType).toLowerCase() === "yes_no_not_given"
    ? ["YES", "NO", "NOT GIVEN"]
    : ["TRUE", "FALSE", "NOT GIVEN"];
}

function normalizeBinaryPromptItem(rawPrompt, promptIndex, normalizedQuestions = []) {
  const source = rawPrompt && typeof rawPrompt === "object"
    ? rawPrompt
    : { text: normalizeText(rawPrompt) };
  const questionByIndex = normalizedQuestions[promptIndex] || null;
  const explicitPromptId = normalizeText(source.qid || source.id);
  const explicitPromptNumber = Number(source.number);
  const questionById = explicitPromptId
    ? normalizedQuestions.find((question) => normalizeText(question?.id) === explicitPromptId)
    : null;
  const questionByNumber = Number.isFinite(explicitPromptNumber)
    ? normalizedQuestions.find((question) => Number(question?.number) === explicitPromptNumber)
    : null;
  const mappedQuestion = questionById || questionByNumber || questionByIndex;
  const number = Number.isFinite(explicitPromptNumber)
    ? explicitPromptNumber
    : Number(mappedQuestion?.number || promptIndex + 1);
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

  source.options = getCanonicalBinaryOptions(blockType);
  source.prompts = prompts;
  delete source.statements;

  return source;
}

export function normalizeReadingPassagePayload(raw = {}) {
  return {
    ...raw,
    _id: normalizeText(raw._id),
    title: normalizeText(raw.title),
    section: "reading",
    provider: normalizeText(raw.provider).toLowerCase(),
    book: Number(raw.book),
    test: Number(raw.test),
    passageNumber: Number(raw.passageNumber),
    contentBlocks: Array.isArray(raw.contentBlocks) ? raw.contentBlocks : [],
    status: normalizeText(raw.status || "draft").toLowerCase(),
  };
}

export function normalizeReadingBlockPayload(raw = {}) {
  const normalizedQuestionFamily = normalizeText(raw.questionFamily).toLowerCase();
  const normalizedBlockType = normalizeText(raw.blockType).toLowerCase();
  const normalizedQuestions = Array.isArray(raw.questions)
    ? raw.questions.map((question, index) => ({
      ...(question || {}),
      id: normalizeText(question?.id || question?.qid || `q${index + 1}`),
      number: Number(question?.number || index + 1),
      answers: toAnswersArray(question?.answers ?? question?.answer),
    }))
    : [];
  const normalizedDisplay = (() => {
    const baseDisplay = raw.display && typeof raw.display === "object" ? raw.display : {};
    if (!isBinaryJudgementBlock(normalizedQuestionFamily, normalizedBlockType)) {
      return baseDisplay;
    }

    return normalizeBinaryJudgementDisplay(baseDisplay, normalizedQuestions, normalizedBlockType);
  })();

  return {
    ...raw,
    _id: normalizeText(raw._id),
    passageId: normalizeText(raw.passageId),
    questionFamily: normalizedQuestionFamily,
    blockType: normalizedBlockType,
    instruction: {
      ...(raw.instruction || {}),
      text: normalizeText(raw?.instruction?.text),
    },
    display: normalizedDisplay,
    questions: normalizedQuestions,
    status: normalizeText(raw.status || "draft").toLowerCase(),
  };
}

export function normalizeReadingTestPayload(raw = {}) {
  return {
    ...raw,
    _id: normalizeText(raw._id),
    title: normalizeText(raw.title),
    section: "reading",
    module: normalizeText(raw.module || "academic").toLowerCase(),
    totalQuestions: Number(raw.totalQuestions),
    status: normalizeText(raw.status || "draft").toLowerCase(),
    passages: Array.isArray(raw.passages) ? raw.passages : [],
  };
}

export function validateReadingPassagePayload(payload) {
  const errors = [];
  if (!normalizeText(payload?._id)) {
    errors.push("`_id` is required.");
  }
  if (!normalizeText(payload?.title)) {
    errors.push("`title` is required.");
  }
  if (!Array.isArray(payload?.contentBlocks) || payload.contentBlocks.length === 0) {
    errors.push("`contentBlocks` must be non-empty.");
  }
  return errors;
}

export function validateReadingBlockPayload(payload) {
  const errors = [];
  if (!normalizeText(payload?._id)) {
    errors.push("`_id` is required.");
  }
  if (!normalizeText(payload?.passageId)) {
    errors.push("`passageId` is required.");
  }
  if (!normalizeText(payload?.questionFamily)) {
    errors.push("`questionFamily` is required.");
  }
  if (!normalizeText(payload?.blockType)) {
    errors.push("`blockType` is required.");
  }
  if (!normalizeText(payload?.instruction?.text)) {
    errors.push("`instruction.text` is required.");
  }
  if (!Array.isArray(payload?.questions) || payload.questions.length === 0) {
    errors.push("`questions` must be non-empty.");
  }

  if (isBinaryJudgementBlock(payload?.questionFamily, payload?.blockType)) {
    const expectedOptions = getCanonicalBinaryOptions(payload?.blockType);
    const displayOptions = Array.isArray(payload?.display?.options)
      ? payload.display.options.map((item) => normalizeText(item).toUpperCase())
      : [];
    const hasExpectedOptions = (
      displayOptions.length === expectedOptions.length
      && expectedOptions.every((item, index) => displayOptions[index] === item)
    );
    if (!hasExpectedOptions) {
      errors.push(`binary_judgement display.options must be exactly: ${expectedOptions.join(", ")}.`);
    }

    const prompts = Array.isArray(payload?.display?.prompts) ? payload.display.prompts : [];
    if (prompts.length === 0) {
      errors.push("binary_judgement display.prompts must be non-empty.");
    } else {
      prompts.forEach((prompt, index) => {
        if (!normalizeText(prompt?.qid || prompt?.id)) {
          errors.push(`display.prompts[${index}].qid is required for binary_judgement.`);
        }
        if (!Number.isFinite(Number(prompt?.number))) {
          errors.push(`display.prompts[${index}].number must be numeric for binary_judgement.`);
        }
        if (!normalizeText(prompt?.text || prompt?.statement)) {
          errors.push(`display.prompts[${index}].text is required for binary_judgement.`);
        }
      });
    }
  }

  return errors;
}

export function validateReadingTestPayload(payload) {
  const errors = [];
  if (!normalizeText(payload?._id)) {
    errors.push("`_id` is required.");
  }
  if (!normalizeText(payload?.title)) {
    errors.push("`title` is required.");
  }
  if (!Array.isArray(payload?.passages) || payload.passages.length === 0) {
    errors.push("`passages` must be non-empty.");
  }
  return errors;
}

export function inferTestIdFromPassageId(passageId) {
  const safe = normalizeText(passageId);
  if (!safe) {
    return "";
  }

  const parts = safe.split("_").filter(Boolean);
  if (parts.length < 4) {
    return "";
  }

  return parts.slice(0, 4).join("_");
}

export function getWorkingReadingTestDraft(rawTestJson = "") {
  const safeRaw = String(rawTestJson || "").trim();
  if (!safeRaw) {
    return {
      ok: true,
      value: normalizeReadingTestPayload(EMPTY_TEST_DRAFT),
      error: "",
    };
  }

  const parsed = parseJsonInput(safeRaw);
  if (!parsed.ok) {
    return {
      ok: false,
      value: null,
      error: parsed.error,
    };
  }

  return {
    ok: true,
    value: normalizeReadingTestPayload(parsed.value),
    error: "",
  };
}
