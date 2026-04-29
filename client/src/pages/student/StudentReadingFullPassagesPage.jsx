import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ReadingPassageWithBlocks from "../../components/student/ReadingPassageWithBlocks";
import { TestPageSkeleton } from "../../components/ui/Skeleton";
import { getReadingFullTestById } from "../../services/studentService";

const FULL_TEST_DURATION_SECONDS = 60 * 60;

function decodeValue(value) {
  try {
    return decodeURIComponent(String(value || "").trim());
  } catch {
    return String(value || "").trim();
  }
}

function StudentReadingFullPassagesPage() {
  const { testId: testIdParam = "" } = useParams();
  const [searchParams] = useSearchParams();
  const testId = decodeValue(testIdParam);
  const isDailyMode = String(searchParams.get("mode") || "").trim().toLowerCase() === "daily";
  const attemptCategory = isDailyMode ? "daily" : "additional";
  const sourceType = isDailyMode ? "daily_unit" : "reading_full";

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
        const response = await getReadingFullTestById(testId, { swr: true });
        if (!isMounted) {
          return;
        }

        const nextTest = response?.test || null;
        const progressStatus = String(nextTest?.progressStatus || nextTest?.progression?.status || "available")
          .trim()
          .toLowerCase();
        if (!isDailyMode && progressStatus === "locked") {
          setTest(null);
          setError("This full test is locked. Complete the previous additional task first.");
          return;
        }

        setTest(nextTest);
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
  }, [isDailyMode, testId]);

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
  const allPassageNumbers = useMemo(
    () =>
      testPassages.map((entry, index) =>
        Number.isFinite(Number(entry?.passageNumber)) ? Number(entry.passageNumber) : index + 1,
      ),
    [testPassages],
  );
  const activePassageNumber = Number.isFinite(Number(activePassageEntry?.passageNumber))
    ? Number(activePassageEntry.passageNumber)
    : activePassageIndex + 1;
  const flattenedEvaluationBlocks = useMemo(
    () =>
      testPassages.flatMap((entry) =>
        Array.isArray(entry?.blocks) ? entry.blocks : [],
      ),
    [testPassages],
  );
  const isFirstPassage = activePassageIndex <= 0;
  const isLastPassage = normalizedPassageCount <= 0 || activePassageIndex >= normalizedPassageCount - 1;
  const handleAttemptSubmit = useCallback(
    async (attemptPayload) => {
      const resolvedTestId = String(test?._id || testId || "").trim();
      if (!resolvedTestId) {
        return;
      }

      await apiRequest(`/reading/full-tests/${encodeURIComponent(resolvedTestId)}/submit`, {
        method: "POST",
        body: {
          attemptCategory,
          sourceType,
          submitReason: String(attemptPayload?.submitReason || "manual"),
          forceReason: String(attemptPayload?.forceReason || ""),
          evaluation: attemptPayload?.evaluation || {},
          passageTiming: Array.isArray(attemptPayload?.passageTiming) ? attemptPayload.passageTiming : [],
        },
      });
    },
    [attemptCategory, sourceType, test?._id, testId],
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

      {isLoading ? <TestPageSkeleton /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error && test ? (
        <section className="space-y-6">
          <article className="space-y-4 bg-white">
            {testPassages.length > 0 ? (
              <div>

                {activePassageEntry?.passage ? (
                  <ReadingPassageWithBlocks
                    activePassageNumber={activePassageNumber}
                    allPassageNumbers={allPassageNumbers}
                    attemptDurationSeconds={FULL_TEST_DURATION_SECONDS}
                    attemptSessionKey={`student:reading:full-test:${String(test?._id || testId || "unknown")}`}
                    blocks={Array.isArray(activePassageEntry?.blocks) ? activePassageEntry.blocks : []}
                    evaluationBlocks={flattenedEvaluationBlocks}
                    isSecondaryActionVisible={!isFirstPassage}
                    onPrimaryAction={
                      isLastPassage
                        ? null
                        : () => {
                          setActivePassageIndex((previousIndex) => Math.min(previousIndex + 1, testPassages.length - 1));
                        }
                    }
                    onSecondaryAction={() => {
                      setActivePassageIndex((previousIndex) => Math.max(previousIndex - 1, 0));
                    }}
                    passage={activePassageEntry.passage}
                    onAttemptSubmit={handleAttemptSubmit}
                    primaryActionLabel={isLastPassage ? "Complete" : "Next"}
                    resetOnContentChange={false}
                    secondaryActionLabel="Previous"
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
