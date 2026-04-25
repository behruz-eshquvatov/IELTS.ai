import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ShieldBan, X } from "lucide-react";
import WritingAttemptTimerCard from "../../components/student/WritingAttemptTimerCard";
import { apiRequest } from "../../lib/apiClient";
import ExamPopup from "../../components/student/exam/ExamPopup";
import ExamLeaveWarningModal from "../../components/student/exam/ExamLeaveWarningModal";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useExamCopyBlocker from "../../hooks/useExamCopyBlocker";
import useExamLeaveProtection from "../../hooks/useExamLeaveProtection";

const DEFAULT_DURATION_SECONDS = 40 * 60;
const FALLBACK_MINIMUM_WORDS = 250;
const START_COUNTDOWN_SECONDS = 3;

function countWords(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function parseDurationSecondsFromItem(item) {
  const explicitMinutesCandidates = [
    item?.durationMinutes,
    item?.timeLimitMinutes,
    item?.instruction?.durationMinutes,
    item?.instruction?.timeLimitMinutes,
  ];

  for (const candidate of explicitMinutesCandidates) {
    const parsed = Number.parseInt(String(candidate ?? ""), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed * 60;
    }
  }

  const combinedText = `${normalizeText(item?.instruction?.text)} ${normalizeText(
    item?.questionTopic,
  )}`;
  const minuteMatch = combinedText.match(/(\d+)\s*minutes?/i);
  const parsedFromText = Number.parseInt(minuteMatch?.[1] ?? "", 10);
  if (Number.isFinite(parsedFromText) && parsedFromText > 0) {
    return parsedFromText * 60;
  }

  return DEFAULT_DURATION_SECONDS;
}

function resolveMinimumWords(item) {
  const parsed = Number.parseInt(String(item?.instruction?.minWords ?? ""), 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return FALLBACK_MINIMUM_WORDS;
}

function toReadableLabel(value) {
  return normalizeText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readSubmissionMeta(storageKey) {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSubmission = localStorage.getItem(storageKey);
  if (!rawSubmission) {
    return null;
  }

  try {
    const parsedSubmission = JSON.parse(rawSubmission);
    return parsedSubmission && typeof parsedSubmission === "object" ? parsedSubmission : null;
  } catch {
    return null;
  }
}

function StudentWritingTask2TaskPage() {
  const navigate = useNavigate();
  const { itemId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const safeItemId = normalizeText(itemId);
  const isDailyMode = String(searchParams.get("mode") || "").trim().toLowerCase() === "daily";
  const attemptCategory = isDailyMode ? "daily" : "additional";
  const sourceType = isDailyMode ? "daily_unit" : "writing_task2_extra";

  const feedbackPagePath = useMemo(
    () =>
      `/student/tests/writingTask2/result${
        safeItemId ? `?set=${encodeURIComponent(safeItemId)}` : ""
      }`,
    [safeItemId],
  );

  const attemptStartStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:start:${safeItemId || "unknown"}`,
    [safeItemId],
  );
  const draftStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:draft:${safeItemId || "unknown"}`,
    [safeItemId],
  );
  const submitStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:submit:${safeItemId || "unknown"}`,
    [safeItemId],
  );
  const analysisStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:analysis:${safeItemId || "unknown"}`,
    [safeItemId],
  );

  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [essayText, setEssayText] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION_SECONDS);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_DURATION_SECONDS);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [submissionMeta, setSubmissionMeta] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmissionHydrated, setIsSubmissionHydrated] = useState(false);
  const [isAttemptStarted, setIsAttemptStarted] = useState(false);
  const [isCheckingEssay, setIsCheckingEssay] = useState(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [resultPayload, setResultPayload] = useState(null);
  const [isRouteLeaveSubmitting, setIsRouteLeaveSubmitting] = useState(false);
  const [shouldProceedAfterResult, setShouldProceedAfterResult] = useState(false);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);
  const countdownIntervalRef = useRef(null);

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      clearCountdownInterval();
    },
    [clearCountdownInterval],
  );

  useEffect(() => {
    if (!safeItemId) {
      return;
    }

    setIsDraftHydrated(false);
    const savedDraft = localStorage.getItem(draftStorageKey);
    setEssayText(typeof savedDraft === "string" ? savedDraft : "");
    setIsDraftHydrated(true);
  }, [draftStorageKey, safeItemId]);

  useEffect(() => {
    if (!safeItemId || !isDraftHydrated || isSubmitted) {
      return;
    }

    localStorage.setItem(draftStorageKey, essayText);
  }, [draftStorageKey, essayText, isDraftHydrated, isSubmitted, safeItemId]);

  useEffect(() => {
    if (!safeItemId) {
      return;
    }

    setIsSubmissionHydrated(false);
    const parsedSubmission = readSubmissionMeta(submitStorageKey);
    setIsSubmitted(Boolean(parsedSubmission));
    setSubmissionMeta(parsedSubmission);
    setResultPayload(
      parsedSubmission
        ? {
          submission: parsedSubmission,
          analysis: readSubmissionMeta(analysisStorageKey) || null,
          analysisError: "",
        }
        : null,
    );
    setIsResultModalOpen(Boolean(parsedSubmission));

    if (parsedSubmission) {
      const submittedRemaining = Number.parseInt(
        String(parsedSubmission.remainingSecondsAtSubmit ?? ""),
        10,
      );
      setRemainingSeconds(
        Number.isFinite(submittedRemaining) && submittedRemaining >= 0 ? submittedRemaining : 0,
      );
    }

    setIsSubmissionHydrated(true);
  }, [analysisStorageKey, safeItemId, submitStorageKey]);

  useEffect(() => {
    if (!safeItemId || isSubmitted) {
      setIsAttemptStarted(false);
      return;
    }

    const startedAtRaw = localStorage.getItem(attemptStartStorageKey);
    const startedAt = Number.parseInt(startedAtRaw || "", 10);
    setIsAttemptStarted(Number.isFinite(startedAt) && startedAt > 0);
  }, [attemptStartStorageKey, isSubmitted, safeItemId]);

  useEffect(() => {
    let isMounted = true;

    async function loadItem() {
      if (!safeItemId) {
        setError("Task id is missing.");
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const response = await apiRequest(
          `/writing-task2/items/${encodeURIComponent(safeItemId)}?status=published`,
        );

        if (!isMounted) {
          return;
        }

        const nextItem = response?.item || null;
        const progressStatus = normalizeText(nextItem?.progressStatus || nextItem?.progression?.status)
          .toLowerCase();
        if (!isDailyMode && progressStatus === "locked") {
          setItem(null);
          setError("This task is locked. Complete the previous additional task first.");
          return;
        }

        setItem(nextItem);
        setDurationSeconds(parseDurationSecondsFromItem(nextItem));
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load Writing Task 2 task.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItem();

    return () => {
      isMounted = false;
    };
  }, [isDailyMode, safeItemId]);

  useEffect(() => {
    if (!safeItemId || isSubmitted || !isSubmissionHydrated || !isAttemptStarted) {
      return undefined;
    }

    const startedAtRaw = localStorage.getItem(attemptStartStorageKey);
    let startedAt = Number.parseInt(startedAtRaw || "", 10);

    if (!Number.isFinite(startedAt) || startedAt <= 0) {
      startedAt = Date.now();
      localStorage.setItem(attemptStartStorageKey, String(startedAt));
    }

    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const nextRemainingSeconds = Math.max(durationSeconds - elapsedSeconds, 0);
      setRemainingSeconds(nextRemainingSeconds);
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, [attemptStartStorageKey, durationSeconds, isAttemptStarted, isSubmissionHydrated, isSubmitted, safeItemId]);

  useEffect(() => {
    if (isSubmitted || isAttemptStarted) {
      return;
    }

    setRemainingSeconds(durationSeconds);
  }, [durationSeconds, isAttemptStarted, isSubmitted]);

  const minimumWords = useMemo(() => resolveMinimumWords(item), [item]);
  const wordsCount = useMemo(() => countWords(essayText), [essayText]);
  const isTimeOver = remainingSeconds <= 0;
  const wordsGuideText =
    wordsCount >= minimumWords
      ? "Minimum reached. Keep improving argument quality."
      : `Target at least ${minimumWords} words.`;
  const isStartGateModalOpen =
    !isSubmitted && !isAttemptStarted && isSubmissionHydrated && !isLoading && !error && item;

  useBodyScrollLock(isStartGateModalOpen);

  const buildSubmissionPayload = useCallback(
    (source) => {
      const submittedAt = new Date().toISOString();
      const question = normalizeText(item?.questionTopic) || "Question not available.";
      const instructionText =
        normalizeText(item?.instruction?.text) || `Write at least ${minimumWords} words.`;

      return {
        setId: safeItemId,
        taskType: "writing_task2",
        attemptCategory,
        sourceType,
        source,
        submittedAt,
        wordsCount,
        essayText,
        question,
        questionTopic: question,
        questionMeta: [
          instructionText,
          `Minimum words: ${minimumWords}`,
          `Essay type: ${toReadableLabel(item?.essayType || "unknown")}`,
        ],
        durationSeconds,
        remainingSecondsAtSubmit: remainingSeconds,
        timeSpentSeconds: Math.max(durationSeconds - remainingSeconds, 0),
      };
    },
    [
      attemptCategory,
      durationSeconds,
      essayText,
      item?.essayType,
      item?.instruction?.text,
      item?.questionTopic,
      minimumWords,
      remainingSeconds,
      safeItemId,
      sourceType,
      wordsCount,
    ],
  );

  const persistDailyTaskAttempt = useCallback((
    submissionPayload,
    analysisPayload = null,
    analysisErrorMessage = "",
  ) => {
    if (!safeItemId) {
      return;
    }

    const source = normalizeText(submissionPayload?.source).toLowerCase() || "manual";
    const autoSubmitReasonBySource = {
      auto: "Timer finished. Task auto-submitted.",
      "focus-lost": "You switched tab or browser. Task auto-submitted.",
      "page-hide": "You refreshed or left the page. Task auto-submitted.",
      "leave-page": "You chose to leave the page. Task auto-submitted.",
    };
    const resolvedBand = Number(analysisPayload?.overallBand);

    void apiRequest("/students/me/daily-tasks/attempts", {
      method: "POST",
      body: {
        taskType: "writing_task2",
        taskRefId: safeItemId,
        attemptCategory,
        sourceType,
        taskLabel: normalizeText(item?.questionTopic) || safeItemId,
        submitReason: source || "manual",
        forceReason: autoSubmitReasonBySource[source] || "",
        isAutoSubmitted: source !== "manual",
        submittedAt: submissionPayload?.submittedAt || new Date().toISOString(),
        totalTimeSpentSeconds: Math.max(0, Number(submissionPayload?.timeSpentSeconds) || 0),
        score: {
          band: Number.isFinite(resolvedBand) ? resolvedBand : null,
        },
        payload: {
          submission: submissionPayload,
          analysis: analysisPayload,
          analysisError: normalizeText(analysisErrorMessage),
        },
        sourceRefs: {
          writingTask2AnalysisId: normalizeText(analysisPayload?.id),
        },
      },
    }).catch(() => {
      // Do not block writing flow if completion sync fails.
    });
  }, [attemptCategory, item?.questionTopic, safeItemId, sourceType]);

  const handleSubmitAttempt = useCallback(
    async (source, options = {}) => {
      if (isSubmitted || !safeItemId || isCheckingEssay || !item) {
        return;
      }

      if (source !== "leave-page") {
        setShouldProceedAfterResult(false);
      }

      setIsCheckingEssay(true);
      const payload = buildSubmissionPayload(source);

      localStorage.setItem(submitStorageKey, JSON.stringify(payload));
      localStorage.removeItem(attemptStartStorageKey);
      setSubmissionMeta(payload);
      setIsSubmitted(true);
      setIsAttemptStarted(false);

      let analysis = null;
      let analysisError = "";

      try {
        const response = await apiRequest("/writing-task2/analyses", {
          method: "POST",
          body: payload,
        });
        analysis = response?.analysis ?? null;
      } catch (nextError) {
        analysis = nextError?.body?.analysis ?? null;
        analysisError =
          nextError?.body?.message || nextError.message || "AI analysis request failed.";
      } finally {
        if (analysis && typeof analysis === "object") {
          localStorage.setItem(analysisStorageKey, JSON.stringify(analysis));
        }
        setIsCheckingEssay(false);
      }

      const submissionWithAnalysisId =
        analysis && typeof analysis === "object" && analysis.id
          ? { ...payload, analysisId: analysis.id }
          : payload;

      localStorage.setItem(submitStorageKey, JSON.stringify(submissionWithAnalysisId));
      setSubmissionMeta(submissionWithAnalysisId);
      const nextResultPayload = {
        submission: submissionWithAnalysisId,
        analysis,
        analysisError: analysisError || "",
      };
      setResultPayload(nextResultPayload);
      setIsResultModalOpen(true);
      persistDailyTaskAttempt(submissionWithAnalysisId, analysis, analysisError);

      if (options.navigateAfterSubmit) {
        navigate(feedbackPagePath, {
          replace: true,
          state: {
            submission: submissionWithAnalysisId,
            analysis,
            analysisError: analysisError || undefined,
          },
        });
      }
    },
    [
      analysisStorageKey,
      attemptStartStorageKey,
      feedbackPagePath,
      buildSubmissionPayload,
      isCheckingEssay,
      isSubmitted,
      item,
      navigate,
      persistDailyTaskAttempt,
      safeItemId,
      submitStorageKey,
    ],
  );

  const handleStartAttempt = useCallback(() => {
    if (!safeItemId || isSubmitted || isAttemptStarted) {
      return;
    }

    clearCountdownInterval();
    setIsCountdownRunning(false);
    setCountdownValue(null);
    const startedAt = Date.now();
    localStorage.setItem(attemptStartStorageKey, String(startedAt));
    setIsResultModalOpen(false);
    setResultPayload(null);
    setShouldProceedAfterResult(false);
    setIsRouteLeaveSubmitting(false);
    setIsAttemptStarted(true);
  }, [attemptStartStorageKey, clearCountdownInterval, isAttemptStarted, isSubmitted, safeItemId]);

  const handleUnderstandStart = useCallback(() => {
    if (isCountdownRunning || !item || isSubmitted || isAttemptStarted) {
      return;
    }

    setIsCountdownRunning(true);
    setCountdownValue(START_COUNTDOWN_SECONDS);

    clearCountdownInterval();
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownValue((previousValue) => {
        if (previousValue === null) {
          return null;
        }

        if (previousValue <= 1) {
          clearCountdownInterval();
          setIsCountdownRunning(false);
          setCountdownValue(null);
          handleStartAttempt();
          return null;
        }

        return previousValue - 1;
      });
    }, 1000);
  }, [
    clearCountdownInterval,
    handleStartAttempt,
    isAttemptStarted,
    isCountdownRunning,
    isSubmitted,
    item,
  ]);

  const handleStartOverlayClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/student/tests/writingTask2");
  }, [navigate]);

  useEffect(() => {
    if (!isSubmitted && remainingSeconds <= 0) {
      handleSubmitAttempt("auto");
    }
  }, [handleSubmitAttempt, isSubmitted, remainingSeconds]);

  const isExamSessionActive = isAttemptStarted && !isSubmitted && !isCheckingEssay;
  const persistBeforeUnloadSubmission = useCallback(() => {
    if (!isExamSessionActive || !item || !safeItemId) {
      return;
    }

    const payload = buildSubmissionPayload("before-unload");
    localStorage.setItem(submitStorageKey, JSON.stringify(payload));
    localStorage.removeItem(attemptStartStorageKey);
  }, [attemptStartStorageKey, buildSubmissionPayload, isExamSessionActive, item, safeItemId, submitStorageKey]);
  const leaveProtection = useExamLeaveProtection({
    isEnabled: isExamSessionActive,
    onBeforeUnload: persistBeforeUnloadSubmission,
  });
  useExamCopyBlocker(isExamSessionActive);

  useEffect(() => {
    if (isSubmitted || !isAttemptStarted) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleSubmitAttempt("focus-lost");
      }
    };

    const handlePageHide = () => {
      handleSubmitAttempt("page-hide");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [handleSubmitAttempt, isAttemptStarted, isSubmitted]);

  const handleStayOnExamPage = useCallback(() => {
    setIsRouteLeaveSubmitting(false);
    setShouldProceedAfterResult(false);
    leaveProtection.cancelNavigation();
  }, [leaveProtection]);

  const handleConfirmLeavePage = useCallback(async () => {
    if (isRouteLeaveSubmitting) {
      return;
    }

    setIsRouteLeaveSubmitting(true);
    leaveProtection.hideWarning();
    setShouldProceedAfterResult(true);
    await handleSubmitAttempt("leave-page");

    const persistedSubmission = readSubmissionMeta(submitStorageKey);
    if (!persistedSubmission) {
      setShouldProceedAfterResult(false);
      leaveProtection.cancelNavigation();
    }

    setIsRouteLeaveSubmitting(false);
  }, [handleSubmitAttempt, isRouteLeaveSubmitting, leaveProtection, submitStorageKey]);

  const handleOpenFeedback = useCallback(() => {
    if (!resultPayload?.submission) {
      return;
    }

    navigate(feedbackPagePath, {
      replace: true,
      state: {
        submission: resultPayload.submission,
        analysis: resultPayload.analysis || undefined,
        analysisError: resultPayload.analysisError || undefined,
      },
    });
  }, [feedbackPagePath, navigate, resultPayload]);

  const handleResultPrimaryAction = useCallback(() => {
    if (shouldProceedAfterResult && leaveProtection.hasBlockedNavigation) {
      leaveProtection.proceedNavigation();
      return;
    }

    handleOpenFeedback();
  }, [handleOpenFeedback, leaveProtection, shouldProceedAfterResult]);

  return (
    <div className="relative space-y-6 select-none">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Writing Task 2 - Live Attempt
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_0.5fr]">
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-none border border-slate-800 bg-slate-950 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-slate-900/85 to-slate-950" />
            <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:34px_34px]" />

            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
                Essay Question
              </p>
              {isLoading ? <p className="mt-4 text-base text-slate-200">Loading question...</p> : null}
              {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
              {!isLoading && !error ? (
                <>
                  <p className="mt-4 whitespace-pre-line text-lg leading-9 text-slate-100">
                    {normalizeText(item?.questionTopic) || "Question not available."}
                  </p>
                  <p className="mt-5 text-sm leading-7 text-slate-300">
                    {normalizeText(item?.instruction?.text) || `Write at least ${minimumWords} words.`}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.12em] text-slate-400">
                    Essay type: {toReadableLabel(item?.essayType || "unknown")}
                  </p>
                </>
              ) : null}
            </div>
          </section>

          <section className="rounded-none border border-slate-200/80 bg-white/95 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                Your Essay
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {wordsCount} words
              </p>
            </div>
            <textarea
              className="h-[54vh] min-h-[380px] w-full resize-none border border-slate-200 bg-white px-4 py-4 text-base leading-7 text-slate-900 outline-none transition focus:border-emerald-300 select-text"
              disabled={!isAttemptStarted || isTimeOver || isSubmitted}
              onChange={(event) => setEssayText(event.target.value)}
              placeholder="Write your full response here..."
              spellCheck={false}
              value={essayText}
            />
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <WritingAttemptTimerCard remainingSeconds={remainingSeconds} />

          <section className="rounded-none border border-slate-200/80 bg-white/95 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Word Count
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{wordsCount}</p>
            <p className="mt-1 text-sm text-slate-600">{wordsGuideText}</p>
            <div className="mt-3 h-1.5 w-full bg-slate-200">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min((wordsCount / minimumWords) * 100, 100)}%` }}
              />
            </div>
          </section>

          <section className="rounded-none border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Rules</p>
            <div className="mt-3 space-y-2">
              <p className="flex items-start gap-2">
                <ShieldBan className="mt-0.5 h-4 w-4 shrink-0" />
                Copy actions are blocked during the active attempt.
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Time continues even if you refresh or leave the page.
              </p>
              <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Check when ready. If timer reaches 00:00, auto-check starts.
              </p>
            </div>
          </section>

          <button
            className="emerald-gradient-fill inline-flex w-full items-center justify-center rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-black uppercase tracking-[0.15em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handleSubmitAttempt("manual")}
            type="button"
            disabled={
              !isAttemptStarted || isSubmitted || isCheckingEssay || isLoading || Boolean(error) || !item
            }
          >
            {isCheckingEssay ? "Checking..." : isSubmitted ? "Checked" : "Check My Essay"}
          </button>
          {submissionMeta ? (
            <p className="text-xs text-slate-600">
              Checked {submissionMeta.source === "auto" ? "automatically" : "manually"} at{" "}
              {new Date(submissionMeta.submittedAt).toLocaleTimeString()}.
            </p>
          ) : null}

          {isTimeOver ? (
            <section className="rounded-none border border-rose-300 bg-rose-50 p-5 text-rose-800">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Time Is Up</p>
              <p className="mt-2 text-sm">Editing is locked for this attempt.</p>
            </section>
          ) : null}
        </aside>
      </div>

      <ExamPopup
        isOpen={isResultModalOpen}
        maxWidthClass="max-w-xl"
        onClose={() => setIsResultModalOpen(false)}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Submitted</p>
        <p className="mt-4 text-xl font-semibold text-slate-900">
          Your Writing Task 2 attempt has been submitted.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Words: {resultPayload?.submission?.wordsCount || 0}
        </p>
        <p className="text-sm text-slate-600">
          Source: {toReadableLabel(resultPayload?.submission?.source || "manual")}
        </p>
        {resultPayload?.analysisError ? (
          <p className="mx-auto mt-4 max-w-md rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {resultPayload.analysisError}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {shouldProceedAfterResult ? null : (
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
              onClick={() => setIsResultModalOpen(false)}
              type="button"
            >
              Stay Here
            </button>
          )}
          <button
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105"
            onClick={handleResultPrimaryAction}
            type="button"
          >
            {shouldProceedAfterResult ? "Leave Page" : "View Feedback"}
          </button>
        </div>
      </ExamPopup>

      {isStartGateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
          onClick={handleStartOverlayClose}
        >
        <div
          className="relative w-full max-w-xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            aria-label="Close and go back"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={handleStartOverlayClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Before You Start
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900"><b>PAY ATTENTION !!!</b></h2>
            <div className="mx-auto mt-4 max-w-2xl space-y-2 text-base font-medium leading-8 text-slate-700">
              <p>
                You have <span className="text-yellow-500">{Math.max(1, Math.round(durationSeconds / 60))} minutes</span> for this writing task.
                If you <span className="text-yellow-500">switch</span> tabs, <span className="text-yellow-500">change</span> browser, or <span className="text-yellow-500">refresh</span>, this task is <span className="text-yellow-500">auto-submitted</span>.
              </p>
            </div>
            <button
              className="mx-auto mt-6 inline-flex w-full max-w-[330px] items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition hover:brightness-105"
              disabled={isCountdownRunning}
              onClick={handleUnderstandStart}
              type="button"
            >
              {isCountdownRunning && Number.isFinite(countdownValue)
                ? `Starting in ${countdownValue}`
                : "I Understand"}
            </button>
          </div>
        </div>
      ) : null}

      <ExamLeaveWarningModal
        isOpen={leaveProtection.isWarningOpen}
        isSubmitting={isRouteLeaveSubmitting}
        onLeave={handleConfirmLeavePage}
        onStay={handleStayOnExamPage}
      />
    </div>
  );
}

export default StudentWritingTask2TaskPage;
