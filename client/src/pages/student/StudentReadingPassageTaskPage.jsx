import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ReadingPassageWithBlocks from "../../components/student/ReadingPassageWithBlocks";

function decodeValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

function StudentReadingPassageTaskPage() {
  const { passageId: passageIdParam = "" } = useParams();
  const passageId = decodeValue(passageIdParam);

  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPassageTask() {
      if (!passageId) {
        setGroup(null);
        setError("Passage id is missing.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest(
          `/reading/passages-with-blocks?status=published&passageId=${encodeURIComponent(passageId)}`,
        );
        if (!isMounted) {
          return;
        }

        const nextGroup = Array.isArray(response?.passages) ? response.passages[0] || null : null;
        if (!nextGroup) {
          setGroup(null);
          setError("This passage task was not found.");
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

        setError(nextError.message || "Failed to load passage task.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPassageTask();

    return () => {
      isMounted = false;
    };
  }, [passageId]);

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
          sourceType: "reading_passage",
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
            route: `/student/tests/reading/by-passage/${encodeURIComponent(passageId)}`,
            submission: {
              passageId,
              evaluation: attemptPayload?.evaluation || {},
              passageTiming,
            },
          },
        },
      });
    },
    [group?.passage?.title, group?.passageId, passageId],
  );

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/tests/reading/by-passage"
        >
          <ChevronLeft className="h-4 w-4" />
          Passage by passage
        </Link>
      </header>

      {isLoading ? <p className="text-sm text-slate-600">Loading passage task...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error && group?.passage ? (
        <ReadingPassageWithBlocks
          blocks={Array.isArray(group?.blocks) ? group.blocks : []}
          passage={group.passage}
          onAttemptSubmit={handleAttemptSubmit}
          sectionTitle="Passage Task"
        />
      ) : null}
    </div>
  );
}

export default StudentReadingPassageTaskPage;
