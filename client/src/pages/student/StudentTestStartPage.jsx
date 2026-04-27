import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, ShieldBan, X } from "lucide-react";
import { motion as Motion } from "framer-motion";
import WritingAttemptTimerCard from "../../components/student/WritingAttemptTimerCard";
import { SkeletonText } from "../../components/ui/Skeleton";
import { apiRequest } from "../../lib/apiClient";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";

const DEFAULT_DURATION_SECONDS = 40 * 60;
const MINIMUM_WORDS = 250;
const START_COUNTDOWN_SECONDS = 3;

function parseDurationFromSubText(subText) {
  if (!Array.isArray(subText)) {
    return DEFAULT_DURATION_SECONDS;
  }

  const timeLabel = subText.find((item) => /minute/i.test(item));
  const minutesMatch = timeLabel?.match(/(\d+)/);
  const minutes = Number.parseInt(minutesMatch?.[1] ?? "", 10);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_DURATION_SECONDS;
  }

  return minutes * 60;
}

function countWords(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
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

function StudentTestStartPage() {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [searchParams] = useSearchParams();
  const setId = String(searchParams.get("set") || "").trim();
  const feedbackPagePath = useMemo(
    () => `/student/tests/${testId}/result${setId ? `?set=${encodeURIComponent(setId)}` : ""}`,
    [setId, testId],
  );

  const attemptStartStorageKey = useMemo(
    () => `student:writing-task2-opinion:attempt:start:${setId || "unknown"}`,
    [setId],
  );
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

  const [prompt, setPrompt] = useState(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");
  const [essayText, setEssayText] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(DEFAULT_DURATION_SECONDS);
  const [remainingSeconds, setRemainingSeconds] = useState(DEFAULT_DURATION_SECONDS);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [submissionMeta, setSubmissionMeta] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmissionHydrated, setIsSubmissionHydrated] = useState(false);
  const [isAttemptStarted, setIsAttemptStarted] = useState(false);
  const [isCheckingEssay, setIsCheckingEssay] = useState(false);
  const [isCountdownRunning, setIsCountdownRunning] = useState(false);
  const [countdownValue, setCountdownValue] = useState(null);
  const blockedNavigationAlertAtRef = useRef(0);
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
    if (testId !== "writingTask2-opinion") {
      return;
    }

    setIsDraftHydrated(false);
    const savedDraft = localStorage.getItem(draftStorageKey);
    setEssayText(typeof savedDraft === "string" ? savedDraft : "");
    setIsDraftHydrated(true);
  }, [draftStorageKey, testId]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion" || !isDraftHydrated || isSubmitted) {
      return;
    }

    localStorage.setItem(draftStorageKey, essayText);
  }, [draftStorageKey, essayText, isDraftHydrated, isSubmitted, testId]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion") {
      return;
    }

    setIsSubmissionHydrated(false);
    const parsedSubmission = readSubmissionMeta(submitStorageKey);

    setIsSubmitted(Boolean(parsedSubmission));
    setSubmissionMeta(parsedSubmission);

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
  }, [submitStorageKey, testId]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion" || !setId || isSubmitted) {
      setIsAttemptStarted(false);
      return;
    }

    const startedAtRaw = localStorage.getItem(attemptStartStorageKey);
    const startedAt = Number.parseInt(startedAtRaw || "", 10);
    setIsAttemptStarted(Number.isFinite(startedAt) && startedAt > 0);
  }, [attemptStartStorageKey, isSubmitted, setId, testId]);

  useEffect(() => {
    async function loadPrompt() {
      if (testId !== "writingTask2-opinion") {
        return;
      }

      if (!setId) {
        setPromptError("Essay set is missing. Please go back and choose a writing set.");
        return;
      }

      setIsLoadingPrompt(true);
      setPromptError("");

      try {
        const response = await apiRequest(`/writing-task2-opinion/${setId}`, { auth: false });
        const nextPrompt = response?.prompt ?? null;

        if (!nextPrompt) {
          throw new Error("Prompt not found.");
        }

        setPrompt(nextPrompt);
        setDurationSeconds(parseDurationFromSubText(nextPrompt.subText));
      } catch (error) {
        setPromptError(error.message || "Failed to load prompt.");
      } finally {
        setIsLoadingPrompt(false);
      }
    }

    loadPrompt();
  }, [setId, testId]);

  useEffect(() => {
    if (
      testId !== "writingTask2-opinion" ||
      !setId ||
      isSubmitted ||
      !isSubmissionHydrated ||
      !isAttemptStarted
    ) {
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
  }, [
    attemptStartStorageKey,
    durationSeconds,
    isAttemptStarted,
    isSubmissionHydrated,
    isSubmitted,
    setId,
    testId,
  ]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion" || isSubmitted || isAttemptStarted) {
      return;
    }

    setRemainingSeconds(durationSeconds);
  }, [durationSeconds, isAttemptStarted, isSubmitted, testId]);

  const handleSubmitAttempt = useCallback(
    async (source) => {
      if (testId !== "writingTask2-opinion" || isSubmitted || !setId || isCheckingEssay) {
        return;
      }

      setIsCheckingEssay(true);
      const submittedAt = new Date().toISOString();
      const wordsCount = countWords(essayText);
      const payload = {
        setId,
        source,
        submittedAt,
        wordsCount,
        essayText,
        question: prompt?.prompt || "",
        questionMeta: Array.isArray(prompt?.subText) ? prompt.subText : [],
        durationSeconds,
        remainingSecondsAtSubmit: remainingSeconds,
        timeSpentSeconds: Math.max(durationSeconds - remainingSeconds, 0),
      };

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
      } catch (error) {
        analysis = error?.body?.analysis ?? null;
        analysisError = error?.body?.message || error.message || "AI analysis request failed.";
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

      navigate(feedbackPagePath, {
        replace: true,
        state: {
          submission: submissionWithAnalysisId,
          analysis,
          analysisError: analysisError || undefined,
        },
      });
    },
    [
      analysisStorageKey,
      attemptStartStorageKey,
      durationSeconds,
      essayText,
      feedbackPagePath,
      isCheckingEssay,
      isSubmitted,
      navigate,
      prompt?.prompt,
      prompt?.subText,
      remainingSeconds,
      setId,
      submitStorageKey,
      testId,
    ],
  );

  const handleStartAttempt = useCallback(() => {
    if (testId !== "writingTask2-opinion" || !setId || isSubmitted || isAttemptStarted) {
      return;
    }

    clearCountdownInterval();
    setIsCountdownRunning(false);
    setCountdownValue(null);
    const startedAt = Date.now();
    localStorage.setItem(attemptStartStorageKey, String(startedAt));
    setIsAttemptStarted(true);
  }, [
    attemptStartStorageKey,
    clearCountdownInterval,
    isAttemptStarted,
    isSubmitted,
    setId,
    testId,
  ]);

  const handleUnderstandStart = useCallback(() => {
    if (
      isCountdownRunning
      || testId !== "writingTask2-opinion"
      || !setId
      || isSubmitted
      || isAttemptStarted
    ) {
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
    setId,
    testId,
  ]);

  const handleStartOverlayClose = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(`/student/tests/${encodeURIComponent(testId || "writingTask2-opinion")}`);
  }, [navigate, testId]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion") {
      return undefined;
    }

    if (!isSubmitted && remainingSeconds <= 0) {
      handleSubmitAttempt("auto");
    }

    return undefined;
  }, [handleSubmitAttempt, isSubmitted, remainingSeconds, testId]);

  const shouldBlockLeaving = testId === "writingTask2-opinion" && !isSubmitted;
  const blocker = useBlocker(shouldBlockLeaving);

  useEffect(() => {
    if (blocker.state === "blocked") {
      blocker.reset();
      const now = Date.now();
      if (now - blockedNavigationAlertAtRef.current > 800) {
        blockedNavigationAlertAtRef.current = now;
        window.alert(
          "You cannot navigate to other pages during this attempt. Switching tab or browser will auto-check your essay.",
        );
      }
    }
  }, [blocker]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion" || isSubmitted || !isAttemptStarted) {
      return undefined;
    }

    const autoSubmitOnFocusLoss = () => {
      handleSubmitAttempt("focus-lost");
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        autoSubmitOnFocusLoss();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleSubmitAttempt, isAttemptStarted, isSubmitted, testId]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion" || !setId || !isSubmissionHydrated || !isSubmitted || isCheckingEssay) {
      return;
    }

    const savedAnalysis = readSubmissionMeta(analysisStorageKey);

    navigate(feedbackPagePath, {
      replace: true,
      state: {
        submission: submissionMeta || undefined,
        analysis: savedAnalysis || undefined,
      },
    });
  }, [
    analysisStorageKey,
    feedbackPagePath,
    isCheckingEssay,
    isSubmissionHydrated,
    isSubmitted,
    navigate,
    setId,
    submissionMeta,
    testId,
  ]);

  const isStartGateModalOpen =
    testId === "writingTask2-opinion"
    && !isSubmitted
    && !isAttemptStarted
    && isSubmissionHydrated
    && !isLoadingPrompt
    && !promptError
    && Boolean(setId);
  useBodyScrollLock(isStartGateModalOpen);

  if (testId === "writingTask2-opinion") {
    const wordsCount = countWords(essayText);
    const isTimeOver = remainingSeconds <= 0;
    const wordsGuideText =
      wordsCount >= MINIMUM_WORDS
        ? "Minimum reached. Keep improving argument quality."
        : `Target at least ${MINIMUM_WORDS} words.`;

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
                {isLoadingPrompt ? (
                  <SkeletonText className="mt-5 max-w-2xl" lines={4} widths={["88%", "72%", "94%", "54%"]} />
                ) : null}
                {promptError ? (
                  <p className="mt-4 text-sm text-rose-300">{promptError}</p>
                ) : null}
                {!isLoadingPrompt && !promptError ? (
                  <>
                    <p className="mt-4 whitespace-pre-line text-lg leading-9 text-slate-100">
                      {prompt?.prompt || "Question not available."}
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
                onCopy={(event) => event.preventDefault()}
                onCut={(event) => event.preventDefault()}
                onDrop={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && ["c", "x", "v"].includes(event.key.toLowerCase())) {
                    event.preventDefault();
                  }
                }}
                onPaste={(event) => event.preventDefault()}
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
                  style={{ width: `${Math.min((wordsCount / MINIMUM_WORDS) * 100, 100)}%` }}
                />
              </div>
            </section>

            <section className="rounded-none border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Rules</p>
              <div className="mt-3 space-y-2">
                <p className="flex items-start gap-2">
                  <ShieldBan className="mt-0.5 h-4 w-4 shrink-0" />
                  Copy, cut, paste and drag-drop are disabled.
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
                !isAttemptStarted || isSubmitted || isCheckingEssay || isLoadingPrompt || Boolean(promptError) || !setId
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

        {isStartGateModalOpen ? (
          <Motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
            initial={{ opacity: 0 }}
            onClick={handleStartOverlayClose}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <Motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-xl border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7"
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              onClick={(event) => event.stopPropagation()}
              transition={{ duration: 0.34, ease: "easeOut", delay: 0.05 }}
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
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Before You Start</p>
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
            </Motion.div>
          </Motion.div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Test In Progress
        </p>
        <h1 className="text-3xl font-semibold">Test {testId}</h1>
        <p className="text-slate-600">
          This is the live exam environment. Analytics and navigation are limited here.
        </p>
      </header>
    </div>
  );
}

export default StudentTestStartPage;

