import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, BookOpenText } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import {
  buildReadingPracticeQueryParams,
  getReadingPracticeConfig,
} from "../../data/readingPractice";
import PracticeTipsCarousel from "../../components/student/PracticeTipsCarousel";

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

function summarizeBlockTypes(blocks = []) {
  const uniqueTypes = Array.from(
    new Set(
      (Array.isArray(blocks) ? blocks : [])
        .map((block) => String(block?.blockType || "").trim())
        .filter(Boolean),
    ),
  );
  if (uniqueTypes.length === 0) {
    return "No block types";
  }

  const preview = uniqueTypes.slice(0, 3).map((item) => toReadableLabel(item)).join(", ");
  const suffix = uniqueTypes.length > 3 ? ` +${uniqueTypes.length - 3}` : "";
  return `${preview}${suffix}`;
}

function StudentReadingPracticePage() {
  const { practiceKey: practiceKeyParam = "" } = useParams();
  const practiceKey = decodeValue(practiceKeyParam).toLowerCase();
  const practiceConfig = useMemo(() => getReadingPracticeConfig(practiceKey), [practiceKey]);

  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const tips = useMemo(() => {
    if (Array.isArray(practiceConfig?.tips) && practiceConfig.tips.length > 0) {
      return practiceConfig.tips;
    }

    return [
      "Read instructions first and confirm how answers should be transferred.",
      "Use passage evidence for every answer; avoid intuition-only choices.",
      "Recheck word limits and spelling before final submission.",
    ];
  }, [practiceConfig?.tips]);

  useEffect(() => {
    let isMounted = true;

    async function loadPracticeGroups() {
      if (!practiceConfig) {
        setGroups([]);
        setError("Unknown reading practice category.");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const params = buildReadingPracticeQueryParams(practiceConfig);
        const response = await apiRequest(`/reading/practice?${params.toString()}`, { auth: false });
        if (!isMounted) {
          return;
        }

        setGroups(Array.isArray(response?.groups) ? response.groups : []);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load reading practice tasks.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPracticeGroups();

    return () => {
      isMounted = false;
    };
  }, [practiceConfig]);

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

      <section className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Task Group</p>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">
          {practiceConfig?.title || "Reading Practice"}
        </h1>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading reading tasks...</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading && !error ? (
        <section className="space-y-3">
          {groups.map((group, index) => {
            const passage = group?.passage || null;
            if (!passage || !group?.passageId) {
              return null;
            }

            const taskTitle = `${practiceConfig?.title || "Reading"} Task ${index + 1}`;
            const subtitle = String(passage?.title || passage?._id || "Passage").trim();
            const blocks = Array.isArray(group?.blocks) ? group.blocks : [];

            return (
              <Link
                className="group flex min-h-[104px] items-center gap-4 rounded-none border border-slate-200/80 bg-white/90 px-5 py-5 transition hover:border-emerald-200/80 hover:bg-white"
                key={`${group.passageId}-${index}`}
                to={`/student/tests/reading/${encodeURIComponent(practiceKey)}/${encodeURIComponent(group.passageId)}`}
              >
                <span className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-600 shadow-sm transition group-hover:text-emerald-600">
                  <BookOpenText className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-slate-900">{taskTitle}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{subtitle}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {blocks.length} block(s) | {summarizeBlockTypes(blocks)}
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

          {groups.length === 0 ? (
            <p className="text-sm text-slate-600">
              No published tasks were found for this reading category.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default StudentReadingPracticePage;
