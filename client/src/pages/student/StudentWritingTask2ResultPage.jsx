import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";

const MINIMUM_WORDS = 250;

const FALLBACK_PATTERNS = [
  {
    regex: /\bpeople is\b/gi,
    label: "Grammar",
    issue: "Subject-verb agreement issue.",
    correctedText: "people are",
    fix: "Use plural verb with 'people'.",
  },
  {
    regex: /\bthere is many\b/gi,
    label: "Grammar",
    issue: "Plural noun with singular verb.",
    correctedText: "there are many",
    fix: "Use 'are' for plural noun phrase.",
  },
  {
    regex: /\bmany informations\b/gi,
    label: "Vocabulary",
    issue: "Uncountable noun form.",
    correctedText: "much information",
    fix: "Use uncountable noun correctly.",
  },
  {
    regex: /\bto work overtime to be able to\b/gi,
    label: "Repetition",
    issue: "Infinitive chain sounds repetitive.",
    correctedText: "to work overtime and",
    fix: "Reduce repeated 'to ... to'.",
  },
  {
    regex: /\bhowever, these\b/gi,
    label: "Coherence",
    issue: "Reference is vague here.",
    correctedText: "however, these factors",
    fix: "Clarify what 'these' refers to.",
  },
  {
    regex: /\blonger working hours is\b/gi,
    label: "Grammar",
    issue: "Subject-verb agreement in conclusion.",
    correctedText: "longer working hours are",
    fix: "Use plural verb 'are'.",
  },
];

function countWords(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
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

function readDraftText(storageKey) {
  if (typeof window === "undefined") {
    return "";
  }

  const draftValue = localStorage.getItem(storageKey);
  return typeof draftValue === "string" ? draftValue : "";
}

function normalizeDetections(rawDetections) {
  if (!Array.isArray(rawDetections)) {
    return [];
  }

  return rawDetections
    .map((item) => ({
      label: String(item?.label || "").trim() || "Grammar",
      line: String(item?.line || "").trim() || "",
      issue: String(item?.issue || "").trim() || "",
      fix: String(item?.fix || "").trim() || "",
      wrongText: String(item?.wrongText || "").trim() || "",
      correctedText: String(item?.correctedText || "").trim() || "",
    }))
    .filter((item) => item.issue || item.wrongText || item.fix)
    .slice(0, 6);
}

function buildFallbackFeedback({ essayText, wordsCount, timeSpentSeconds }) {
  const paragraphCount = essayText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean).length;
  const connectorsCount = (
    essayText.match(/\bhowever\b|\btherefore\b|\bmoreover\b|\bon the other hand\b|\bin conclusion\b/gi) || []
  ).length;

  let band = 4.5;
  if (wordsCount >= MINIMUM_WORDS) {
    band += 0.8;
  }
  if (paragraphCount >= 3) {
    band += 0.4;
  }
  if (connectorsCount >= 3) {
    band += 0.3;
  }
  if (timeSpentSeconds < 10 * 60) {
    band -= 0.3;
  }

  const detections = [];
  const paragraphs = essayText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph, paragraphIndex) => {
    if (detections.length >= 6) {
      return;
    }

    FALLBACK_PATTERNS.forEach((pattern) => {
      if (detections.length >= 6) {
        return;
      }

      pattern.regex.lastIndex = 0;
      const match = pattern.regex.exec(paragraph);
      if (!match) {
        return;
      }

      detections.push({
        label: pattern.label,
        line: `Line ${paragraphIndex + 1}`,
        issue: pattern.issue,
        fix: pattern.fix,
        wrongText: match[0],
        correctedText: pattern.correctedText,
      });
    });
  });

  return {
    overallBand: clamp(roundToHalf(band), 4, 8),
    summary:
      "Band estimate is generated from structure, word count, and language control. Improve precision in grammar and avoid repetitive phrasing for a higher score.",
    strengths: [
      "Response is relevant to the essay prompt.",
      "Main viewpoint is generally clear.",
    ],
    weaknesses: [
      wordsCount < MINIMUM_WORDS
        ? `Increase length by at least ${MINIMUM_WORDS - wordsCount} words.`
        : "Develop ideas with more specific evidence.",
      "Improve grammar control in longer clauses.",
      "Use clearer referencing words for cohesion.",
    ],
    detections,
  };
}

function extractLineNumber(lineLabel) {
  const matched = String(lineLabel || "").match(/(\d+)/);
  if (!matched) {
    return null;
  }

  const parsed = Number.parseInt(matched[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getUnderlineClass(label) {
  const normalized = String(label || "").toLowerCase();

  if (normalized.includes("repetition") || normalized.includes("style")) {
    return "underline decoration-amber-500 decoration-2 underline-offset-4";
  }

  if (normalized.includes("coherence") || normalized.includes("reference")) {
    return "underline decoration-sky-500 decoration-2 underline-offset-4";
  }

  if (normalized.includes("grammar")) {
    return "underline decoration-rose-500 decoration-2 underline-offset-4";
  }

  if (normalized.includes("vocabulary") || normalized.includes("lexical")) {
    return "underline decoration-violet-500 decoration-2 underline-offset-4";
  }

  return "underline decoration-slate-400 decoration-2 underline-offset-4";
}

function renderHighlightedParagraph(paragraph, paragraphDetections, paragraphIndex) {
  if (!paragraphDetections.length) {
    return paragraph;
  }

  const matches = [];

  paragraphDetections.forEach((detection, detectionIndex) => {
    const wrongText = String(detection.wrongText || "").trim();
    if (!wrongText) {
      return;
    }

    const lineNumber = extractLineNumber(detection.line);
    if (lineNumber && lineNumber !== paragraphIndex + 1) {
      return;
    }

    const regex = new RegExp(escapeRegExp(wrongText), "i");
    const match = regex.exec(paragraph);
    if (!match) {
      return;
    }

    matches.push({
      detection,
      detectionIndex,
      start: match.index,
      end: match.index + match[0].length,
    });
  });

  if (!matches.length) {
    return paragraph;
  }

  const sorted = matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const nonOverlapping = [];

  sorted.forEach((match) => {
    const hasOverlap = nonOverlapping.some(
      (saved) => !(match.end <= saved.start || match.start >= saved.end),
    );
    if (!hasOverlap) {
      nonOverlapping.push(match);
    }
  });

  if (!nonOverlapping.length) {
    return paragraph;
  }

  const parts = [];
  let cursor = 0;

  nonOverlapping.forEach((match, index) => {
    if (match.start > cursor) {
      parts.push(
        <span key={`text-${paragraphIndex}-${index}-${cursor}`}>
          {paragraph.slice(cursor, match.start)}
        </span>,
      );
    }

    parts.push(
      <span
        key={`wrong-${paragraphIndex}-${match.detectionIndex}-${match.start}`}
        className={getUnderlineClass(match.detection.label)}
      >
        {paragraph.slice(match.start, match.end)}
      </span>,
    );

    if (match.detection.correctedText) {
      parts.push(
        <span
          key={`fix-${paragraphIndex}-${match.detectionIndex}-${match.end}`}
          className="font-semibold text-emerald-500"
        >
          {" "}
          ({match.detection.correctedText})
        </span>,
      );
    }

    cursor = match.end;
  });

  if (cursor < paragraph.length) {
    parts.push(<span key={`tail-${paragraphIndex}-${cursor}`}>{paragraph.slice(cursor)}</span>);
  }

  return parts;
}

function StudentWritingTask2ResultPage() {
  const { testId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const setId = String(searchParams.get("set") || "").trim();

  const draftStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:draft:${setId || "unknown"}`,
    [setId],
  );
  const submitStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:submit:${setId || "unknown"}`,
    [setId],
  );
  const analysisStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:analysis:${setId || "unknown"}`,
    [setId],
  );

  const submissionMeta = useMemo(() => {
    const stateSubmission = location.state?.submission;
    if (stateSubmission && typeof stateSubmission === "object") {
      return stateSubmission;
    }

    return readStoredObject(submitStorageKey);
  }, [location.state, submitStorageKey]);

  const [analysis, setAnalysis] = useState(() => {
    const stateAnalysis = location.state?.analysis;
    if (stateAnalysis && typeof stateAnalysis === "object") {
      return stateAnalysis;
    }

    return readStoredObject(analysisStorageKey);
  });
  const [analysisError, setAnalysisError] = useState(() =>
    typeof location.state?.analysisError === "string" ? location.state.analysisError : "",
  );
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadAnalysisById() {
      if (analysis || !submissionMeta?.analysisId) {
        return;
      }

      setIsLoadingAnalysis(true);
      try {
        const response = await apiRequest(
          `/writing-task2-opinion/analyses/${encodeURIComponent(submissionMeta.analysisId)}`,
          { auth: false },
        );
        const loadedAnalysis = response?.analysis || null;
        if (!isCancelled) {
          setAnalysis(loadedAnalysis);
          if (loadedAnalysis) {
            localStorage.setItem(analysisStorageKey, JSON.stringify(loadedAnalysis));
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

    loadAnalysisById();

    return () => {
      isCancelled = true;
    };
  }, [analysis, analysisStorageKey, submissionMeta?.analysisId]);

  const essayText = useMemo(() => {
    const essayFromSubmission =
      submissionMeta && typeof submissionMeta.essayText === "string" ? submissionMeta.essayText : "";
    if (essayFromSubmission.trim()) {
      return essayFromSubmission;
    }

    return readDraftText(draftStorageKey);
  }, [draftStorageKey, submissionMeta]);

  const wordsCount =
    Number.isFinite(Number(submissionMeta?.wordsCount)) && Number(submissionMeta?.wordsCount) >= 0
      ? Number(submissionMeta.wordsCount)
      : countWords(essayText);
  const timeSpentSeconds = Number.isFinite(Number(submissionMeta?.timeSpentSeconds))
    ? Number(submissionMeta.timeSpentSeconds)
    : 0;
  const submittedAtLabel = submissionMeta?.submittedAt
    ? new Date(submissionMeta.submittedAt).toLocaleString()
    : "Unknown time";

  const fallbackFeedback = useMemo(
    () =>
      buildFallbackFeedback({
        essayText,
        wordsCount,
        timeSpentSeconds,
      }),
    [essayText, timeSpentSeconds, wordsCount],
  );

  const hasCompletedAnalysis = analysis?.status === "completed";
  const aiDetections = hasCompletedAnalysis
    ? normalizeDetections(analysis?.detections)
    : fallbackFeedback.detections;
  const displayBand = hasCompletedAnalysis
    ? clamp(roundToHalf(Number(analysis?.overallBand) || fallbackFeedback.overallBand), 0, 9)
    : fallbackFeedback.overallBand;
  const displaySummary = hasCompletedAnalysis
    ? String(analysis?.summary || "").trim() || fallbackFeedback.summary
    : fallbackFeedback.summary;

  const essayParagraphs = useMemo(() => {
    const paragraphs = essayText
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    if (paragraphs.length > 0) {
      return paragraphs;
    }

    const oneLineFallback = essayText.trim();
    return oneLineFallback ? [oneLineFallback] : [];
  }, [essayText]);

  if (testId !== "writingTask2-opinion") {
    return (
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">Result</p>
        <h1 className="text-3xl font-semibold text-slate-900">Result page is only available for Writing Task 2</h1>
      </div>
    );
  }

  if (!setId || !submissionMeta) {
    return (
      <div className="space-y-6 rounded-none border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">No Submitted Attempt</p>
        <h1 className="text-2xl font-semibold text-amber-950">Submit an essay first to see this page</h1>
        <p className="text-sm text-amber-800">
          This report page needs a submitted attempt. Start a set, write your essay, and check it.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            className="inline-flex items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-900"
            to="/student/tests/writingTask2-opinion"
          >
            Back To Sets
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

        <div className="relative z-10 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex items-center gap-2 border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-300 hover:text-cyan-200"
              to="/student/tests/writingTask2-opinion"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Writing Sets
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Writing Task 2 Report</p>
          </div>

          <div className="grid gap-4">
            <h1 className="flex flex-wrap items-center gap-3 text-4xl font-semibold leading-tight text-white sm:text-5xl">
              <span>Estimated Band</span>
              <span className="emerald-gradient-fill inline-flex items-center rounded-[0.45rem] border border-emerald-300/60 px-4 py-1.5 font-orbitron text-4xl text-white shadow-[0_0_0_1px_rgba(16,185,129,0.3)] sm:text-5xl">
                {displayBand.toFixed(1)}
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

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <section className="rounded-none border border-slate-200/80 bg-white/95 p-5 sm:p-6">
          <div className="grid gap-2 text-xs font-semibold uppercase tracking-[0.12em] sm:grid-cols-3">
            <p>
              <mark className="rounded-[0.2rem] bg-rose-100 px-2 py-0.5 text-rose-700">Grammar Accuracy</mark>
            </p>
            <p>
              <mark className="rounded-[0.2rem] bg-amber-100 px-2 py-0.5 text-amber-700">Repetition / Style</mark>
            </p>
            <p>
              <mark className="rounded-[0.2rem] bg-sky-100 px-2 py-0.5 text-sky-700">Coherence / Reference</mark>
            </p>
          </div>

          {essayParagraphs.length ? (
            <div className="mt-6 space-y-4 border border-slate-200 bg-slate-50 p-4 py-5 sm:p-5">
              {essayParagraphs.map((paragraph, paragraphIndex) => (
                <p key={`essay-paragraph-${paragraphIndex}`} className="text-[1.02rem] leading-8 text-slate-800">
                  {renderHighlightedParagraph(paragraph, aiDetections, paragraphIndex)}
                </p>
              ))}
            </div>
          ) : (
            <div className="mt-4 border border-slate-200 bg-slate-50 p-4 text-slate-600">
              No essay text found.
            </div>
          )}
        </section>

        <aside className="border border-slate-200 bg-white p-4 text-slate-900 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.35)] xl:sticky xl:top-24 xl:self-start sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">AI SCORE ANALYSES</p>

          <div className="mt-4 rounded-[0.5rem] border border-slate-200 bg-white px-3.5 py-3 text-sm leading-7 text-slate-700">
            {isLoadingAnalysis ? (
              <p className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking essay with AI...
              </p>
            ) : null}

            {analysisError ? (
              <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {analysisError}
              </p>
            ) : null}

            {analysis?.status === "failed" && analysis?.failureReason ? (
              <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {analysis.failureReason}
              </p>
            ) : null}

            <p className="text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-slate-500">AI Summary</p>
            <p className="mt-1.5">
              <strong>Band estimate: {displayBand.toFixed(1)}.</strong> {displaySummary}
            </p>

            {aiDetections.length ? (
              <>
                <p className="mt-4 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Detected By AI
                </p>
                <div className="mt-1.5 space-y-2.5">
                  {aiDetections.map((note, index) => (
                    <p key={`ai-note-${index}`}>
                      <strong>{note.label}</strong>
                      {note.line ? ` (${note.line})` : ""}: {note.issue}{" "}
                      {note.fix ? (
                        <>
                          <strong>Fix:</strong> {note.fix}
                        </>
                      ) : null}
                    </p>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default StudentWritingTask2ResultPage;
