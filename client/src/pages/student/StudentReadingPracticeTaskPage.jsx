import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ReadingPassageWithBlocks from "../../components/student/ReadingPassageWithBlocks";
import {
  buildReadingPracticeQueryParams,
  getReadingPracticeConfig,
} from "../../data/readingPractice";

function decodeValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

function StudentReadingPracticeTaskPage() {
  const { practiceKey: practiceKeyParam = "", passageId: passageIdParam = "" } = useParams();
  const practiceKey = decodeValue(practiceKeyParam).toLowerCase();
  const passageId = decodeValue(passageIdParam);
  const practiceConfig = useMemo(() => getReadingPracticeConfig(practiceKey), [practiceKey]);

  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTask() {
      if (!practiceConfig) {
        setGroup(null);
        setError("Unknown reading practice category.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const params = buildReadingPracticeQueryParams(practiceConfig, { passageId });
        const response = await apiRequest(`/reading/practice?${params.toString()}`);
        if (!isMounted) {
          return;
        }

        const nextGroup = Array.isArray(response?.groups) ? response.groups[0] || null : null;
        if (!nextGroup) {
          setGroup(null);
          setError("This reading task was not found.");
          return;
        }

        const progressStatus = String(nextGroup?.progressStatus || nextGroup?.progression?.status || "available")
          .trim()
          .toLowerCase();
        if (progressStatus === "locked") {
          setGroup(null);
          setError("This task is locked. Complete the previous additional task first.");
          return;
        }

        setGroup(nextGroup);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load reading task.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTask();

    return () => {
      isMounted = false;
    };
  }, [passageId, practiceConfig]);

  const handleAttemptSubmit = useCallback(
    async (attemptPayload = {}) => {
      if (!passageId) {
        return;
      }

      const passageTiming = Array.isArray(attemptPayload?.passageTiming) ? attemptPayload.passageTiming : [];
      const totalTimeSpentSeconds = passageTiming.reduce(
        (sum, item) => sum + Math.max(0, Number(item?.timeSpentSeconds) || 0),
        0,
      );

      await apiRequest("/students/me/daily-tasks/attempts", {
        method: "POST",
        body: {
          taskType: "reading",
          taskRefId: passageId,
          attemptCategory: "additional",
          sourceType: "reading_question_family",
          taskLabel: String(group?.passage?.title || group?.passageId || passageId).trim(),
          submitReason: String(attemptPayload?.submitReason || "manual"),
          forceReason: String(attemptPayload?.forceReason || ""),
          isAutoSubmitted: String(attemptPayload?.submitReason || "manual") !== "manual",
          submittedAt: new Date().toISOString(),
          totalTimeSpentSeconds: Math.round(totalTimeSpentSeconds),
          score: {
            percentage: Number(attemptPayload?.evaluation?.percentage || 0),
            correctCount: Number(attemptPayload?.evaluation?.correctCount || 0),
            incorrectCount: Number(attemptPayload?.evaluation?.incorrectCount || 0),
            totalQuestions: Number(attemptPayload?.evaluation?.totalQuestions || 0),
          },
          payload: {
            route: `/student/tests/reading/${encodeURIComponent(practiceKey)}/${encodeURIComponent(passageId)}`,
            submission: {
              practiceKey,
              passageId,
              evaluation: attemptPayload?.evaluation || {},
              passageTiming,
            },
          },
        },
      });
    },
    [group?.passage?.title, group?.passageId, passageId, practiceKey],
  );

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to={`/student/tests/reading/${encodeURIComponent(practiceKey)}`}
        >
          <ChevronLeft className="h-4 w-4" />
          {practiceConfig?.title || "Reading tasks"}
        </Link>
      </header>

      {isLoading ? <p className="text-sm text-slate-600">Loading reading task...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error && group?.passage ? (
        <ReadingPassageWithBlocks
          blocks={Array.isArray(group?.blocks) ? group.blocks : []}
          passage={group.passage}
          onAttemptSubmit={handleAttemptSubmit}
          sectionTitle={practiceConfig?.title || "Reading Task"}
        />
      ) : null}
    </div>
  );
}

export default StudentReadingPracticeTaskPage;
