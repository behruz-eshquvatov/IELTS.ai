import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ReadingPassageWithBlocks from "../../components/student/ReadingPassageWithBlocks";

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

function StudentReadingFullPassagesPage() {
  const { testId: testIdParam = "" } = useParams();
  const testId = decodeValue(testIdParam);

  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePassageIndex, setActivePassageIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadFullTest() {
      if (!testId) {
        setTest(null);
        setError("Reading test id is missing.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest(`/reading/full-tests/${encodeURIComponent(testId)}?status=published`, {
          auth: false,
        });
        if (!isMounted) {
          return;
        }

        setTest(response?.test || null);
        setActivePassageIndex(0);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load full reading test.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadFullTest();

    return () => {
      isMounted = false;
    };
  }, [testId]);

  const testPassages = useMemo(() => (Array.isArray(test?.passages) ? test.passages : []), [test?.passages]);
  const normalizedPassageCount = testPassages.length;

  useEffect(() => {
    setActivePassageIndex((previousIndex) => {
      if (!Number.isFinite(previousIndex) || previousIndex < 0) {
        return 0;
      }

      if (normalizedPassageCount <= 0) {
        return 0;
      }

      return Math.min(previousIndex, normalizedPassageCount - 1);
    });
  }, [normalizedPassageCount]);

  const activePassageEntry = useMemo(
    () => testPassages[activePassageIndex] || null,
    [activePassageIndex, testPassages],
  );

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <header>
        <Link
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-slate-900"
          to="/student/tests/reading/full"
        >
          <ChevronLeft className="h-4 w-4" />
          Full reading tests
        </Link>
      </header>

      {isLoading ? <p className="text-sm text-slate-600">Loading full reading test...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error && test ? (
        <section className="space-y-6">
          <article className="space-y-4 border border-slate-200 bg-white p-5 sm:p-6">
            <header className="space-y-1 border-b border-slate-200 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                {toReadableLabel(test?.module || "academic")} | {toReadableLabel(test?.status || "unknown")}
              </p>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">
                {String(test?.title || test?._id || "Reading Test").trim()}
              </h1>
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
                {Number(test?.totalQuestions) || 0} questions | {testPassages.length} passage(s)
              </p>
            </header>

            {testPassages.length > 0 ? (
              <div className="space-y-4">
                {testPassages.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {testPassages.map((entry, index) => {
                      const isActive = index === activePassageIndex;
                      return (
                        <button
                          className={`inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                            isActive
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                              : "border-slate-300 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                          key={`passage-switch-${entry?.passageId || index}`}
                          onClick={() => setActivePassageIndex(index)}
                          type="button"
                        >
                          Passage {entry?.passageNumber || index + 1}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {activePassageEntry?.passage ? (
                  <ReadingPassageWithBlocks
                    blocks={Array.isArray(activePassageEntry?.blocks) ? activePassageEntry.blocks : []}
                    key={`${test?._id || "test"}-${activePassageEntry?.passageId || activePassageIndex}`}
                    passage={activePassageEntry.passage}
                    sectionMeta={(() => {
                      const range = activePassageEntry?.questionRange || {};
                      return Number.isFinite(Number(range?.start)) && Number.isFinite(Number(range?.end))
                        ? `Questions ${Number(range.start)}-${Number(range.end)}`
                        : "";
                    })()}
                    sectionTitle={`Passage ${activePassageEntry?.passageNumber || activePassageIndex + 1}`}
                  />
                ) : (
                  <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Passage {activePassageEntry?.passageNumber || activePassageIndex + 1} is missing in `reading_passages`, so linked blocks were not rendered.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-600">No passage map is attached to this test.</p>
            )}
          </article>
        </section>
      ) : null}
    </div>
  );
}

export default StudentReadingFullPassagesPage;
