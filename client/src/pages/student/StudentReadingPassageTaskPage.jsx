import { useEffect, useState } from "react";
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
          { auth: false },
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
          sectionTitle="Passage Task"
        />
      ) : null}
    </div>
  );
}

export default StudentReadingPassageTaskPage;
