import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Lock, PenLine } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import PracticeTipsCarousel from "../../components/student/PracticeTipsCarousel";
import { LibraryListSkeleton } from "../../components/ui/Skeleton";

const VISUAL_TYPE_META = {
  line_chart: {
    title: "Line Charts",
    tips: [
      "Start with an overview sentence covering the main trend direction across the period.",
      "Group similar trends together instead of describing every single data point.",
      "Use precise trend verbs such as rise, decline, level off, and fluctuate.",
    ],
  },
  bar_chart: {
    title: "Bar Charts",
    tips: [
      "Compare categories directly and highlight the biggest and smallest values first.",
      "Group bars with similar patterns in one paragraph to avoid repetitive listing.",
      "Use clear comparison language: higher than, lower than, while, whereas.",
    ],
  },
  pie_chart: {
    title: "Pie Charts",
    tips: [
      "Focus on major shares and key contrasts rather than every tiny slice.",
      "Combine proportions logically, for example by ranking largest to smallest.",
      "Use percentage language accurately and keep tense consistent.",
    ],
  },
  table: {
    title: "Tables",
    tips: [
      "Scan first for standout highs, lows, and notable gaps before writing details.",
      "Group related rows or columns to build coherent comparison paragraphs.",
      "Avoid copying numbers endlessly. Select only data that supports your overview.",
    ],
  },
  process_diagram: {
    title: "Process Diagrams",
    tips: [
      "Begin with an overview of total stages and whether the process is linear or cyclic.",
      "Describe steps in exact order using sequence connectors like first, then, finally.",
      "Use passive voice where suitable to focus on process steps over actors.",
    ],
  },
  map: {
    title: "Maps",
    tips: [
      "Start with the main overall changes before describing specific locations.",
      "Use directional language precisely: north, southeast, adjacent to, in the center.",
      "Group changes by area or type, such as new buildings, roads, and removed features.",
    ],
  },
  mixed_visual: {
    title: "Mixed Visuals",
    tips: [
      "Write one overview that links both visuals instead of treating them as separate tasks.",
      "Prioritize the strongest cross-visual comparisons and key numerical contrasts.",
      "Keep paragraphing clear so each paragraph has one comparison focus.",
    ],
  },
};

function normalizeText(value) {
  return String(value || "").trim();
}

function toReadableLabel(value) {
  return normalizeText(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getProgressStatus(item) {
  return String(item?.progressStatus || item?.progression?.status || "available")
    .trim()
    .toLowerCase();
}

function sortUnlockedFirst(first, second) {
  const firstLocked = getProgressStatus(first) === "locked";
  const secondLocked = getProgressStatus(second) === "locked";

  if (firstLocked === secondLocked) {
    return 0;
  }

  return firstLocked ? 1 : -1;
}

function getTaskTitle(item) {
  const question = normalizeText(item?.questionTopic || item?.question || item?.prompt);
  return `Writing Task 1${question ? `: ${question}` : ""}`;
}

function buildVisiblePageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis-right", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis-left", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages];
}

function StudentWritingTask1TypePage() {
  const { visualType: visualTypeParam = "" } = useParams();
  const visualType = normalizeText(visualTypeParam).toLowerCase();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const sectionMeta = VISUAL_TYPE_META[visualType] || {
    title: toReadableLabel(visualType) || "Writing Task 1",
    tips: [
      "Start with an overview sentence covering the most important information.",
      "Group similar data together and avoid listing figures one by one.",
      "Use precise comparison language and keep your structure clear.",
    ],
  };

  const orderedItems = useMemo(
    () => [...items].sort(sortUnlockedFirst),
    [items],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [visualType]);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      if (!visualType) {
        setItems([]);
        setTotalPages(1);
        setError("Unknown Writing Task 1 visual type.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          status: "published",
          visualType,
          page: String(currentPage),
          limit: String(pageSize),
        });

        const response = await apiRequest(`/writing-task1/items?${query.toString()}`, {
        });

        if (!isMounted) {
          return;
        }

        const nextItems = Array.isArray(response?.items) ? response.items : [];
        const nextTotalPages = Number(response?.pagination?.totalPages) || 1;
        const nextPage = Number(response?.pagination?.page) || currentPage;

        setItems(nextItems);
        setTotalPages(nextTotalPages);
        if (nextPage !== currentPage) {
          setCurrentPage(nextPage);
        }
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load Writing Task 1 tasks.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [currentPage, visualType]);

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/tests/writingTask1"
        >
          <ChevronLeft className="h-4 w-4" />
          Writing Task 1
        </Link>
      </header>

      <PracticeTipsCarousel tips={sectionMeta.tips} />

      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">{sectionMeta.title}</h1>
      </section>

      {isLoading ? <LibraryListSkeleton /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {orderedItems.map((item) => {
            const progressStatus = getProgressStatus(item);
            const isLocked = progressStatus === "locked";

            if (isLocked) {
              return (
                <div
                  key={item._id}
                  className="flex min-h-[104px] cursor-not-allowed items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 opacity-80"
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-500 shadow-sm">
                    <PenLine className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-700">
                      {getTaskTitle(item)}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {toReadableLabel(item?.visualType)} | {toReadableLabel(item?.status)}
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
                key={item._id}
                to={`/student/tests/writingTask1/${encodeURIComponent(item._id)}`}
                className="group flex min-h-[104px] items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 transition hover:border-emerald-200/80 hover:bg-white"
              >
                <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                  <PenLine className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {getTaskTitle(item)}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {toReadableLabel(item?.visualType)} | {toReadableLabel(item?.status)}
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

          {items.length === 0 ? <p className="text-sm text-slate-600">No tasks found for this type.</p> : null}
        </section>
      ) : null}

      {!error && totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            aria-label="Previous page"
            className="inline-flex h-9 w-9 items-center justify-center border border-emerald-500 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white transition hover:from-emerald-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:border-emerald-300 disabled:from-emerald-300 disabled:to-emerald-200 disabled:opacity-70"
            disabled={isLoading || currentPage <= 1}
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {buildVisiblePageItems(currentPage, totalPages).map((item, index) => {
              if (typeof item !== "number") {
                return (
                  <span key={`${item}-${index}`} className="px-2 text-xs font-semibold tracking-[0.12em] text-slate-400">
                    ...
                  </span>
                );
              }

              const isActive = item === currentPage;
              return (
                <button
                  key={item}
                  className={`inline-flex h-9 min-w-9 items-center justify-center px-2 text-xs font-semibold tracking-[0.12em] transition ${
                    isActive
                      ? "border border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  disabled={isLoading}
                  onClick={() => setCurrentPage(item)}
                  type="button"
                >
                  {item}
                </button>
              );
            })}
          </div>

          <button
            aria-label="Next page"
            className="inline-flex h-9 w-9 items-center justify-center border border-emerald-500 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white transition hover:from-emerald-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:border-emerald-300 disabled:from-emerald-300 disabled:to-emerald-200 disabled:opacity-70"
            disabled={isLoading || currentPage >= totalPages}
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default StudentWritingTask1TypePage;
