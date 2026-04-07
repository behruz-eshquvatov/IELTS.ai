import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Lock, PenLine } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";

function StudentTestOverviewPage() {
  const { testId } = useParams();
  const [opinionSets, setOpinionSets] = useState([]);
  const [isLoadingOpinionSets, setIsLoadingOpinionSets] = useState(false);
  const [opinionSetsError, setOpinionSetsError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOpinionSets() {
      if (testId !== "writingTask2-opinion") {
        return;
      }

      setIsLoadingOpinionSets(true);
      setOpinionSetsError("");

      try {
        const response = await apiRequest("/writing-task2-opinion", { auth: false });
        const prompts = Array.isArray(response?.prompts) ? response.prompts : [];

        if (isMounted) {
          setOpinionSets(prompts);
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
  }, [testId]);

  if (testId === "writingTask2-opinion") {
    return (
      <div className="space-y-6">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
            Writing Task 2
          </p>
          <h1 className="text-3xl font-semibold">Opinion Essay Guidance</h1>
        </header>

        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Before You Start
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Take a clear position in the introduction, keep one main idea per body paragraph, and
            support claims with specific examples. Aim for logical progression from opinion to
            evidence to mini-conclusion in each paragraph.
          </p>
          <p className="text-sm font-medium text-slate-700">
            Use simple structure first, then upgrade vocabulary
          </p>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Writing Sets
          </p>
          {isLoadingOpinionSets ? (
            <p className="text-sm text-slate-600">Loading writing sets...</p>
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
                : "Writing Task 2 . Opinion essay . 40 minutes";

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
                      <p className="truncate text-sm font-semibold text-slate-900">{promptTitle}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">
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
                    <p className="truncate text-sm font-semibold text-slate-900">{promptTitle}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">
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
