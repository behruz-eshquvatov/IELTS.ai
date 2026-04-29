import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Lock, PenLine } from "lucide-react";
import { LibraryListSkeleton } from "../../components/ui/Skeleton";
import {
  getWritingOpinionSets,
  prefetchWritingOpinionSets,
} from "../../services/studentService";

const writingTask2Tips = [
  "Take a clear position in the introduction, keep one main idea per body paragraph, and support claims with specific examples. Aim for logical progression from opinion to evidence to mini-conclusion in each paragraph.",
  "Spend the first few minutes outlining your thesis, topic sentences, and examples. A simple plan helps you avoid repetition and keeps your argument focused.",
  "Use direct sentences and clear linking words. Prioritize clarity over complicated vocabulary so your ideas stay easy to follow under time pressure.",
];

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

function StudentTestOverviewPage() {
  const { testId } = useParams();
  const [opinionSets, setOpinionSets] = useState([]);
  const [isLoadingOpinionSets, setIsLoadingOpinionSets] = useState(false);
  const [opinionSetsError, setOpinionSetsError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTipIndex, setActiveTipIndex] = useState(0);
  const pageSize = 10;
  const pageTopRef = useRef(null);

  const scrollPageToTop = () => {
    if (typeof window === "undefined") {
      return;
    }

    pageTopRef.current?.scrollIntoView({ behavior: "auto", block: "start" });

    let parent = pageTopRef.current?.parentElement ?? null;
    while (parent) {
      const styles = window.getComputedStyle(parent);
      const isScrollable =
        (styles.overflowY === "auto" || styles.overflowY === "scroll") &&
        parent.scrollHeight > parent.clientHeight;

      if (isScrollable) {
        parent.scrollTop = 0;
      }

      parent = parent.parentElement;
    }

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  };

  const goToPage = (nextPage) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage === currentPage) {
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setCurrentPage(safePage);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(scrollPageToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [currentPage]);

  useEffect(() => {
    let isMounted = true;

    async function loadOpinionSets() {
      if (testId !== "writingTask2-opinion") {
        return;
      }

      setIsLoadingOpinionSets(true);
      setOpinionSetsError("");

      try {
        const response = await getWritingOpinionSets(currentPage, pageSize, { swr: true });
        const prompts = Array.isArray(response?.prompts) ? response.prompts : [];
        const nextTotalPages = Number(response?.pagination?.totalPages) || 1;
        const nextPage = Number(response?.pagination?.page) || currentPage;

        if (isMounted) {
          setOpinionSets(prompts);
          setTotalPages(nextTotalPages);
          if (nextPage !== currentPage) {
            setCurrentPage(nextPage);
          }

          if (nextPage < nextTotalPages) {
            void prefetchWritingOpinionSets(nextPage + 1, pageSize);
          }
        }
      } catch (error) {
        if (isMounted) {
          setOpinionSetsError(error.message || "Failed to load opinion essay sets.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingOpinionSets(false);
        }
      }
    }

    loadOpinionSets();

    return () => {
      isMounted = false;
    };
  }, [testId, currentPage]);

  useEffect(() => {
    if (testId === "writingTask2-opinion") {
      setCurrentPage(1);
      setTotalPages(1);
      setActiveTipIndex(0);
    }
  }, [testId]);

  useEffect(() => {
    if (testId !== "writingTask2-opinion") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveTipIndex((previousIndex) => (previousIndex + 1) % writingTask2Tips.length);
    }, 40000);

    return () => window.clearInterval(intervalId);
  }, [testId]);

  if (testId === "writingTask2-opinion") {
    return (
      <div className="space-y-8 py-4" ref={pageTopRef}>
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
            Writing Task 2
          </p>
        </header>

        <section className="relative overflow-hidden rounded-none border border-slate-800 bg-slate-950 px-6 py-5 sm:px-10 sm:py-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-slate-900/85 to-slate-950" />
          <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:34px_34px]" />

          <div className="relative z-10 min-h-[190px]">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
              Before You Start
            </p>

            {writingTask2Tips.map((tipText, index) => {
              const isActive = index === activeTipIndex;

              return (
                <article
                  className={`absolute inset-0 flex flex-col items-center justify-center px-10 text-center transition-opacity duration-700 ${isActive ? "opacity-100" : "pointer-events-none opacity-0"
                    }`}
                  key={`${index}-${tipText.slice(0, 20)}`}
                >
                  <p className="mx-auto max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">
                    {tipText}
                  </p>
                </article>
              );
            })}

            <button
              aria-label="Previous tip"
              className="absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-600 bg-slate-900 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 sm:left-2"
              onClick={() =>
                setActiveTipIndex((previousIndex) =>
                  previousIndex === 0 ? writingTask2Tips.length - 1 : previousIndex - 1,
                )
              }
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              aria-label="Next tip"
              className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-600 bg-slate-900 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 sm:right-2"
              onClick={() =>
                setActiveTipIndex((previousIndex) => (previousIndex + 1) % writingTask2Tips.length)
              }
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Writing Sets
          </p>
          {isLoadingOpinionSets ? (
            <LibraryListSkeleton count={4} />
          ) : null}
          {opinionSetsError ? (
            <p className="text-sm text-rose-600">{opinionSetsError}</p>
          ) : null}
          <div className="space-y-3">
            {opinionSets.map((setItem) => {
              const isUnlocked = setItem.accessStatus === "unlocked";
              const promptTitle = setItem.prompt || "Opinion essay prompt";
              const subTextLabel = Array.isArray(setItem.subText)
                ? setItem.subText.join(" . ")
                : "not found";

              if (isUnlocked) {
                return (
                  <Link
                    key={setItem.essayId}
                    to={`/student/tests/${testId}/start?set=${setItem.essayId}`}
                    className="group flex min-h-[104px] items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 transition hover:border-emerald-200/80 hover:bg-white"
                  >
                    <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                      <PenLine className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-slate-900">{promptTitle}</p>
                      <p className="mt-2 truncate text-xs text-slate-500">
                        {subTextLabel}
                      </p>
                    </div>
                    <span className="relative h-[1.1rem] min-w-[6.5rem] overflow-hidden text-center text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                      <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
                        <span>Start</span>
                        <span>Start</span>
                      </span>
                    </span>
                  </Link>
                );
              }

              return (
                <div
                  key={setItem.essayId}
                  className="flex min-h-[104px] cursor-not-allowed items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5"
                >
                  <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm">
                    <PenLine className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900">{promptTitle}</p>
                    <p className="mt-2 truncate text-xs text-slate-500">
                      {subTextLabel}
                    </p>
                  </div>
                  <span className="inline-flex min-w-[6.5rem] items-center justify-center gap-1 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </span>
                </div>
              );
            })}
            {!isLoadingOpinionSets && !opinionSetsError && opinionSets.length === 0 ? (
              <p className="text-sm text-slate-600">No writing sets found.</p>
            ) : null}
          </div>
          {!opinionSetsError && totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                aria-label="Previous page"
                className="inline-flex h-9 w-9 items-center justify-center border border-emerald-500 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white transition hover:from-emerald-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:border-emerald-300 disabled:from-emerald-300 disabled:to-emerald-200 disabled:opacity-70"
                disabled={isLoadingOpinionSets || currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {buildVisiblePageItems(currentPage, totalPages).map((item, index) => {
                  if (typeof item !== "number") {
                    return (
                      <span
                        key={`${item}-${index}`}
                        className="px-2 text-xs font-semibold tracking-[0.12em] text-slate-400"
                      >
                        ...
                      </span>
                    );
                  }

                  const isActive = item === currentPage;

                  return (
                    <button
                      key={item}
                      className={`inline-flex h-9 min-w-9 items-center justify-center px-2 text-xs font-semibold tracking-[0.12em] transition ${isActive
                        ? "border border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:text-slate-900"
                        }`}
                      disabled={isLoadingOpinionSets}
                      onClick={() => goToPage(item)}
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
                disabled={isLoadingOpinionSets || currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Test Overview
        </p>
        <h1 className="text-3xl font-semibold">Test {testId}</h1>
        <p className="text-slate-600">
          Review instructions, timing, and rules before starting.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Section</p>
          <p className="mt-2 text-lg font-semibold">Reading</p>
          <p className="mt-2 text-sm text-slate-600">40 questions - 60 minutes</p>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Rules</p>
          <p className="mt-2 text-sm text-slate-600">
            Timed environment, no pause after start, attempts saved automatically.
          </p>
        </div>
      </div>

      <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Instructions</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Read all directions before you begin.</li>
          <li>Answer every question; you can return to flagged items.</li>
          <li>Submit before time expires to record the attempt.</li>
        </ul>
      </div>

      <Link
        className="inline-flex items-center rounded-none bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900"
        to={`/student/tests/${testId}/start`}
      >
        Start test
      </Link>
    </div>
  );
}

export default StudentTestOverviewPage;
