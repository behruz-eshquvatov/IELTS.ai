import StudentAnalyticsOverview from "../../components/student/StudentAnalyticsOverview";
import StudentAnalyticsAdvisor from "../../components/student/StudentAnalyticsAdvisor";
import StudentAnalyticsBandChart from "../../components/student/StudentAnalyticsBandChart";
import StudentAnalyticsTimeLineChart from "../../components/student/StudentAnalyticsTimeLineChart";
import StudentAnalyticsWeakSectionsTable from "../../components/student/StudentAnalyticsWeakSectionsTable";
import StudentActivityHeatmap from "../../components/student/StudentActivityHeatmap";
import StudentAnalyticsRangePicker from "../../components/student/StudentAnalyticsRangePicker";
import useLocalStorageState from "../../hooks/useLocalStorageState";

export default function StudentAnalyticsPage() {
  const [range, setRange] = useLocalStorageState("student:analytics:range", "week");

  return (
    <div className="space-y-10 -mt-1 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Analytics Overview
        </h2>
        <StudentAnalyticsRangePicker value={range} onChange={setRange} />
      </div>
      <StudentAnalyticsOverview range={range} showHeader={false} />
      <StudentAnalyticsAdvisor range={range} />
      <div className="grid gap-6 xl:grid-cols-2">
        <StudentAnalyticsBandChart range={range} />
        <StudentAnalyticsTimeLineChart range={range} />
      </div>
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Practice consistency
        </h2>
        <StudentActivityHeatmap />
      </section>
      <StudentAnalyticsWeakSectionsTable range={range} />
    </div>
  );
}
