import { Suspense, lazy, useEffect, useState } from "react";
import StudentAnalyticsAdvisor from "../../components/student/StudentAnalyticsAdvisor";
import StudentAnalyticsRangePicker from "../../components/student/StudentAnalyticsRangePicker";
import { AnalyticsSkeleton } from "../../components/ui/Skeleton";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import { getStudentAnalytics } from "../../services/studentService";

const StudentAnalyticsBandChart = lazy(() => import("../../components/student/StudentAnalyticsBandChart"));
const StudentAnalyticsTimeLineChart = lazy(() => import("../../components/student/StudentAnalyticsTimeLineChart"));
const StudentAnalyticsWeakSectionsTable = lazy(() => import("../../components/student/StudentAnalyticsWeakSectionsTable"));

export default function StudentAnalyticsPage() {
  const [range, setRange] = useLocalStorageState("student:analytics:range", "week");
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

  return (
    <div className="space-y-10 -mt-1 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Analytics Overview
        </h2>
        <StudentAnalyticsRangePicker value={range} onChange={setRange} />
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
            <StudentAnalyticsBandChart range={range} data={analytics?.bandByDay || []} />
            <StudentAnalyticsTimeLineChart range={range} data={analytics?.timeSpent || []} />
          </div>
          <StudentAnalyticsWeakSectionsTable
            range={range}
            weakSections={analytics?.weakSections || {}}
            sectionFilters={analytics?.sectionFilters || []}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
