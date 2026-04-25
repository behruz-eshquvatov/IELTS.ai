import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, BookOpenText, Lock } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import PracticeTipsCarousel from "../../components/student/PracticeTipsCarousel";

function StudentReadingByPassagePage() {
  const [passageGroups, setPassageGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const visiblePassageGroups = useMemo(
    () =>
      passageGroups.filter((group) => {
        const hasPassage = Boolean(group?.passage && group?.passageId);
        const blocks = Array.isArray(group?.blocks) ? group.blocks : [];
        return hasPassage && blocks.length > 0;
      }),
    [passageGroups],
  );

  const tips = [
    "Start each passage by mapping structure before touching questions.",
    "Track paragraph transitions to avoid losing question context.",
    "Finish one passage cleanly before moving to the next set.",
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadPassages() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest("/reading/passages-with-blocks?status=published");
        if (!isMounted) {
          return;
        }

        setPassageGroups(Array.isArray(response?.passages) ? response.passages : []);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load passage tasks.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPassages();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/tests/reading"
        >
          <ChevronLeft className="h-4 w-4" />
          Reading library
        </Link>
      </header>

      <PracticeTipsCarousel tips={tips} />

      {isLoading ? <p className="text-sm text-slate-600">Loading passages...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {visiblePassageGroups.map((group, index) => {
            const passage = group?.passage || null;
            if (!passage || !group?.passageId) {
              return null;
            }

            const passageLabel = Number.isFinite(Number(group?.passageNumber))
              ? `Passage ${Number(group.passageNumber)}`
              : `Passage ${index + 1}`;
            const blocks = Array.isArray(group?.blocks) ? group.blocks : [];
            const progressStatus = String(group?.progressStatus || group?.progression?.status || "available")
              .trim()
              .toLowerCase();
            const isLocked = progressStatus === "locked";

            if (isLocked) {
              return (
                <div
                  className="flex min-h-[104px] cursor-not-allowed items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 opacity-80"
                  key={`${group.passageId}-${index}`}
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-500 shadow-sm">
                    <BookOpenText className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">
                      {passageLabel} - {String(passage?.title || passage?._id || "Passage").trim()}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {blocks.length} block(s) linked to this passage
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
                key={`${group.passageId}-${index}`}
                to={`/student/tests/reading/by-passage/${encodeURIComponent(group.passageId)}`}
              >
                <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                  <BookOpenText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {passageLabel} - {String(passage?.title || passage?._id || "Passage").trim()}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {blocks.length} block(s) linked to this passage
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

          {visiblePassageGroups.length === 0 ? (
            <p className="text-sm text-slate-600">No passage tasks found.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default StudentReadingByPassagePage;
