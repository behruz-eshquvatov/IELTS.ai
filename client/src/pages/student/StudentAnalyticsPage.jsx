import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import StudentAnalyticsAdvisor from "../../components/student/StudentAnalyticsAdvisor";
import StudentAnalyticsRangePicker from "../../components/student/StudentAnalyticsRangePicker";
import { AnalyticsSkeleton } from "../../components/ui/Skeleton";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import { getStudentAnalytics } from "../../services/studentService";

const StudentAnalyticsBandChart = lazy(() => import("../../components/student/StudentAnalyticsBandChart"));
const StudentAnalyticsTimeLineChart = lazy(() => import("../../components/student/StudentAnalyticsTimeLineChart"));
const StudentAnalyticsWeakSectionsTable = lazy(() => import("../../components/student/StudentAnalyticsWeakSectionsTable"));

const DEFAULT_SECTION_FILTERS = [
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "writing_task1", label: "Writing T1" },
  { value: "writing_task2", label: "Writing T2" },
];

function StudentAnalyticsSectionPicker({ options = DEFAULT_SECTION_FILTERS, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const safeOptions = Array.isArray(options) && options.length ? options : DEFAULT_SECTION_FILTERS;
  const activeOption = safeOptions.find((item) => item.value === value) || safeOptions[0];

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex min-w-[180px] items-center justify-between gap-3 rounded-none border border-slate-200/90 bg-[#fffaf4] px-4 py-2.5 text-left transition hover:border-emerald-300/60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Task section
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-slate-900">
            {activeOption.label}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[180px] overflow-hidden rounded-none border border-slate-200/90 bg-[#fffaf4] shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)] transition ${
          isOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
        }`}
        role="listbox"
        aria-label="Task section options"
      >
        {safeOptions.map((option) => {
          const isActive = option.value === activeOption.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange?.(option.value);
                setIsOpen(false);
              }}
              className={`w-full border-b border-slate-200/70 px-4 py-2.5 text-left text-sm transition last:border-b-0 ${
                isActive
                  ? "emerald-gradient-fill font-semibold text-white"
                  : "text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-800"
              }`}
              role="option"
              aria-selected={isActive}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function buildDailyUnitChartData(rows = [], selectedSection = "reading") {
  const grouped = new Map();

  (Array.isArray(rows) ? rows : [])
    .filter((row) => String(row?.section || "") === selectedSection)
    .forEach((row) => {
      const key = String(row?.unitId || row?.unitLabel || "").trim();
      if (!key) {
        return;
      }

      const current = grouped.get(key) || {
        label: String(row?.unitLabel || "Unit").trim(),
        unitOrder: Number(row?.unitOrder) || grouped.size + 1,
        scores: [],
        correctCount: 0,
        totalQuestions: 0,
        hasAnswerCounts: false,
      };

      const score = Number(row?.score ?? row?.band);
      if (Number.isFinite(score)) {
        current.scores.push(score);
      }

      const correctCount = Number(row?.correctCount);
      const totalQuestions = Number(row?.totalQuestions);
      if (Number.isFinite(correctCount)) {
        current.correctCount += correctCount;
        current.hasAnswerCounts = true;
      }
      if (Number.isFinite(totalQuestions)) {
        current.totalQuestions += totalQuestions;
        current.hasAnswerCounts = true;
      }

      grouped.set(key, current);
    });

  return Array.from(grouped.values())
    .sort((left, right) => Number(left.unitOrder || 0) - Number(right.unitOrder || 0))
    .map((row) => {
      const score = row.scores.length
        ? row.scores.reduce((sum, value) => sum + value, 0) / row.scores.length
        : null;

      return {
        label: row.label,
        unitOrder: row.unitOrder,
        score: score === null ? null : Number(score.toFixed(1)),
        band: score === null ? null : Number(score.toFixed(1)),
        correctCount: row.hasAnswerCounts ? row.correctCount : null,
        totalQuestions: row.hasAnswerCounts ? row.totalQuestions : null,
      };
    });
}

export default function StudentAnalyticsPage() {
  const [range, setRange] = useLocalStorageState("student:analytics:range", "week");
  const [selectedSection, setSelectedSection] = useLocalStorageState("student:analytics:section", "reading");
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    async function loadAnalytics() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await getStudentAnalytics(range, { swr: true });
        if (isActive) {
          setAnalytics(response);
        }
      } catch (error) {
        if (isActive) {
          setAnalytics(null);
          setErrorMessage(error?.message || "Could not load analytics.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      isActive = false;
    };
  }, [range]);

  const sectionFilters = Array.isArray(analytics?.sectionFilters) && analytics.sectionFilters.length
    ? analytics.sectionFilters
    : DEFAULT_SECTION_FILTERS;
  const effectiveSection = sectionFilters.some((item) => item.value === selectedSection)
    ? selectedSection
    : sectionFilters[0]?.value || "reading";
  const selectedSectionLabel = sectionFilters.find((item) => item.value === effectiveSection)?.label || "Reading";
  const dailyUnitChartData = useMemo(
    () => buildDailyUnitChartData(analytics?.dailyUnitScores || [], effectiveSection),
    [analytics?.dailyUnitScores, effectiveSection],
  );

  return (
    <div className="space-y-10 -mt-1 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Analytics Overview
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <StudentAnalyticsRangePicker value={range} onChange={setRange} />
          <StudentAnalyticsSectionPicker
            options={sectionFilters}
            value={effectiveSection}
            onChange={setSelectedSection}
          />
        </div>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : null}

      {errorMessage ? (
        <div className="border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <Suspense fallback={<AnalyticsSkeleton />}>
          <StudentAnalyticsAdvisor insight={analytics?.aiInsight} />
          <div className="grid gap-6 xl:grid-cols-2">
            <StudentAnalyticsBandChart
              data={dailyUnitChartData}
              selectedSectionLabel={selectedSectionLabel}
            />
            <StudentAnalyticsTimeLineChart
              data={dailyUnitChartData}
              selectedSectionLabel={selectedSectionLabel}
            />
          </div>
          <StudentAnalyticsWeakSectionsTable
            range={range}
            weakSections={analytics?.weakSections || {}}
            sectionFilters={sectionFilters}
            selectedPart={effectiveSection}
            onSelectedPartChange={setSelectedSection}
            showSelector={false}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
