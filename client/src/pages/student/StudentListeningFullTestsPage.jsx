import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";

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

function StudentListeningFullTestsPage() {
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  const fullTestTips = [
    "Treat each full test like exam day: avoid pausing and keep strict timing across all parts.",
    "Write answers immediately while listening, then use transfer checks to catch spelling and number errors.",
    "If you miss one answer, move on fast. Recovering rhythm is more important than chasing a single gap.",
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadTests() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest("/listening-tests?status=published&limit=100", { auth: false });
        if (!isMounted) {
          return;
        }

        setTests(Array.isArray(response?.tests) ? response.tests : []);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load full listening tests.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadTests();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveTipIndex((previousIndex) => (previousIndex + 1) % fullTestTips.length);
    }, 40000);

    return () => window.clearInterval(intervalId);
  }, [fullTestTips.length]);

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

          {fullTestTips.map((tipText, index) => {
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
                previousIndex === 0 ? fullTestTips.length - 1 : previousIndex - 1,
              )
            }
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            aria-label="Next tip"
            className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-600 bg-slate-900 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 sm:right-2"
            onClick={() => setActiveTipIndex((previousIndex) => (previousIndex + 1) % fullTestTips.length)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading full tests...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {tests.map((test) => (
            <Link
              key={test._id}
              to={`/student/tests/listening/full/${encodeURIComponent(test._id)}`}
              className="group flex min-h-[104px] items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 transition hover:border-emerald-200/80 hover:bg-white"
            >
              <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                <Headphones className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-900">{test.title || test._id}</p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {toReadableLabel(test.module)} | {test.totalQuestions || 0} questions | {test.partsCount || 0} parts
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  Status: {toReadableLabel(test.status)} | Blocks: {test.totalBlocks || 0}
                </p>
              </div>
              <span className="relative h-[1.1rem] min-w-[6.5rem] overflow-hidden text-center text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
                  <span>Open</span>
                  <span>Open</span>
                </span>
              </span>
            </Link>
          ))}
          {tests.length === 0 ? <p className="text-sm text-slate-600">No published full tests found.</p> : null}
        </section>
      ) : null}
    </div>
  );
}

export default StudentListeningFullTestsPage;
