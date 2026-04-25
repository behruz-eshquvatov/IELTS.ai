import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Headphones, Lock } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import PracticeTipsCarousel from "../../components/student/PracticeTipsCarousel";

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractStartFromBlockId(blockId) {
  const safeBlockId = String(blockId || "").trim();
  if (!safeBlockId) {
    return null;
  }

  const match = safeBlockId.match(/_(\d+)-\d+$/);
  if (!match) {
    return null;
  }

  const start = Number.parseInt(match[1], 10);
  return Number.isFinite(start) ? start : null;
}

function getGroupSortStart(group) {
  const explicitStart = toFiniteNumber(group?.questionRange?.start);
  if (Number.isFinite(explicitStart)) {
    return explicitStart;
  }

  const firstBlock = Array.isArray(group?.blocks) ? group.blocks[0] : null;
  const blockRangeStart = toFiniteNumber(firstBlock?.questionRange?.start);
  if (Number.isFinite(blockRangeStart)) {
    return blockRangeStart;
  }

  return extractStartFromBlockId(firstBlock?.blockId);
}

function StudentListeningByPartPage() {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const partTips = [
    "Treat each part as a focused mini-test and keep rhythm across all blocks.",
    "Scan instructions first so you know the answer format before audio starts.",
    "If one answer is missed, recover immediately and continue with the next cue.",
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadPartGroups() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest("/listening-tests/part-groups?status=published", {
        });
        if (!isMounted) {
          return;
        }

        const nextGroups = Array.isArray(response?.groups) ? response.groups : [];
        nextGroups.sort((left, right) => {
          const testIdDiff = String(left?.testId || "").localeCompare(String(right?.testId || ""));
          if (testIdDiff !== 0) {
            return testIdDiff;
          }

          const leftStart = getGroupSortStart(left);
          const rightStart = getGroupSortStart(right);
          const leftHasStart = Number.isFinite(leftStart);
          const rightHasStart = Number.isFinite(rightStart);
          if (leftHasStart || rightHasStart) {
            if (leftHasStart && !rightHasStart) {
              return -1;
            }

            if (!leftHasStart && rightHasStart) {
              return 1;
            }

            const startDiff = leftStart - rightStart;
            if (startDiff !== 0) {
              return startDiff;
            }
          }

          return Number(left?.partNumber || 0) - Number(right?.partNumber || 0);
        });
        setGroups(nextGroups);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load part-by-part listening tasks.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPartGroups();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/tests/listening"
        >
          <ChevronLeft className="h-4 w-4" />
          Listening library
        </Link>
      </header>

      <PracticeTipsCarousel tips={partTips} />

      {isLoading ? <p className="text-sm text-slate-600">Loading part-by-part tasks...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {groups.map((group) => {
            const testId = String(group?.testId || "").trim();
            const partNumber = Number(group?.partNumber);
            if (!testId || !Number.isFinite(partNumber)) {
              return null;
            }

            const range = group?.questionRange || {};
            const hasRange =
              Number.isFinite(Number(range?.start)) && Number.isFinite(Number(range?.end));
            const rangeText = hasRange ? `Q${Number(range.start)}-${Number(range.end)}` : "Question range";
            const blocksCount = Number(group?.blocksCount) || 0;
            const progressStatus = String(group?.progressStatus || group?.progression?.status || "available")
              .trim()
              .toLowerCase();
            const isLocked = progressStatus === "locked";

            if (isLocked) {
              return (
                <div
                  className="flex min-h-[104px] cursor-not-allowed items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 opacity-80"
                  key={group?.taskId || `${testId}-${partNumber}`}
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-500 shadow-sm">
                    <Headphones className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {String(group?.testTitle || testId).trim()} - Part {partNumber}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {rangeText} | {blocksCount} block(s)
                    </p>
                  </div>
                  <span className="inline-flex min-w-[6.5rem] items-center justify-center gap-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </span>
                </div>
              );
            }

            return (
              <Link
                className="group flex min-h-[104px] items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 transition hover:border-emerald-200/80 hover:bg-white"
                key={group?.taskId || `${testId}-${partNumber}`}
                to={`/student/tests/listening/by-part/${encodeURIComponent(testId)}/${encodeURIComponent(String(partNumber))}`}
              >
                <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                  <Headphones className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {String(group?.testTitle || testId).trim()} - Part {partNumber}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {rangeText} | {blocksCount} block(s)
                  </p>
                </div>
                <span className="relative h-[1.1rem] min-w-[6.5rem] overflow-hidden text-center text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
                    <span>Open</span>
                    <span>Open</span>
                  </span>
                </span>
              </Link>
            );
          })}
          {groups.length === 0 ? (
            <p className="text-sm text-slate-600">No published part-by-part tasks found.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default StudentListeningByPartPage;
