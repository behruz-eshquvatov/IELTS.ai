import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import {
  buildListeningPracticeQueryParams,
  getListeningPracticeConfig,
} from "../../data/listeningPractice";

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
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setCurrentPage(1);
    setActiveTipIndex(0);
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
        const response = await apiRequest(`/listening-blocks/practice?${params.toString()}`, {
          auth: false,
        });
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveTipIndex((previousIndex) => (previousIndex + 1) % listeningTips.length);
    }, 40000);

    return () => window.clearInterval(intervalId);
  }, [listeningTips.length]);

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

      <section className="relative overflow-hidden rounded-none border border-slate-800 bg-slate-950 px-6 py-5 sm:px-10 sm:py-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-slate-900/85 to-slate-950" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:34px_34px]" />

        <div className="relative z-10 min-h-[190px]">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
            Before You Start
          </p>

          {listeningTips.map((tipText, index) => {
            const isActive = index === activeTipIndex;

            return (
              <article
                className={`absolute inset-0 flex flex-col items-center justify-center px-10 text-center transition-opacity duration-700 ${
                  isActive ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                key={`${index}-${tipText.slice(0, 20)}`}
              >
                <p className="mx-auto max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">{tipText}</p>
              </article>
            );
          })}

          <button
            aria-label="Previous tip"
            className="absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-600 bg-slate-900 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 sm:left-2"
            onClick={() =>
              setActiveTipIndex((previousIndex) =>
                previousIndex === 0 ? listeningTips.length - 1 : previousIndex - 1,
              )
            }
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            aria-label="Next tip"
            className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-600 bg-slate-900 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 sm:right-2"
            onClick={() => setActiveTipIndex((previousIndex) => (previousIndex + 1) % listeningTips.length)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Group</p>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">{pageTitle}</h1>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading listening tasks...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {blocks.map((block, index) => {
            const taskNumber = (currentPage - 1) * pageSize + index + 1;
            const taskTitle = `${familyTaskTitlePrefix} ${taskNumber}`;

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
