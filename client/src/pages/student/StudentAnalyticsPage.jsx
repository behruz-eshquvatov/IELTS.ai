import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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
  const safeOptions = Array.isArray(options) && options.length ? options : DEFAULT_SECTION_FILTERS;
  const activeOption = safeOptions.find((item) => item.value === value) || safeOptions[0];

  return (
    <label className="relative block min-w-[180px] border border-slate-200/90 bg-[#fffaf4] px-4 py-2.5 transition focus-within:border-emerald-300/60">
      <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Task section
      </span>
      <select
        className="mt-0.5 block w-full appearance-none bg-transparent pr-8 text-sm font-semibold text-slate-900 outline-none"
        onChange={(event) => onChange?.(event.target.value)}
        value={activeOption.value}
      >
        {safeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </label>
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
