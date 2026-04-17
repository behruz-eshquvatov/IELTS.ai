import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ReadingPassageWithBlocks, { toReadableLabel } from "../../components/student/ReadingPassageWithBlocks";

function decodeValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

function StudentReadingFullPassagesPage() {
  const { testId: testIdParam = "" } = useParams();
  const testId = decodeValue(testIdParam);

  const [test, setTest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

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

  const testPassages = Array.isArray(test?.passages) ? test.passages : [];

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
              <div className="space-y-5">
                {testPassages.map((entry, index) => {
                  if (!entry?.passage) {
                    return (
                      <div
                        className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                        key={`missing-passage-${test?._id || "test"}-${index}`}
                      >
                        Passage {entry?.passageNumber || index + 1} is missing in `reading_passages`, so linked blocks were not rendered.
                      </div>
                    );
                  }

                  const range = entry?.questionRange || {};
                  const rangeLabel =
                    Number.isFinite(Number(range?.start)) && Number.isFinite(Number(range?.end))
                      ? `Questions ${Number(range.start)}-${Number(range.end)}`
                      : "";

                  return (
                    <ReadingPassageWithBlocks
                      blocks={Array.isArray(entry?.blocks) ? entry.blocks : []}
                      key={`${test?._id || "test"}-${entry?.passageId || index}`}
                      passage={entry.passage}
                      sectionMeta={rangeLabel}
                      sectionTitle={`Passage ${entry?.passageNumber || index + 1}`}
                    />
                  );
                })}
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
