import { useEffect, useMemo, useState } from "react";
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
        const response = await apiRequest(`/reading/practice?${params.toString()}`, { auth: false });
        if (!isMounted) {
          return;
        }

        const nextGroup = Array.isArray(response?.groups) ? response.groups[0] || null : null;
        if (!nextGroup) {
          setGroup(null);
          setError("This reading task was not found.");
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
          sectionTitle={practiceConfig?.title || "Reading Task"}
        />
      ) : null}
    </div>
  );
}

export default StudentReadingPracticeTaskPage;
