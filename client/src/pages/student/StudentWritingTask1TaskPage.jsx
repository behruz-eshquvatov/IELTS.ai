import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ShieldBan, X } from "lucide-react";
import { API_BASE_URL, apiRequest } from "../../lib/apiClient";
import WritingAttemptTimerCard from "../../components/student/WritingAttemptTimerCard";
import ExamPopup from "../../components/student/exam/ExamPopup";
import ExamLeaveWarningModal from "../../components/student/exam/ExamLeaveWarningModal";
import useExamCopyBlocker from "../../hooks/useExamCopyBlocker";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";
import useExamLeaveProtection from "../../hooks/useExamLeaveProtection";
import useTextHighlighting from "../../hooks/useTextHighlighting";
import { TestPageSkeleton } from "../../components/ui/Skeleton";

const DEFAULT_DURATION_SECONDS = 20 * 60;
const MIN_WORD_TARGET = 150;
const START_COUNTDOWN_SECONDS = 3;

function normalizeText(value) {
  return String(value || "").trim();
}

function resolveVisualUrl(url) {
  const safe = normalizeText(url);
  if (!safe) {
    return "";
  }

  if (/^https?:\/\//i.test(safe)) {
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
    if (apiOrigin) {
      return `${apiOrigin}/${normalizedPath}`;
    }
  }

  return `${API_BASE_URL}/${normalizedPath}`;
}

function countWords(text) {
  const trimmed = normalizeText(text);
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function readStoredObject(storageKey) {
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

  const combinedText = `${normalizeText(item?.instruction?.text)} ${normalizeText(item?.questionTopic)}`;
  const minuteMatch = combinedText.match(/(\d+)\s*minutes?/i);
  const parsedFromText = Number.parseInt(minuteMatch?.[1] ?? "", 10);
  if (Number.isFinite(parsedFromText) && parsedFromText > 0) {
    return parsedFromText * 60;
  }

  return DEFAULT_DURATION_SECONDS;
}

function StudentWritingTask1TaskPage() {
  const navigate = useNavigate();
  const { itemId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const safeItemId = normalizeText(itemId);
  const isDailyMode = String(searchParams.get("mode") || "").trim().toLowerCase() === "daily";
  const attemptCategory = isDailyMode ? "daily" : "additional";
  const sourceType = isDailyMode ? "daily_unit" : "writing_task1_extra";
  const feedbackPagePath = useMemo(
    () =>
      `/student/tests/writingTask1/result${
        safeItemId ? `?set=${encodeURIComponent(safeItemId)}` : ""
      }`,
    [safeItemId],
  );
  const draftStorageKey = useMemo(
    () => `student:writing-task1:draft:${safeItemId || "unknown"}`,
    [safeItemId],
  );
  const attemptStartStorageKey = useMemo(
    () => `student:writing-task1:attempt:start:${safeItemId || "unknown"}`,
    [safeItemId],
  );
  const submitStorageKey = useMemo(
    () => `student:writing-task1:attempt:submit:${safeItemId || "unknown"}`,
    [safeItemId],
  );
  const analysisStorageKey = useMemo(
    () => `student:writing-task1:attempt:analysis:${safeItemId || "unknown"}`,
    [safeItemId],
  );

  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [essayText, setEssayText] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION_SECONDS);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_DURATION_SECONDS);
  const [isAttemptStarted, setIsAttemptStarted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionMeta, setSubmissionMeta] = useState(null);
  const [isCheckingEssay, setIsCheckingEssay] = useState(false);
  const [resultPayload, setResultPayload] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [isRouteLeaveSubmitting, setIsRouteLeaveSubmitting] = useState(false);
  const [shouldProceedAfterResult, setShouldProceedAfterResult] = useState(false);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);

  const questionPromptRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const { toggleSelectionHighlight } = useTextHighlighting({
    dataAttribute: "data-writing-highlight",
  });

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

    const savedDraft = localStorage.getItem(draftStorageKey);
    setEssayText(typeof savedDraft === "string" ? savedDraft : "");
  }, [draftStorageKey, safeItemId]);

  useEffect(() => {
    if (!safeItemId || isSubmitted) {
      return;
    }

    localStorage.setItem(draftStorageKey, essayText);
  }, [draftStorageKey, essayText, isSubmitted, safeItemId]);

  useEffect(() => {
    if (!safeItemId) {
      return;
    }

    const parsedSubmission = readStoredObject(submitStorageKey);
    const parsedAnalysis = readStoredObject(analysisStorageKey);
    setSubmissionMeta(parsedSubmission);
    setIsSubmitted(Boolean(parsedSubmission));
    setResultPayload(
      parsedSubmission
        ? {
          submission: parsedSubmission,
          analysis: parsedAnalysis || null,
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
      setIsAttemptStarted(false);
      return;
    }

    const startedAtRaw = localStorage.getItem(attemptStartStorageKey);
    const startedAt = Number.parseInt(startedAtRaw || "", 10);
    setIsAttemptStarted(Number.isFinite(startedAt) && startedAt > 0);
  }, [analysisStorageKey, attemptStartStorageKey, safeItemId, submitStorageKey]);

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
          `/writing-task1/items/${encodeURIComponent(safeItemId)}?status=published`,
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

        setError(nextError.message || "Failed to load Writing Task 1 task.");
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
    if (isSubmitted || isAttemptStarted) {
      return;
    }

    setRemainingSeconds(durationSeconds);
  }, [durationSeconds, isAttemptStarted, isSubmitted]);

  useEffect(() => {
    if (!isAttemptStarted || isSubmitted || !safeItemId) {
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
    return () => {
      window.clearInterval(intervalId);
    };
  }, [attemptStartStorageKey, durationSeconds, isAttemptStarted, isSubmitted, safeItemId]);

  const visualUrl = useMemo(
    () => resolveVisualUrl(item?.visualAsset?.url),
    [item?.visualAsset?.url],
  );
  const wordsCount = useMemo(() => countWords(essayText), [essayText]);
  const wordsGuideText =
    wordsCount >= MIN_WORD_TARGET
      ? "Target reached. Focus on overview and comparisons."
      : `Write at least ${MIN_WORD_TARGET} words.`;
  const isStartGateModalOpen = !isSubmitted && !isAttemptStarted && !isLoading && !error && item;

  useBodyScrollLock(isStartGateModalOpen);

  const buildSubmissionPayload = useCallback(
    (source) => {
      const question = normalizeText(item?.questionTopic) || "Question topic is unavailable.";
      const instructionText = normalizeText(item?.instruction?.text);
      const visualAsset = {
        imageId: normalizeText(item?.visualAsset?.imageId),
        url: normalizeText(item?.visualAsset?.url),
      };

      return {
        setId: safeItemId,
        taskType: "writing_task1",
        attemptCategory,
        sourceType,
        source,
        submittedAt: new Date().toISOString(),
        wordsCount,
        essayText,
        question,
        questionTopic: question,
        questionMeta: [
          instructionText || `Write at least ${MIN_WORD_TARGET} words.`,
          "Task type: writing_task1",
          `Visual type: ${normalizeText(item?.visualType) || "unknown"}`,
          `Minimum words: ${MIN_WORD_TARGET}`,
        ],
        visualAsset,
        taskLabel: question,
        durationSeconds,
        remainingSecondsAtSubmit: remainingSeconds,
        timeSpentSeconds: Math.max(durationSeconds - remainingSeconds, 0),
        minimumWords: MIN_WORD_TARGET,
      };
    },
    [
      durationSeconds,
      essayText,
      item?.instruction?.text,
      item?.questionTopic,
      item?.visualAsset?.imageId,
      item?.visualAsset?.url,
      item?.visualType,
      remainingSeconds,
      safeItemId,
      attemptCategory,
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
        taskType: "writing_task1",
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
          writingTask1AnalysisId: normalizeText(analysisPayload?.id),
        },
      },
    }).catch(() => {
      // Do not block writing flow if completion sync fails.
    });
  }, [attemptCategory, item?.questionTopic, safeItemId, sourceType]);

  const handleSubmitAttempt = useCallback(
    async (source = "manual") => {
      if (!isAttemptStarted || isSubmitted || !item) {
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
        const response = await apiRequest("/writing-task1/analyses", {
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
      setResultPayload({
        submission: submissionWithAnalysisId,
        analysis,
        analysisError: analysisError || "",
      });
      setIsResultModalOpen(true);
      persistDailyTaskAttempt(submissionWithAnalysisId, analysis, analysisError);
    },
    [
      analysisStorageKey,
      attemptStartStorageKey,
      buildSubmissionPayload,
      isAttemptStarted,
      isSubmitted,
      item,
      persistDailyTaskAttempt,
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
    localStorage.setItem(attemptStartStorageKey, String(Date.now()));
    setIsAttemptStarted(true);
    setIsResultModalOpen(false);
    setShouldProceedAfterResult(false);
    setIsRouteLeaveSubmitting(false);
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

    navigate("/student/tests/writingTask1");
  }, [navigate]);

  useEffect(() => {
    if (!isSubmitted && remainingSeconds <= 0) {
      handleSubmitAttempt("auto");
    }
  }, [handleSubmitAttempt, isSubmitted, remainingSeconds]);

  const isExamSessionActive = isAttemptStarted && !isSubmitted;
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
    if (!isExamSessionActive) {
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
  }, [handleSubmitAttempt, isExamSessionActive]);

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

    const persistedSubmission = readStoredObject(submitStorageKey);
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

  const handleWriteAgain = useCallback(() => {
    clearCountdownInterval();
    setIsCountdownRunning(false);
    setCountdownValue(null);
    localStorage.removeItem(submitStorageKey);
    localStorage.removeItem(analysisStorageKey);
    localStorage.removeItem(attemptStartStorageKey);
    localStorage.removeItem(draftStorageKey);
    setEssayText("");
    setSubmissionMeta(null);
    setResultPayload(null);
    setIsSubmitted(false);
    setIsAttemptStarted(false);
    setRemainingSeconds(durationSeconds);
    setIsResultModalOpen(false);
    setShouldProceedAfterResult(false);
    setIsRouteLeaveSubmitting(false);
  }, [
    analysisStorageKey,
    attemptStartStorageKey,
    clearCountdownInterval,
    draftStorageKey,
    durationSeconds,
    submitStorageKey,
  ]);

  return (
    <div className="space-y-6 pt-2 sm:pt-4">
      <header className="space-y-3">
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/tests/writingTask1"
        >
          <ChevronLeft className="h-4 w-4" />
          Writing Task 1 list
        </Link>
      </header>

      {isLoading ? <TestPageSkeleton /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error && item ? (
        <div className="grid gap-4 xl:h-[calc(100vh-9.5rem)] xl:grid-cols-[1.15fr_0.85fr]">
          <section className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pr-1">
            <article
              className="rounded-none border border-slate-900 bg-slate-950 p-6 text-slate-100 select-text"
              onMouseUp={() => toggleSelectionHighlight(questionPromptRef)}
              onTouchEnd={() => toggleSelectionHighlight(questionPromptRef)}
              ref={questionPromptRef}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                Question Topic
              </p>
              <p className="mt-4 text-base leading-8 text-slate-100">
                {normalizeText(item?.questionTopic) || "Question topic is unavailable."}
              </p>
            </article>

            <article className="rounded-none border border-slate-200/80 bg-white p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                Visual
              </p>
              <div className="mt-4 min-h-[340px] border border-slate-200 bg-slate-50 p-4 sm:min-h-[420px]">
                {visualUrl ? (
                  <img
                    alt="Writing Task 1 visual"
                    className="h-full max-h-[680px] w-full object-contain"
                    src={visualUrl}
                  />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-slate-500">
                    Visual is unavailable.
                  </div>
                )}
              </div>
              <p className="mt-4 text-sm text-slate-600">
                Tip: find the biggest/smallest values first, then group similar trends in one overview.
              </p>
            </article>
          </section>

          <aside className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:pl-1">
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
                  style={{ width: `${Math.min((wordsCount / MIN_WORD_TARGET) * 100, 100)}%` }}
                />
              </div>
            </section>

            <section className="rounded-none border border-slate-200/80 bg-white/95 p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Your Response
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {wordsCount} words
                </p>
              </div>
              <textarea
                className="h-[56vh] min-h-[380px] w-full resize-none border border-slate-200 bg-white px-4 py-4 text-base leading-7 text-slate-900 outline-none transition focus:border-emerald-300"
                disabled={!isAttemptStarted || isSubmitted}
                onChange={(event) => setEssayText(event.target.value)}
                placeholder="Write your Task 1 response here..."
                spellCheck={false}
                value={essayText}
              />
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
                  Leaving this page auto-submits your current response.
                </p>
              </div>
            </section>

            <button
              className="emerald-gradient-fill inline-flex w-full items-center justify-center rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-black uppercase tracking-[0.15em] text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                !isAttemptStarted || isSubmitted || isCheckingEssay || isLoading || Boolean(error) || !item
              }
              onClick={() => handleSubmitAttempt("manual")}
              type="button"
            >
              {isCheckingEssay ? "Checking..." : isSubmitted ? "Submitted" : "Submit Task"}
            </button>
          </aside>
        </div>
      ) : null}

      <ExamPopup
        isOpen={isResultModalOpen}
        maxWidthClass="max-w-xl"
        onClose={() => setIsResultModalOpen(false)}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Submitted</p>
        <p className="mt-4 text-xl font-semibold text-slate-900">
          Your Writing Task 1 attempt has been submitted.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Words: {resultPayload?.submission?.wordsCount || submissionMeta?.wordsCount || 0}
        </p>
        {resultPayload?.submission?.source || submissionMeta?.source ? (
          <p className="text-sm text-slate-600">
            Source: {normalizeText(resultPayload?.submission?.source || submissionMeta?.source)}
          </p>
        ) : null}
        {resultPayload?.analysisError ? (
          <p className="mx-auto mt-4 max-w-md rounded-none border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {resultPayload.analysisError}
          </p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {shouldProceedAfterResult ? null : (
            <button
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
              onClick={handleWriteAgain}
              type="button"
            >
              Write Again
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

export default StudentWritingTask1TaskPage;
