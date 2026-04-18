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
  return {
    ...raw,
    _id: normalizeText(raw._id),
    passageId: normalizeText(raw.passageId),
    questionFamily: normalizeText(raw.questionFamily).toLowerCase(),
    blockType: normalizeText(raw.blockType).toLowerCase(),
    instruction: {
      ...(raw.instruction || {}),
      text: normalizeText(raw?.instruction?.text),
    },
    display: raw.display && typeof raw.display === "object" ? raw.display : {},
    questions: Array.isArray(raw.questions)
      ? raw.questions.map((question, index) => ({
          ...(question || {}),
          id: normalizeText(question?.id || question?.qid || `q${index + 1}`),
          number: Number(question?.number || index + 1),
          answers: toAnswersArray(question?.answers ?? question?.answer),
        }))
      : [],
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
