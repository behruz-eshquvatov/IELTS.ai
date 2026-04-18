import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, BookOpenText } from "lucide-react";
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

function StudentReadingFullTestsPage() {
  const [tests, setTests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const tips = [
    "Treat full reading sets as timed simulation and keep passage pacing consistent.",
    "Mark difficult items quickly and return after completing easier questions.",
    "Use final minutes to verify transferred answers and question-number alignment.",
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadTests() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest("/reading/full-tests?status=published", { auth: false });
        if (!isMounted) {
          return;
        }

        setTests(Array.isArray(response?.tests) ? response.tests : []);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load full reading tests.");
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
          to="/student/tests/reading"
        >
          <ChevronLeft className="h-4 w-4" />
          Reading library
        </Link>
      </header>

      <PracticeTipsCarousel tips={tips} />

      {isLoading ? <p className="text-sm text-slate-600">Loading full reading tests...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {tests.map((test) => {
            const passages = Array.isArray(test?.passages) ? test.passages : [];
            return (
              <Link
                className="group flex min-h-[104px] items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 transition hover:border-emerald-200/80 hover:bg-white"
                key={test?._id || test?.title}
                to={`/student/tests/reading/full/${encodeURIComponent(String(test?._id || ""))}`}
              >
                <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                  <BookOpenText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">
                    {String(test?.title || test?._id || "Reading Test").trim()}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {toReadableLabel(test?.module || "academic")} | {toReadableLabel(test?.status || "published")}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {Number(test?.totalQuestions) || 0} questions | {passages.length} passage(s)
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

          {tests.length === 0 ? (
            <p className="text-sm text-slate-600">No published full reading tests found.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default StudentReadingFullTestsPage;
