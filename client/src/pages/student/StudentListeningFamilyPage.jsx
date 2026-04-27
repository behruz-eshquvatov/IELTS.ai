import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Headphones, Lock } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import {
  buildListeningPracticeQueryParams,
  getListeningPracticeConfig,
} from "../../data/listeningPractice";
import PracticeTipsCarousel from "../../components/student/PracticeTipsCarousel";
import { LibraryListSkeleton } from "../../components/ui/Skeleton";

function decodeValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

function toReadableLabel(value) {
  const safe = String(value || "").trim();
  if (!safe) {
    return "Unknown";
  }

  return safe
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
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

  return [
    1,
    "ellipsis-left",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis-right",
    totalPages,
  ];
}

function StudentListeningFamilyPage() {
  const { practiceKey: practiceKeyParam = "" } = useParams();
  const practiceKey = decodeValue(practiceKeyParam).toLowerCase();
  const practiceConfig = useMemo(
    () => getListeningPracticeConfig(practiceKey),
    [practiceKey],
  );

  const [blocks, setBlocks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [practiceKey]);

  useEffect(() => {
    let isMounted = true;

    async function loadBlocks() {
      if (!practiceConfig) {
        setBlocks([]);
        setTotalPages(1);
        setError("Unknown listening category.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const params = buildListeningPracticeQueryParams(practiceConfig, {
          page: String(currentPage),
          limit: String(pageSize),
        });
        const response = await apiRequest(`/listening-blocks/practice?${params.toString()}`);
        if (!isMounted) {
          return;
        }

        const nextBlocks = Array.isArray(response?.blocks) ? response.blocks : [];
        const nextTotalPages = Number(response?.pagination?.totalPages) || 1;
        const nextPage = Number(response?.pagination?.page) || currentPage;

        setBlocks(nextBlocks);
        setTotalPages(nextTotalPages);
        if (nextPage !== currentPage) {
          setCurrentPage(nextPage);
        }
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load listening resources.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadBlocks();

    return () => {
      isMounted = false;
    };
  }, [currentPage, practiceConfig]);

  const pageTitle = practiceConfig?.title || "Listening Practice";
  const familyTaskTitlePrefix = `${pageTitle} Task`;
  const listeningTips = useMemo(() => {
    if (Array.isArray(practiceConfig?.tips) && practiceConfig.tips.length > 0) {
      return practiceConfig.tips;
    }

    return [
      "Skim instructions first and confirm answer format before audio starts.",
      "Keep answers exact. Spelling and word limits matter.",
      "Recover quickly after a missed item and continue with the next cue.",
    ];
  }, [practiceConfig?.tips]);

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

      <PracticeTipsCarousel tips={listeningTips} />

      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Group</p>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">{pageTitle}</h1>
      </section>

      {isLoading ? <LibraryListSkeleton /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {blocks.map((block, index) => {
            const taskNumber = (currentPage - 1) * pageSize + index + 1;
            const taskTitle = `${familyTaskTitlePrefix} ${taskNumber}`;
            const progressStatus = String(block?.progressStatus || block?.progression?.status || "available")
              .trim()
              .toLowerCase();
            const isLocked = progressStatus === "locked";

            if (isLocked) {
              return (
                <div
                  key={block._id}
                  className="flex min-h-[104px] cursor-not-allowed items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 opacity-80"
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-500 shadow-sm">
                    <Headphones className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">{taskTitle}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {toReadableLabel(block.blockType)} | {block.questionsCount} questions
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
                key={block._id}
                to={`/student/tests/listening/${encodeURIComponent(practiceKey)}/${encodeURIComponent(block._id)}`}
                className="group flex min-h-[104px] items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 transition hover:border-emerald-200/80 hover:bg-white"
              >
                <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                  <Headphones className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">{taskTitle}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {toReadableLabel(block.blockType)} | {block.questionsCount} questions
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
          {blocks.length === 0 ? <p className="text-sm text-slate-600">No listening tasks found.</p> : null}
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

export default StudentListeningFamilyPage;
