import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Lock, LockOpen, PenLine } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import PracticeTipsCarousel from "../../components/student/PracticeTipsCarousel";

const ESSAY_TYPE_META = {
  opinion: {
    title: "Opinion Essays",
    tips: [
      "State your thesis clearly in the introduction and keep that position consistent.",
      "Use one main idea per body paragraph and support it with a concrete example.",
      "Conclude by restating your position without introducing a new argument.",
    ],
  },
  discussion: {
    title: "Discussion Essays",
    tips: [
      "Present both views fairly before giving your own clearly reasoned position.",
      "Use balanced paragraph structure so one side does not dominate by mistake.",
      "Link viewpoints logically with cohesive transitions and clear comparison language.",
    ],
  },
  advantages_disadvantages: {
    title: "Advantages & Disadvantages",
    tips: [
      "Identify the strongest benefits and drawbacks rather than listing many weak points.",
      "Keep balance unless the prompt asks you to decide which side is stronger.",
      "Use precise comparative language to weigh impact and significance.",
    ],
  },
  problem_solution: {
    title: "Problem & Solution",
    tips: [
      "Explain root causes clearly before proposing solutions.",
      "Provide practical and realistic solutions, not vague recommendations.",
      "Show how each solution addresses a specific problem.",
    ],
  },
  direct_question: {
    title: "Direct Questions",
    tips: [
      "Answer each question directly and explicitly in separate clear sections.",
      "Use topic sentences that mirror the exact wording of the question focus.",
      "Keep one coherent argument even when addressing multiple angles.",
    ],
  },
  two_part_question: {
    title: "Two-Part Questions",
    tips: [
      "Give equal development to both parts unless the prompt indicates otherwise.",
      "Use paragraphing that makes the two parts easy for the examiner to follow.",
      "Check that your conclusion reflects both answers, not just one.",
    ],
  },
  unknown: {
    title: "Other Task 2",
    tips: [
      "Identify the core question type first, then choose a matching structure.",
      "Write a clear thesis so your essay stays focused despite mixed wording.",
      "Prioritize coherence and argument clarity over formulaic templates.",
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

function StudentWritingTask2TypePage() {
  const { essayType: essayTypeParam = "" } = useParams();
  const essayType = normalizeText(essayTypeParam).toLowerCase();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const sectionMeta = useMemo(
    () =>
      ESSAY_TYPE_META[essayType] || {
        title: toReadableLabel(essayType) || "Writing Task 2",
        tips: [
          "Read the prompt carefully and identify the exact task requirement before planning.",
          "Use clear paragraphing with topic sentences and strong supporting examples.",
          "Leave time to check grammar, sentence clarity, and logical flow.",
        ],
      },
    [essayType],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [essayType]);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      if (!essayType) {
        setItems([]);
        setTotalPages(1);
        setError("Unknown Writing Task 2 type.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const query = new URLSearchParams({
          status: "published",
          essayType,
          page: String(currentPage),
          limit: String(pageSize),
        });

        const response = await apiRequest(`/writing-task2/items?${query.toString()}`, {
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

        setError(nextError.message || "Failed to load Writing Task 2 tasks.");
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
  }, [currentPage, essayType]);

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/tests/writingTask2"
        >
          <ChevronLeft className="h-4 w-4" />
          Writing Task 2
        </Link>
      </header>

      <PracticeTipsCarousel tips={sectionMeta.tips} />

      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Group</p>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">{sectionMeta.title}</h1>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading Writing Task 2 tasks...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {items.map((item) => {
            const progressStatus = String(item?.progressStatus || item?.progression?.status || "available")
              .trim()
              .toLowerCase();
            const isLocked = progressStatus === "locked";

            if (isLocked) {
              return (
                <div
                  key={item._id}
                  className="flex min-h-[104px] cursor-not-allowed items-center gap-4 rounded-none border border-l-4 border-l-slate-300 border-slate-300/80 bg-slate-50/90 px-5 py-5"
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-slate-200/80 text-slate-500 shadow-sm">
                    <PenLine className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-700">{`Writing Task 2 ${item?._id}`}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {toReadableLabel(item?.essayType)} | {toReadableLabel(item?.status)} | {Number(item?.instruction?.minWords || 250)} words
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{normalizeText(item?.questionTopic)}</p>
                  </div>
                  <span className="inline-flex min-w-[7.5rem] items-center justify-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-600">
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item._id}
                to={`/student/tests/writingTask2/${encodeURIComponent(item._id)}`}
                className="group flex min-h-[104px] items-center gap-4 rounded-none border border-l-4 border-l-emerald-500 border-emerald-300/70 bg-emerald-50/40 px-5 py-5 transition hover:border-emerald-400 hover:bg-white"
              >
                <span className="flex h-12 w-12 items-center justify-center bg-emerald-100/80 text-emerald-700 shadow-sm transition group-hover:bg-emerald-100 group-hover:text-emerald-700">
                  <PenLine className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">{`Writing Task 2 ${item?._id}`}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {toReadableLabel(item?.essayType)} | {toReadableLabel(item?.status)} | {Number(item?.instruction?.minWords || 250)} words
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{normalizeText(item?.questionTopic)}</p>
                </div>
                <span className="inline-flex min-w-[7.5rem] items-center justify-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-center text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <LockOpen className="h-3.5 w-3.5" />
                  Open
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

export default StudentWritingTask2TypePage;
