function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

const BASE_PRACTICE_CONFIGS = {
  multiple_choice: {
    title: "Multiple Choice",
    description:
      "Practice single- and multi-answer listening multiple-choice tasks in one family flow.",
    blockTypes: ["multiple_choice_single", "multiple_choice_multi"],
    tips: [
      "Read the question stem first so you know what detail to listen for.",
      "Track speaker corrections and contrast words like however and actually.",
      "If two answers are required, do not lock one option only.",
    ],
  },
  matching: {
    title: "Matching",
    description: "Practice listening matching tasks with option-to-detail mapping.",
    blockTypes: ["matching"],
    tips: [
      "Anchor each option to a keyword before selecting.",
      "Beware of distractors that sound similar but refer to another item.",
      "Keep option reuse rules in mind if the instruction allows repetition.",
    ],
  },
  gap_fill: {
    title: "Gap Fill",
    description:
      "Practice form, note, table, and sentence completion in one gap-fill family.",
    blockTypes: ["form_completion", "note_completion", "table_completion", "sentence_completion"],
    tips: [
      "Respect word limits exactly for every blank.",
      "Use grammar around the gap to predict word form.",
      "Check spelling and number formatting before finalizing.",
    ],
  },
  map_diagram_labeling: {
    title: "Map / Diagram Labeling",
    description: "Practice both map labeling and diagram labeling in one family.",
    blockTypes: ["map_labeling", "diagram_labeling"],
    tips: [
      "Track directional language (left, opposite, next to, behind).",
      "Map each label to one precise location cue in the audio.",
      "Do not over-interpret; use the exact term you hear.",
    ],
  },
};

const ALIAS_TO_BASE_KEY = {
  "multiple-choice": "multiple_choice",
  "gap-fill": "gap_fill",
  "map-diagram-labeling": "map_diagram_labeling",
  "map-diagram": "map_diagram_labeling",
  "map-labeling": "map_diagram_labeling",
  "diagram-labeling": "map_diagram_labeling",
  "map/diagram-labeling": "map_diagram_labeling",
  multiple_choice_single: "multiple_choice",
  multiple_choice_multi: "multiple_choice",
  form_completion: "gap_fill",
  note_completion: "gap_fill",
  table_completion: "gap_fill",
  sentence_completion: "gap_fill",
  map_labeling: "map_diagram_labeling",
  diagram_labeling: "map_diagram_labeling",
};

function getListeningPracticeConfig(practiceKey) {
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

function buildListeningPracticeQueryParams(practiceConfig, extras = {}) {
  const params = new URLSearchParams();
  const canonicalKey = normalizeKey(practiceConfig?.canonicalKey || practiceConfig?.routeKey);
  if (canonicalKey) {
    params.set("practiceKey", canonicalKey);
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
  getListeningPracticeConfig,
  buildListeningPracticeQueryParams,
};
