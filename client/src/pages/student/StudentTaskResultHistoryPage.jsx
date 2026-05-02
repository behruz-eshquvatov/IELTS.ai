import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ActiveAttemptSummary from "../../components/student/results/ActiveAttemptSummary";
import AttemptHistoryTable from "../../components/student/results/AttemptHistoryTable";
import BreakdownTable from "../../components/student/results/BreakdownTable";
import { ResultsSkeleton } from "../../components/ui/Skeleton";
import {
  buildResultsAttemptRoute,
  decodeRouteValue,
  formatDateTime,
  formatSeconds,
  parseAttemptNumberFromSlug,
  deriveTaskGroupIdFromRoute,
} from "../../components/student/results/resultsUtils";

const WRITING_CATEGORIES = new Set(["writing_task1", "writing_task2"]);

function formatBandScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return numeric.toFixed(1);
}

function resolveAnswerText(value) {
  const safe = String(value || "").trim();
  return safe || "-";
}

function resolveAcceptedAnswerText(item) {
  return Array.isArray(item?.acceptedAnswers) && item.acceptedAnswers.length > 0
    ? item.acceptedAnswers.join(", ")
    : "-";
}

function resolveReadingPassageNumber(questionNumber) {
  const safeNumber = Number(questionNumber);
  if (!Number.isFinite(safeNumber) || safeNumber <= 0) {
    return 1;
  }

  if (safeNumber <= 13) {
    return 1;
  }

  if (safeNumber <= 26) {
    return 2;
  }

  return 3;
}

function formatWeakAreaLabel(value) {
  const safe = String(value || "Unknown question type")
    .replace(/[_-]+/g, " ")
    .replace(/\s+\d+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!safe) {
    return "Unknown question type";
  }

  return safe.replace(/\b\w/g, (char) => char.toUpperCase());
}

function StudentTaskResultHistoryPage() {
  const navigate = useNavigate();
  const {
    taskType: taskTypeParam = "",
    taskMode: taskModeParam = "",
    taskRefId: taskRefParam = "",
    attemptSlug = "",
  } = useParams();
  const [searchParams] = useSearchParams();

  const decodedTaskRefId = useMemo(() => decodeRouteValue(taskRefParam), [taskRefParam]);
  const querySourceType = String(searchParams.get("sourceType") || "").trim();
  const queryTaskGroupId = String(searchParams.get("taskGroupId") || "").trim();

  const requestedAttemptNumber = useMemo(
    () => parseAttemptNumberFromSlug(attemptSlug),
    [attemptSlug],
  );

  const resolvedTaskGroupId = useMemo(() => {
    if (queryTaskGroupId) {
      return decodeRouteValue(queryTaskGroupId);
    }

    return deriveTaskGroupIdFromRoute({
      taskType: taskTypeParam,
      taskMode: taskModeParam,
      taskRefId: decodedTaskRefId,
      sourceType: querySourceType,
    });
  }, [decodedTaskRefId, querySourceType, queryTaskGroupId, taskModeParam, taskTypeParam]);

  const [taskGroup, setTaskGroup] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [detailSummary, setDetailSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadResultDetail() {
      if (!resolvedTaskGroupId) {
        setErrorMessage("Task route is invalid. Open this attempt from Results Center.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const encodedTaskGroupId = encodeURIComponent(resolvedTaskGroupId);
        const attemptsPayload = await apiRequest(`/students/me/results/${encodedTaskGroupId}/attempts?sort=desc`);
        if (!isMounted) {
          return;
        }

        const activeAttemptRef = requestedAttemptNumber
          ? `attempt-${requestedAttemptNumber}`
          : `attempt-${Number(attemptsPayload?.latestAttempt?.groupAttemptNumber || 1)}`;

        const taskCategory = String(attemptsPayload?.taskCategory || "").trim();
        if (WRITING_CATEGORIES.has(taskCategory)) {
          const redirect = await apiRequest(
            `/students/me/results/${encodedTaskGroupId}/writing-redirect?attemptRef=${encodeURIComponent(activeAttemptRef)}`,
          );
          if (!isMounted) {
            return;
          }

          navigate(String(redirect?.route || "/student/results"), { replace: true });
          return;
        }

        const detailPayload = await apiRequest(
          `/students/me/results/${encodedTaskGroupId}/attempts/${encodeURIComponent(activeAttemptRef)}`,
        );
        if (!isMounted) {
          return;
        }

        const mergedAttempts = Array.isArray(detailPayload?.attempts)
          ? detailPayload.attempts
          : Array.isArray(attemptsPayload?.attempts)
            ? attemptsPayload.attempts
            : [];

        setTaskGroup({
          taskGroupId: detailPayload?.taskGroupId || attemptsPayload?.taskGroupId || resolvedTaskGroupId,
          taskCategory: detailPayload?.taskCategory || attemptsPayload?.taskCategory || "",
          taskCategoryLabel: detailPayload?.taskCategoryLabel || attemptsPayload?.taskCategoryLabel || "Task History",
          taskType: detailPayload?.taskType || attemptsPayload?.taskType || taskTypeParam,
          taskMode: detailPayload?.taskMode || attemptsPayload?.taskMode || taskModeParam,
          taskRefId: detailPayload?.taskRefId || attemptsPayload?.taskRefId || decodedTaskRefId,
          sourceType: detailPayload?.sourceType || attemptsPayload?.sourceType || querySourceType,
          readableTitle: detailPayload?.readableTitle || attemptsPayload?.readableTitle || "Task attempt history",
          attemptCount: Number(detailPayload?.attemptCount || attemptsPayload?.attemptCount || mergedAttempts.length),
          taskMeta: detailPayload?.taskMeta || attemptsPayload?.taskMeta || {},
        });
        setAttempts(mergedAttempts);
        setActiveAttempt(detailPayload?.activeAttempt || attemptsPayload?.latestAttempt || null);
        setDetailSummary(detailPayload?.detailSummary || null);

        const activeNumber = Number(
          detailPayload?.activeAttemptRef?.groupAttemptNumber
          || detailPayload?.activeAttempt?.groupAttemptNumber
          || requestedAttemptNumber
          || 1,
        );
        if (!attemptSlug && activeNumber > 0) {
          const to = buildResultsAttemptRoute({
            taskType: detailPayload?.taskType || attemptsPayload?.taskType || taskTypeParam,
            taskMode: detailPayload?.taskMode || attemptsPayload?.taskMode || taskModeParam,
            taskRefId: detailPayload?.taskRefId || attemptsPayload?.taskRefId || decodedTaskRefId,
            sourceType: detailPayload?.sourceType || attemptsPayload?.sourceType || querySourceType,
            taskGroupId: detailPayload?.taskGroupId || attemptsPayload?.taskGroupId || resolvedTaskGroupId,
            attemptNumber: activeNumber,
          });
          navigate(to, { replace: true });
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error?.message || "Could not load attempt history.");
        setTaskGroup(null);
        setAttempts([]);
        setActiveAttempt(null);
        setDetailSummary(null);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadResultDetail();

    return () => {
      isMounted = false;
    };
  }, [
    attemptSlug,
    decodedTaskRefId,
    navigate,
    querySourceType,
    requestedAttemptNumber,
    resolvedTaskGroupId,
    taskModeParam,
    taskTypeParam,
  ]);

  const evaluation = detailSummary?.evaluation || activeAttempt?.payloadSummary?.evaluation || {};
  const correctCount = Number.isFinite(Number(evaluation?.correctCount))
    ? Number(evaluation.correctCount)
    : Number(activeAttempt?.score?.correctCount || 0);
  const totalQuestions = Number.isFinite(Number(evaluation?.totalQuestions))
    ? Number(evaluation.totalQuestions)
    : Number(activeAttempt?.score?.totalQuestions || 0);
  const incorrectItems = Array.isArray(evaluation?.incorrectItems) ? evaluation.incorrectItems : [];
  const answerItems = Array.isArray(evaluation?.answerItems) ? evaluation.answerItems : [];
  const weakAreas = Array.isArray(detailSummary?.weakAreas) ? detailSummary.weakAreas : [];
  const blockResults = Array.isArray(detailSummary?.blockResults) ? detailSummary.blockResults : [];

  const activeCategory = String(taskGroup?.taskCategory || "").toLowerCase();
  const isReadingFull = activeCategory === "reading_full_test";
  const isListeningFull = activeCategory === "listening_full_test";
  const isQuestionTask = activeCategory === "reading_question_task" || activeCategory === "listening_question_task";
  const displayedAnswerItems = isReadingFull && answerItems.length > 0
    ? answerItems
    : isReadingFull
      ? incorrectItems
      : incorrectItems.slice(0, 12);
  const scoreBand = Number.isFinite(Number(activeAttempt?.score?.band ?? evaluation?.band))
    ? Number(activeAttempt?.score?.band ?? evaluation?.band)
    : null;
  const readingAnswerGroups = useMemo(() => {
    if (!isReadingFull) {
      return [];
    }

    const grouped = new Map();
    displayedAnswerItems
      .slice()
      .sort((left, right) => Number(left?.questionNumber || 0) - Number(right?.questionNumber || 0))
      .forEach((item) => {
        const passageNumber = resolveReadingPassageNumber(item?.questionNumber);
        if (!grouped.has(passageNumber)) {
          grouped.set(passageNumber, []);
        }
        grouped.get(passageNumber).push(item);
      });

    return Array.from(grouped.entries()).map(([passageNumber, items]) => ({
      passageNumber,
      items,
    }));
  }, [displayedAnswerItems, isReadingFull]);

  function handleSelectAttempt(attempt) {
    const attemptNumber = Number(attempt?.groupAttemptNumber || attempt?.attemptNumber || 1);
    const route = buildResultsAttemptRoute({
      taskType: taskTypeParam || taskGroup?.taskType || "reading",
      taskMode: taskModeParam || taskGroup?.taskMode || "question",
      taskRefId: decodedTaskRefId || taskGroup?.taskRefId || "",
      sourceType: taskGroup?.sourceType || querySourceType,
      taskGroupId: taskGroup?.taskGroupId || resolvedTaskGroupId,
      attemptNumber,
    });
    navigate(route);
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/results"
        >
          <ArrowLeft className="h-4 w-4" />
          Results center
        </Link>
        <h1 className="text-3xl font-semibold text-slate-900">
          {taskGroup?.readableTitle || "Task attempt history"}
        </h1>
      </header>

      {isLoading ? (
        <ResultsSkeleton count={3} />
      ) : null}

      {errorMessage ? (
        <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && activeAttempt ? (
        <>
          <ActiveAttemptSummary activeAttempt={activeAttempt} />

          <section className="space-y-3 rounded-none border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Performance Snapshot
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <article className="border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Correct
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">{correctCount}</p>
              </article>
              <article className="border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Total Questions
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">{totalQuestions}</p>
              </article>
              <article className="border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Score
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {formatBandScore(scoreBand)}
                </p>
              </article>
            </div>
          </section>

          {isListeningFull ? (
            <BreakdownTable
              columns={[
                { key: "blockId", label: "Section / Block" },
                { key: "correctCount", label: "Correct" },
                { key: "totalQuestions", label: "Total" },
                {
                  key: "percentage",
                  label: "Accuracy",
                  render: (row) => `${Number(row?.percentage || 0)}%`,
                },
              ]}
              rows={blockResults}
              title="Section / Block Breakdown"
            />
          ) : null}

          {isQuestionTask && blockResults.length > 0 ? (
            <BreakdownTable
              columns={[
                { key: "blockId", label: "Task Block" },
                { key: "correctCount", label: "Correct" },
                { key: "totalQuestions", label: "Total" },
                {
                  key: "percentage",
                  label: "Accuracy",
                  render: (row) => `${Number(row?.percentage || 0)}%`,
                },
              ]}
              rows={blockResults}
              title="Question Task Breakdown"
            />
          ) : null}

          {weakAreas.length > 0 ? (
            <section className="space-y-2 rounded-none border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Areas With Most Errors
              </p>
              <div className="overflow-x-auto border border-slate-200">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="border-b border-r border-slate-200 px-3 py-3 font-semibold">Question Type</th>
                      <th className="border-b border-slate-200 px-3 py-3 text-center font-semibold">Questions Missed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weakAreas.map((area) => (
                      <tr
                        className="border-b border-slate-200 transition-colors last:border-b-0 hover:bg-emerald-50/60"
                        key={String(area?.label || "")}
                      >
                        <td className="border-r border-slate-200 px-3 py-3 font-semibold text-slate-900">
                          {formatWeakAreaLabel(area?.label)}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-700">
                          {Number(area?.incorrectCount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {displayedAnswerItems.length > 0 ? (
            <section className="space-y-2 rounded-none border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {isReadingFull && answerItems.length > 0 ? "Answers" : "Incorrect Answers"}
              </p>
              {isReadingFull ? (
                <div className="space-y-3 grid grid-cols-3 gap-3">
                  {readingAnswerGroups.map((group) => (
                    <article key={`passage-${group.passageNumber}`}>
                      <p className="mt-3 mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Passage {group.passageNumber}
                      </p>
                      <div className="grid gap-2 grid-cols-1">
                        {group.items.map((item) => (
                          <div
                            className={`bg-white px-2.5 py-2 text-sm font-semibold ${
                              item?.isCorrect
                                ? "text-emerald-700"
                                : "text-rose-700"
                            }`}
                            key={`answer-${group.passageNumber}-${item?.questionNumber}`}
                          >
                            {Number(item?.questionNumber || "?")}: {resolveAnswerText(item?.studentAnswer)}
                            <span className="font-normal text-slate-600">
                              {" "}({resolveAcceptedAnswerText(item)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedAnswerItems.map((item, index) => (
                    <article className="border border-slate-200 bg-slate-50 px-3 py-2" key={`incorrect-${index}`}>
                      <p className="text-sm font-semibold text-slate-900">
                        Q{Number(item?.questionNumber || "?")}
                      </p>
                      {item?.studentAnswer ? (
                        <p className="mt-1 text-xs text-slate-600">Your answer: {item.studentAnswer}</p>
                      ) : null}
                      {Array.isArray(item?.acceptedAnswers) && item.acceptedAnswers.length > 0 ? (
                        <p className="mt-1 text-xs text-slate-600">
                          Expected: {item.acceptedAnswers.join(", ")}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          <AttemptHistoryTable
            activeAttemptId={activeAttempt?.attemptId}
            attempts={attempts}
            onSelectAttempt={handleSelectAttempt}
          />

          <section className="rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Latest completion: {formatDateTime(activeAttempt?.submittedAt)}. Time spent:{" "}
            {formatSeconds(activeAttempt?.totalTimeSpentSeconds)}.
          </section>
        </>
      ) : null}
    </div>
  );
}

export default StudentTaskResultHistoryPage;
