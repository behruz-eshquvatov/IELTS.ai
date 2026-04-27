import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SkeletonText } from "../../components/ui/Skeleton";
import { API_BASE_URL, apiRequest } from "../../lib/apiClient";

const TASK_CONFIG = {
  writingTask1: {
    taskType: "writing_task1",
    title: "Writing Task 1 Report",
    backLabel: "Writing Task 1",
    backTo: "/student/tests/writingTask1",
    analysisApiBasePath: "/writing-task1/analyses",
    itemApiBasePath: "/writing-task1/items",
    storagePrefixes: ["student:writing-task1"],
    criteria: [
      { key: "taskAchievement", label: "Task Achievement" },
      { key: "coherenceCohesion", label: "Coherence and Cohesion" },
      { key: "lexicalResource", label: "Lexical Resource" },
      { key: "grammaticalRangeAccuracy", label: "Grammatical Range and Accuracy" },
    ],
  },
  writingTask2: {
    taskType: "writing_task2",
    title: "Writing Task 2 Report",
    backLabel: "Writing Task 2",
    backTo: "/student/tests/writingTask2",
    analysisApiBasePath: "/writing-task2/analyses",
    itemApiBasePath: "/writing-task2/items",
    storagePrefixes: ["student:writing-task2-opinion", "student:writing-task2"],
    criteria: [
      { key: "taskResponse", label: "Task Response" },
      { key: "coherenceCohesion", label: "Coherence and Cohesion" },
      { key: "lexicalResource", label: "Lexical Resource" },
      { key: "grammaticalRangeAccuracy", label: "Grammatical Range and Accuracy" },
    ],
  },
  "writingTask2-opinion": {
    taskType: "writing_task2",
    title: "Writing Task 2 Report",
    backLabel: "Writing Task 2 Sets",
    backTo: "/student/tests/writingTask2-opinion",
    analysisApiBasePath: "/writing-task2/analyses",
    itemApiBasePath: "/writing-task2/items",
    storagePrefixes: ["student:writing-task2-opinion", "student:writing-task2"],
    criteria: [
      { key: "taskResponse", label: "Task Response" },
      { key: "coherenceCohesion", label: "Coherence and Cohesion" },
      { key: "lexicalResource", label: "Lexical Resource" },
      { key: "grammaticalRangeAccuracy", label: "Grammatical Range and Accuracy" },
    ],
  },
};

const ISSUE_THEME_BY_TYPE = {
  grammar: {
    label: "Grammar",
    badgeClass: "border-rose-200 bg-rose-50 text-rose-700",
    highlightClass: "bg-rose-50/80 decoration-rose-500",
  },
  lexical: {
    label: "Lexical Choice",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    highlightClass: "bg-amber-50/80 decoration-amber-500",
  },
  repetition: {
    label: "Lexical Choice",
    badgeClass: "border-amber-200 bg-amber-50 text-amber-700",
    highlightClass: "bg-amber-50/80 decoration-amber-500",
  },
  coherence: {
    label: "Coherence / Linking",
    badgeClass: "border-sky-200 bg-sky-50 text-sky-700",
    highlightClass: "bg-sky-50/80 decoration-sky-500",
  },
  task: {
    label: "Task Achievement",
    badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    highlightClass: "bg-emerald-50/80 decoration-emerald-500",
  },
  style: {
    label: "Style / Clarity",
    badgeClass: "border-violet-200 bg-violet-50 text-violet-700",
    highlightClass: "bg-violet-50/80 decoration-violet-500",
  },
};

const LEGEND_ORDER = ["grammar", "lexical", "coherence", "task", "style"];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeVisualAsset(value) {
  return {
    imageId: normalizeText(value?.imageId),
    url: normalizeText(value?.url),
  };
}

function resolveVisualUrl(url) {
  const safe = normalizeText(url);
  if (!safe) {
    return "";
  }

  if (/^https?:\/\//i.test(safe) || /^data:image\//i.test(safe)) {
    return safe;
  }

  let apiOrigin = "";
  try {
    apiOrigin = new URL(API_BASE_URL).origin;
  } catch {
    apiOrigin = "";
  }

  const normalizedPath = safe.replace(/^\/+/, "");
  if (/^\/api\//i.test(safe) || /^api\//i.test(normalizedPath)) {
    return apiOrigin ? `${apiOrigin}/${normalizedPath}` : `${API_BASE_URL}/${normalizedPath}`;
  }

  return `${API_BASE_URL}/${normalizedPath}`;
}

function countWords(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function formatBand(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return numeric.toFixed(1);
}

function formatTimeSpent(seconds) {
  const safeSeconds = Math.max(Number(seconds) || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function readStoredObject(storageKey) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = localStorage.getItem(storageKey);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function readStoredString(storageKey) {
  if (typeof window === "undefined") {
    return "";
  }

  const rawValue = localStorage.getItem(storageKey);
  return typeof rawValue === "string" ? rawValue : "";
}

function findStoredObject(prefixes, suffix) {
  for (const prefix of prefixes) {
    const entry = readStoredObject(`${prefix}:${suffix}`);
    if (entry) {
      return entry;
    }
  }

  return null;
}

function findStoredString(prefixes, suffix) {
  for (const prefix of prefixes) {
    const entry = readStoredString(`${prefix}:${suffix}`);
    if (entry) {
      return entry;
    }
  }

  return "";
}

function toIso(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.valueOf())) {
    return "";
  }

  return parsed.toISOString();
}

function resolveIssueTheme(category) {
  const safeCategory = normalizeText(category).toLowerCase();
  return ISSUE_THEME_BY_TYPE[safeCategory] || ISSUE_THEME_BY_TYPE.style;
}

function limitSentences(value, maxSentences = 2, maxLength = 220) {
  const safe = normalizeText(value);
  if (!safe) {
    return "";
  }

  const sentences = safe.match(/[^.!?]+[.!?]?/g);
  if (!Array.isArray(sentences) || sentences.length === 0) {
    return safe.slice(0, maxLength);
  }

  return sentences
    .slice(0, maxSentences)
    .join(" ")
    .trim()
    .slice(0, maxLength);
}

function buildTooltipPayload(detection) {
  const title = limitSentences(detection.label || "Issue", 1, 70) || "Issue";
  const explanation = limitSentences(detection.issue || detection.whyItHurtsBand, 2, 190);
  const suggestionSource = detection.correctedText
    ? `Try: ${detection.correctedText}`
    : detection.fix;
  const suggestion = limitSentences(suggestionSource, 2, 220);

  return {
    title,
    explanation,
    suggestion,
  };
}

function hasOverlap(ranges, start, end) {
  return ranges.some((range) => !(end <= range.start || start >= range.end));
}

function buildInlineAnnotations(essayText, detections, maxMatches = 18) {
  const safeEssay = String(essayText || "");
  if (!safeEssay || !Array.isArray(detections) || detections.length === 0) {
    return [];
  }

  const normalizedEssay = safeEssay.toLowerCase();
  const ranges = [];

  detections.forEach((detection, index) => {
    if (ranges.length >= maxMatches) {
      return;
    }

    const wrongText = normalizeText(detection?.wrongText);
    if (wrongText.length < 3) {
      return;
    }

    const target = wrongText.toLowerCase();
    let startIndex = 0;

    while (startIndex < normalizedEssay.length && ranges.length < maxMatches) {
      const foundAt = normalizedEssay.indexOf(target, startIndex);
      if (foundAt === -1) {
        break;
      }

      const endAt = foundAt + target.length;
      if (!hasOverlap(ranges, foundAt, endAt)) {
        ranges.push({
          id: `${detection.id || `issue-${index}`}-${foundAt}`,
          start: foundAt,
          end: endAt,
          detection,
        });
        break;
      }

      startIndex = foundAt + 1;
    }
  });

  return ranges.sort((left, right) => left.start - right.start);
}

function buildEssaySegments(essayText, annotations) {
  const safeEssay = String(essayText || "");
  if (!safeEssay) {
    return [];
  }

  if (!Array.isArray(annotations) || annotations.length === 0) {
    return [{ kind: "plain", text: safeEssay }];
  }

  const segments = [];
  let cursor = 0;

  annotations.forEach((annotation) => {
    if (annotation.start > cursor) {
      segments.push({
        kind: "plain",
        text: safeEssay.slice(cursor, annotation.start),
      });
    }

    segments.push({
      kind: "issue",
      text: safeEssay.slice(annotation.start, annotation.end),
      annotation,
    });

    cursor = annotation.end;
  });

  if (cursor < safeEssay.length) {
    segments.push({
      kind: "plain",
      text: safeEssay.slice(cursor),
    });
  }

  return segments;
}

function resolveFloatingTooltipPosition({
  anchorRect,
  pointerX,
  boundsRect,
  tooltipWidth,
  tooltipHeight,
  viewportWidth,
  viewportHeight,
  gap = 10,
  margin = 10,
  horizontalPadding = 12,
  maxHorizontalTravel = 120,
}) {
  const safeWidth = Math.max(Number(tooltipWidth) || 0, 220);
  const safeHeight = Math.max(Number(tooltipHeight) || 0, 90);
  const maxTop = Math.max(margin, viewportHeight - safeHeight - margin);
  const safeAnchor = anchorRect || { left: margin, top: margin, width: 0, height: 0, bottom: margin };
  const anchorCenterX = safeAnchor.left + safeAnchor.width / 2;
  const boundedPointerX = Number.isFinite(pointerX)
    ? Math.min(
      anchorCenterX + maxHorizontalTravel,
      Math.max(anchorCenterX - maxHorizontalTravel, pointerX),
    )
    : anchorCenterX;

  let minLeft = margin;
  let maxLeft = Math.max(margin, viewportWidth - safeWidth - margin);

  if (boundsRect && Number.isFinite(boundsRect.left) && Number.isFinite(boundsRect.right)) {
    minLeft = Math.max(minLeft, boundsRect.left + horizontalPadding);
    maxLeft = Math.min(maxLeft, boundsRect.right - safeWidth - horizontalPadding);

    if (maxLeft < minLeft) {
      minLeft = margin;
      maxLeft = Math.max(margin, viewportWidth - safeWidth - margin);
    }
  }

  let left = boundedPointerX - safeWidth / 2;
  left = Math.min(Math.max(minLeft, left), maxLeft);

  let top = safeAnchor.top - safeHeight - gap;
  top = Math.min(Math.max(margin, top), maxTop);

  return {
    left: Math.round(left),
    top: Math.round(top),
  };
}

function StudentWritingTask2ResultPage() {
  const { testId = "" } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const config = TASK_CONFIG[testId] || null;

  const setId = normalizeText(searchParams.get("set"));
  const analysisIdFromQuery = normalizeText(searchParams.get("analysisId"));

  const stateSubmission =
    location.state?.submission && typeof location.state.submission === "object"
      ? location.state.submission
      : null;
  const stateAnalysis =
    location.state?.analysis && typeof location.state.analysis === "object"
      ? location.state.analysis
      : null;
  const stateAnalysisError =
    typeof location.state?.analysisError === "string" ? location.state.analysisError : "";

  const [submissionMeta, setSubmissionMeta] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(stateAnalysisError);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [itemContext, setItemContext] = useState(null);
  const [isLoadingTaskContext, setIsLoadingTaskContext] = useState(false);
  const [taskContextError, setTaskContextError] = useState("");
  const [activeInlineTooltip, setActiveInlineTooltip] = useState(null);
  const tooltipRef = useRef(null);
  const activeAnchorRef = useRef(null);
  const pointerXRef = useRef(null);
  const tooltipBoundsRef = useRef(null);

  const positionInlineTooltip = useCallback((targetElement, pointerX = null) => {
    if (typeof window === "undefined" || !tooltipRef.current || !targetElement?.getBoundingClientRect) {
      return;
    }

    const anchorRect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const boundsRect = tooltipBoundsRef.current?.getBoundingClientRect?.() || null;
    const position = resolveFloatingTooltipPosition({
      anchorRect,
      pointerX,
      boundsRect,
      tooltipWidth: tooltipRect.width,
      tooltipHeight: tooltipRect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    tooltipRef.current.style.left = `${position.left}px`;
    tooltipRef.current.style.top = `${position.top}px`;
  }, []);

  const handleInlineTooltipEnter = useCallback((event, annotationId, tooltip) => {
    activeAnchorRef.current = event.currentTarget;
    pointerXRef.current = event.clientX;
    setActiveInlineTooltip({
      id: annotationId,
      ...tooltip,
    });
  }, []);

  const handleInlineTooltipMove = useCallback((event) => {
    activeAnchorRef.current = event.currentTarget;
    pointerXRef.current = event.clientX;
    positionInlineTooltip(event.currentTarget, event.clientX);
  }, [positionInlineTooltip]);

  const handleInlineTooltipLeave = useCallback(() => {
    activeAnchorRef.current = null;
    pointerXRef.current = null;
    setActiveInlineTooltip(null);
  }, []);

  useEffect(() => {
    if (!activeInlineTooltip || typeof window === "undefined") {
      return undefined;
    }

    const rafId = window.requestAnimationFrame(() => {
      if (activeAnchorRef.current) {
        positionInlineTooltip(activeAnchorRef.current, pointerXRef.current);
      }
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [activeInlineTooltip, positionInlineTooltip]);

  useEffect(() => {
    if (!config) {
      setSubmissionMeta(null);
      setAnalysis(null);
      setAnalysisError("");
      setItemContext(null);
      setTaskContextError("");
      return;
    }

    const storageSuffix = `attempt:submit:${setId || "unknown"}`;
    const storedSubmission = findStoredObject(config.storagePrefixes, storageSuffix);
    const nextSubmission = stateSubmission || storedSubmission || null;

    const analysisSuffix = `attempt:analysis:${setId || "unknown"}`;
    const storedAnalysis = findStoredObject(config.storagePrefixes, analysisSuffix);
    const nextAnalysis = stateAnalysis || storedAnalysis || null;

    setSubmissionMeta(nextSubmission);
    setAnalysis(nextAnalysis);
    setAnalysisError(stateAnalysisError);
    setItemContext(null);
    setTaskContextError("");
  }, [config, setId, stateAnalysis, stateAnalysisError, stateSubmission]);

  const resolvedAnalysisId = useMemo(() => {
    if (analysisIdFromQuery) {
      return analysisIdFromQuery;
    }

    if (analysis?.id) {
      return normalizeText(analysis.id);
    }

    if (submissionMeta?.analysisId) {
      return normalizeText(submissionMeta.analysisId);
    }

    return "";
  }, [analysis?.id, analysisIdFromQuery, submissionMeta?.analysisId]);

  const resolvedSetId = useMemo(() => {
    if (setId) {
      return setId;
    }

    const fromSubmission = normalizeText(submissionMeta?.setId || submissionMeta?.taskRefId);
    if (fromSubmission) {
      return fromSubmission;
    }

    return normalizeText(analysis?.setId || analysis?.taskRefId);
  }, [analysis?.setId, analysis?.taskRefId, setId, submissionMeta?.setId, submissionMeta?.taskRefId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAnalysisById() {
      if (!config || !resolvedAnalysisId) {
        return;
      }

      const currentAnalysisId = normalizeText(analysis?.id);
      if (currentAnalysisId === resolvedAnalysisId && analysis?.status === "completed") {
        return;
      }

      setIsLoadingAnalysis(true);
      try {
        const response = await apiRequest(
          `${config.analysisApiBasePath}/${encodeURIComponent(resolvedAnalysisId)}`,
        );
        const loadedAnalysis = response?.analysis || null;

        if (!isCancelled) {
          setAnalysis(loadedAnalysis);
          if (loadedAnalysis && typeof loadedAnalysis === "object") {
            const storageKey = `${config.storagePrefixes[0]}:attempt:analysis:${setId || "unknown"}`;
            localStorage.setItem(storageKey, JSON.stringify(loadedAnalysis));
          }
        }
      } catch (error) {
        if (!isCancelled) {
          setAnalysisError(error?.body?.message || error.message || "Failed to load analysis.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingAnalysis(false);
        }
      }
    }

    void loadAnalysisById();

    return () => {
      isCancelled = true;
    };
  }, [analysis?.id, analysis?.status, config, resolvedAnalysisId, setId]);

  useEffect(() => {
    let isCancelled = false;

    async function loadTaskContext() {
      if (!config || !resolvedSetId) {
        return;
      }

      setIsLoadingTaskContext(true);
      try {
        const response = await apiRequest(
          `${config.itemApiBasePath}/${encodeURIComponent(resolvedSetId)}?status=published`,
        );
        if (!isCancelled) {
          setItemContext(response?.item || null);
          setTaskContextError("");
        }
      } catch (error) {
        if (!isCancelled) {
          setTaskContextError(error?.body?.message || error.message || "Failed to load task context.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingTaskContext(false);
        }
      }
    }

    void loadTaskContext();

    return () => {
      isCancelled = true;
    };
  }, [
    analysis?.question,
    analysis?.questionTopic,
    analysis?.visualAsset?.imageId,
    analysis?.visualAsset?.url,
    config,
    resolvedSetId,
    submissionMeta?.question,
    submissionMeta?.questionTopic,
    submissionMeta?.visualAsset?.imageId,
    submissionMeta?.visualAsset?.url,
  ]);

  if (!config) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Result</p>
        <h1 className="text-3xl font-semibold text-slate-900">Result page is not available for this test type.</h1>
      </div>
    );
  }

  const taskQuestionTopic =
    normalizeText(itemContext?.questionTopic)
    || normalizeText(itemContext?.title)
    || normalizeText(submissionMeta?.questionTopic)
    || normalizeText(submissionMeta?.question)
    || normalizeText(analysis?.questionTopic)
    || normalizeText(analysis?.question)
    || normalizeText(submissionMeta?.taskLabel)
    || normalizeText(analysis?.taskLabel);

  const resolvedVisualAsset = (() => {
    const withFallbackUrl = (asset) => {
      const safeAsset = normalizeVisualAsset(asset);
      if (safeAsset.url || !safeAsset.imageId) {
        return safeAsset;
      }

      return {
        ...safeAsset,
        url: `/api/writing-task1/visuals/${encodeURIComponent(safeAsset.imageId)}`,
      };
    };

    const fromSubmission = normalizeVisualAsset(submissionMeta?.visualAsset);
    const fromItemContext = normalizeVisualAsset(itemContext?.visualAsset);
    if (fromItemContext.url || fromItemContext.imageId) {
      return withFallbackUrl(fromItemContext);
    }

    if (fromSubmission.url || fromSubmission.imageId) {
      return withFallbackUrl(fromSubmission);
    }

    const fromAnalysis = normalizeVisualAsset(analysis?.visualAsset);
    if (fromAnalysis.url || fromAnalysis.imageId) {
      return withFallbackUrl(fromAnalysis);
    }

    return withFallbackUrl(null);
  })();
  const taskVisualUrl = resolveVisualUrl(resolvedVisualAsset.url);
  const isTaskContextReady = config.taskType === "writing_task1"
    ? Boolean(taskQuestionTopic && taskVisualUrl)
    : Boolean(taskQuestionTopic);

  const essayText =
    normalizeText(submissionMeta?.essayText)
    || normalizeText(analysis?.essayText)
    || findStoredString(config.storagePrefixes, `attempt:draft:${setId || "unknown"}`);

  const wordsCount = Number.isFinite(Number(submissionMeta?.wordsCount))
    ? Number(submissionMeta.wordsCount)
    : Number.isFinite(Number(analysis?.wordsCount))
      ? Number(analysis.wordsCount)
      : countWords(essayText);

  const timeSpentSeconds = Number.isFinite(Number(submissionMeta?.timeSpentSeconds))
    ? Number(submissionMeta.timeSpentSeconds)
    : Number.isFinite(Number(analysis?.timeSpentSeconds))
      ? Number(analysis.timeSpentSeconds)
      : 0;

  const submittedAtIso =
    toIso(submissionMeta?.submittedAt)
    || toIso(analysis?.submittedAt)
    || toIso(analysis?.createdAt);

  const submittedAtLabel = submittedAtIso ? new Date(submittedAtIso).toLocaleString() : "Unknown time";

  const criteriaRows = config.criteria.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    score: Number.isFinite(Number(analysis?.criteriaScores?.[criterion.key]))
      ? Number(analysis.criteriaScores[criterion.key])
      : null,
    feedback: normalizeText(analysis?.criteriaFeedback?.[criterion.key]),
  }));

  const detections = Array.isArray(analysis?.detections)
    ? analysis.detections
      .map((entry, index) => ({
        id: `${analysis?.id || "analysis"}-detection-${index}`,
        category: normalizeText(entry?.category).toLowerCase() || "grammar",
        label: normalizeText(entry?.label) || "Issue",
        line: normalizeText(entry?.line),
        issue: normalizeText(entry?.issue),
        whyItHurtsBand: normalizeText(entry?.whyItHurtsBand),
        fix: normalizeText(entry?.fix),
        wrongText: normalizeText(entry?.wrongText),
        correctedText: normalizeText(entry?.correctedText),
      }))
      .filter((entry) => entry.issue || entry.fix || entry.wrongText || entry.correctedText)
    : [];

  const inlineAnnotations = buildInlineAnnotations(essayText, detections);
  const essaySegments = buildEssaySegments(essayText, inlineAnnotations);

  const hasAnalysis = Boolean(analysis && typeof analysis === "object");
  const hasCompletedAnalysis = analysis?.status === "completed";
  const criteriaNarrative = criteriaRows.map((criterion) => ({
    key: criterion.key,
    heading: criterion.label,
    score: formatBand(criterion.score),
    body: criterion.feedback || "Detailed feedback is not available for this criterion yet.",
  }));
  const overallNarrative = normalizeText(analysis?.summary) || "Overall summary is not available yet.";

  if (!setId && !resolvedAnalysisId && !hasAnalysis && !submissionMeta) {
    return (
      <div className="space-y-6 rounded-none border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">No Submitted Attempt</p>
        <h1 className="text-2xl font-semibold text-amber-950">Submit an essay first to see this report</h1>
        <p className="text-sm text-amber-800">
          This page needs a saved writing attempt or a valid analysis id.
        </p>
        <div className="pt-2">
          <Link
            className="inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900"
            to={config.backTo}
          >
            Back To Writing
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-none border border-slate-800 bg-slate-950 px-5 py-5 sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-slate-900/90 to-slate-950" />
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full border border-dashed border-emerald-300/25" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full border border-dashed border-cyan-300/20" />

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex items-center gap-2 border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
              to={config.backTo}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {config.backLabel}
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">{config.title}</p>
          </div>

          <div className="grid gap-4">
            <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              <span>Estimated Band</span>
              <span className="emerald-gradient-fill inline-flex items-center rounded-[0.45rem] border border-emerald-300/60 px-4 py-1.5 font-orbitron text-4xl text-white shadow-[0_0_0_1px_rgba(16,185,129,0.3)] sm:text-5xl">
                {formatBand(analysis?.overallBand)}
              </span>
            </h1>

            <div className="grid w-full grid-cols-3 gap-3">
              <article className="flex min-h-[5rem] flex-col justify-between border border-slate-600 bg-slate-900/75 px-4 py-3 text-slate-100">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Words</p>
                <p className="mt-1 text-2xl font-semibold">{wordsCount}</p>
              </article>
              <article className="flex min-h-[5rem] flex-col justify-between border border-slate-600 bg-slate-900/75 px-4 py-3 text-slate-100">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Time Spent</p>
                <p className="mt-1 text-2xl font-semibold">{formatTimeSpent(timeSpentSeconds)}</p>
              </article>
              <article className="flex min-h-[5rem] flex-col justify-between border border-slate-600 bg-slate-900/75 px-4 py-3 text-slate-100">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Submitted</p>
                <p className="mt-1 text-2xl font-semibold">{submittedAtLabel}</p>
              </article>
            </div>
          </div>
        </div>
      </header>

      <section className="space-y-4 rounded-none border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Task Context
          </p>
          {isLoadingTaskContext ? (
            <SkeletonText className="w-48" lines={1} widths={["100%"]} />
          ) : null}
        </div>

        <article className="space-y-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Question Topic
          </p>
          <p className="whitespace-pre-wrap text-base leading-7 text-slate-900">
            {taskQuestionTopic || "Original question topic is unavailable for this attempt."}
          </p>
        </article>

        {config.taskType === "writing_task1" ? (
          <article className="space-y-2">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Original Graph / Visual
            </p>
            <div className="min-h-[220px] border border-slate-200 bg-slate-50 p-3">
              {taskVisualUrl ? (
                <img
                  alt="Original Writing Task 1 visual"
                  className="h-full max-h-[620px] w-full object-contain"
                  src={taskVisualUrl}
                />
              ) : (
                <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-slate-500">
                  Original graph image is unavailable.
                </div>
              )}
            </div>
          </article>
        ) : null}

        {taskContextError && !isTaskContextReady ? (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {taskContextError}
          </p>
        ) : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,0.95fr)]">
        <section ref={tooltipBoundsRef} className="space-y-4 rounded-none border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Essay With Inline Feedback
            </p>
            <div className="flex flex-wrap gap-2">
              {LEGEND_ORDER.map((category) => {
                const theme = resolveIssueTheme(category);
                return (
                  <span
                    key={`legend-${category}`}
                    className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${theme.badgeClass}`}
                  >
                    {theme.label}
                  </span>
                );
              })}
            </div>
          </div>

          <article>
            <p className="whitespace-pre-wrap break-words text-justify text-[1.02rem] leading-8 text-slate-800">
              {essaySegments.length > 0
                ? essaySegments.map((segment, index) => {
                  if (segment.kind === "plain") {
                    return <span key={`essay-plain-${index}`}>{segment.text}</span>;
                  }

                  const detection = segment.annotation.detection;
                  const theme = resolveIssueTheme(detection.category);
                  const tooltip = buildTooltipPayload(detection);

                  return (
                    <span
                      key={segment.annotation.id}
                      className={`cursor-pointer rounded-[2px] px-0.5 underline decoration-2 underline-offset-4 ${theme.highlightClass}`}
                      onPointerEnter={(event) => handleInlineTooltipEnter(event, segment.annotation.id, tooltip)}
                      onPointerMove={handleInlineTooltipMove}
                      onPointerLeave={handleInlineTooltipLeave}
                    >
                      {segment.text}
                    </span>
                  );
                })
                : "Essay text is unavailable for this attempt."}
            </p>
          </article>
          {activeInlineTooltip ? (
            <div
              ref={tooltipRef}
              className="pointer-events-none fixed z-40 w-[min(20rem,80vw)] rounded-md border border-slate-200 bg-white px-3 py-2 text-left shadow-xl"
              role="tooltip"
              style={{ left: -9999, top: -9999 }}
            >
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {activeInlineTooltip.title}
              </p>
              {activeInlineTooltip.explanation ? (
                <p className="mt-1 text-xs leading-5 text-slate-700">{activeInlineTooltip.explanation}</p>
              ) : null}
              {activeInlineTooltip.suggestion ? (
                <p className="mt-1 text-xs leading-5 text-emerald-700">{activeInlineTooltip.suggestion}</p>
              ) : null}
            </div>
          ) : null}

          {essayText && inlineAnnotations.length === 0 && hasCompletedAnalysis ? (
            <p className="text-xs text-slate-500">
              Inline markers are unavailable for this essay. Detailed feedback is listed in the right panel.
            </p>
          ) : null}
        </section>

        <aside className="space-y-4 rounded-none border border-slate-200 bg-white p-5 text-slate-900 sm:p-6 xl:sticky xl:top-24 xl:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">AI Analysis</p>

          {isLoadingAnalysis ? (
            <SkeletonText lines={5} widths={["90%", "72%", "84%", "64%", "48%"]} />
          ) : null}

          {analysisError ? (
            <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {analysisError}
            </p>
          ) : null}

          {analysis?.status === "failed" && analysis?.failureReason ? (
            <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {analysis.failureReason}
            </p>
          ) : null}

          {!isLoadingAnalysis && !hasAnalysis ? (
            <p className="text-sm text-slate-600">
              Analysis is not available yet for this submission.
            </p>
          ) : null}

          {hasCompletedAnalysis ? (
            <div className="space-y-4">
              {criteriaNarrative.map((criterion) => (
                <section key={criterion.key}>
                  <p className=" text-justify text-[.9rem] leading-normal text-slate-800">
                    <span className=" font-semibold leading-relaxed text-black">{criterion.heading}: {criterion.score}.</span> {criterion.body}
                  </p>
                </section>
              ))}

              <section>
                <p className="mt-2 text-justify text-[.9rem] leading-relaxed text-slate-800">
                  <span className=" font-semibold leading-relaxed text-black">Overall: {formatBand(analysis?.overallBand)}. </span>{overallNarrative}
                </p>
              </section>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default StudentWritingTask2ResultPage;
