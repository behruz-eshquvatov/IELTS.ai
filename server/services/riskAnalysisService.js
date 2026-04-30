function hasTruthyPayloadFlag(payload, keys) {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const stack = [payload];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== "object") {
      continue;
    }
    for (const [key, value] of Object.entries(current)) {
      const normalizedKey = String(key || "").toLowerCase();
      if (keys.includes(normalizedKey)) {
        if (typeof value === "number" && value > 0) {
          return true;
        }
        if (typeof value === "boolean" && value) {
          return true;
        }
      }
      if (value && typeof value === "object") {
        stack.push(value);
      }
    }
  }
  return false;
}

function includesAnyText(values, needles) {
  return values.some((value) => {
    const text = String(value || "").toLowerCase();
    return needles.some((needle) => text.includes(needle));
  });
}

function buildRiskFromSignals({ attempts, writingAnalyses }) {
  const reasons = [];
  let points = 0;

  const normalizedAttempts = Array.isArray(attempts) ? attempts : [];
  const normalizedAnalyses = Array.isArray(writingAnalyses) ? writingAnalyses : [];

  const autoSubmittedCount = normalizedAttempts.filter((attempt) => {
    const submitReason = String(attempt?.submitReason || "").toLowerCase();
    return Boolean(attempt?.isAutoSubmitted)
      || ["auto", "focus-lost", "page-hide", "leave-page", "before-unload"].includes(submitReason);
  }).length;
  if (autoSubmittedCount > 0) {
    reasons.push(`${autoSubmittedCount} auto-submitted attempt(s) detected.`);
    points += autoSubmittedCount >= 2 ? 3 : 2;
  }

  const tabSwitchDetected = normalizedAttempts.some((attempt) =>
    hasTruthyPayloadFlag(attempt?.payload, ["tabswitchcount", "tabswitches", "blurcount", "focuslosscount"]));
  if (tabSwitchDetected) {
    reasons.push("Browser/tab switch activity detected.");
    points += 2;
  }

  const tooFastHighScore = normalizedAttempts.some((attempt) => {
    const band = Number(attempt?.score?.band);
    const duration = Number(attempt?.totalTimeSpentSeconds || 0);
    return Number.isFinite(band) && band >= 7 && duration > 0 && duration < 300;
  });
  if (tooFastHighScore) {
    reasons.push("High score submitted in unusually short time.");
    points += 2;
  }

  const hasMissingTiming = normalizedAttempts.some((attempt) => Number(attempt?.totalTimeSpentSeconds || 0) <= 0);
  if (hasMissingTiming) {
    reasons.push("Missing or zero timing data in one or more attempts.");
    points += 1;
  }

  const suspiciousWritingSignals = normalizedAnalyses.some((analysis) => {
    const textPool = [
      analysis?.summary,
      ...(Array.isArray(analysis?.weaknesses) ? analysis.weaknesses : []),
      ...(Array.isArray(analysis?.suggestions) ? analysis.suggestions : []),
      ...(Array.isArray(analysis?.diagnosis?.taskIssues) ? analysis.diagnosis.taskIssues : []),
      ...(Array.isArray(analysis?.detections) ? analysis.detections.map((item) => item?.issue || item?.label || "") : []),
    ];
    return includesAnyText(textPool, ["off-topic", "off topic", "plagiarism", "ai-generated", "ai generated", "copied"]);
  });
  if (suspiciousWritingSignals) {
    reasons.push("Writing analysis flagged possible off-topic/AI/plagiarism concerns.");
    points += 3;
  }

  if (!reasons.length) {
    return { level: "clean", reasons: [] };
  }
  if (points >= 6) {
    return { level: "high", reasons };
  }
  if (points >= 3) {
    return { level: "medium", reasons };
  }
  return { level: "low", reasons };
}

module.exports = {
  buildRiskFromSignals,
};

