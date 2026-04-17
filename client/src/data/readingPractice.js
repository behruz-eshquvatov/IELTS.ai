function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

const BASE_PRACTICE_CONFIGS = {
  multiple_choice: {
    title: "Multiple Choice",
    description:
      "Family-level multiple choice practice (single and multi-answer) with passage-first grouping.",
    questionFamilies: ["multiple_choice"],
    tips: [
      "Differentiate direct facts from inference before locking choices.",
      "Eliminate options with subtle wording mismatch, not only obvious errors.",
      "Track paragraph anchors so each answer stays passage-linked.",
    ],
  },
  binary_judgement: {
    title: "Binary Judgement",
    description:
      "Family-level binary judgement practice including True/False/Not Given and Yes/No/Not Given.",
    questionFamilies: ["binary_judgement"],
    tips: [
      "Judge only what the passage states, not what seems logical.",
      "Separate contradiction from absence of information.",
      "Use exact wording clues before deciding TRUE/FALSE/NOT GIVEN or YES/NO/NOT GIVEN.",
    ],
  },
  matching: {
    title: "Matching",
    description:
      "Family-level matching practice including headings, information, features, sentence endings, and multiple matching.",
    questionFamilies: ["matching"],
    tips: [
      "Map key nouns and names first before matching details.",
      "Watch for paraphrases rather than expecting exact sentence reuse.",
      "Confirm each match with a local evidence line in the passage.",
    ],
  },
  gap_fill: {
    title: "Gap Fill",
    description:
      "Family-level completion practice including summary, note, table, flow-chart, and sentence completion.",
    questionFamilies: ["gap_fill"],
    tips: [
      "Respect word limits strictly before finalizing any gap.",
      "Use grammar around the blank to predict word form and type.",
      "Copy spelling and number format exactly from passage wording.",
    ],
  },
  short_answer: {
    title: "Short Answer Questions",
    description: "Family-level short-answer practice with linked passages always shown.",
    questionFamilies: ["short_answer"],
    tips: [
      "Scan for keywords, then confirm nearby lines for precise answer scope.",
      "Keep answers concise and within instructed word limits.",
      "Double-check spelling and singular/plural form.",
    ],
  },
  diagram_labeling: {
    title: "Diagram Label Completion",
    description: "Family-level diagram labeling practice with passage-first grouping.",
    questionFamilies: ["diagram_labeling"],
    tips: [
      "Link each diagram label to the exact descriptive sentence.",
      "Match spatial terms carefully (left/right/top/bottom/near).",
      "Transfer labels exactly as written in the passage.",
    ],
  },
};

const ALIAS_TO_BASE_KEY = {
  "multiple-choice": "multiple_choice",
  "binary-judgement": "binary_judgement",
  "gap-fill": "gap_fill",
  "short-answer-questions": "short_answer",
  "diagram-label-completion": "diagram_labeling",
  tfng: "binary_judgement",
  yng: "binary_judgement",
  headings: "matching",
  "matching-info": "matching",
  "matching-features": "matching",
  "matching-sentence-endings": "matching",
  "multiple-matching": "matching",
  summary: "gap_fill",
  "sentence-completion": "gap_fill",
  "short-answer": "short_answer",
  diagram: "diagram_labeling",
};

function getReadingPracticeConfig(practiceKey) {
  const safeKey = normalizeKey(practiceKey);
  const resolvedKey = ALIAS_TO_BASE_KEY[safeKey] || safeKey;
  const config = BASE_PRACTICE_CONFIGS[resolvedKey];
  if (!config) {
    return null;
  }

  return {
    ...config,
    routeKey: safeKey || resolvedKey,
    canonicalKey: resolvedKey,
  };
}

function buildReadingPracticeQueryParams(practiceConfig, extras = {}) {
  const params = new URLSearchParams({
    status: "published",
  });

  const questionFamilies = Array.isArray(practiceConfig?.questionFamilies)
    ? practiceConfig.questionFamilies
    : [];
  if (questionFamilies.length > 0) {
    params.set("questionFamilies", questionFamilies.join(","));
  }

  const blockTypes = Array.isArray(practiceConfig?.blockTypes) ? practiceConfig.blockTypes : [];
  if (blockTypes.length > 0) {
    params.set("blockTypes", blockTypes.join(","));
  }

  Object.entries(extras || {}).forEach(([key, value]) => {
    const safeKey = String(key || "").trim();
    const safeValue = String(value || "").trim();
    if (!safeKey || !safeValue) {
      return;
    }

    params.set(safeKey, safeValue);
  });

  return params;
}

export {
  getReadingPracticeConfig,
  buildReadingPracticeQueryParams,
};
