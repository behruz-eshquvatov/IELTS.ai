import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Headphones } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import PracticeTipsCarousel from "../../components/student/PracticeTipsCarousel";

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

      <PracticeTipsCarousel tips={fullTestTips} />

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
