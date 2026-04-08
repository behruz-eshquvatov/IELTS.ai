import { useEffect, useMemo, useState } from "react";
import StudentAnalyticsOverview from "../../components/student/StudentAnalyticsOverview";
import StudentAnalyticsAdvisor from "../../components/student/StudentAnalyticsAdvisor";
import StudentAnalyticsBandChart from "../../components/student/StudentAnalyticsBandChart";
import StudentAnalyticsTimeLineChart from "../../components/student/StudentAnalyticsTimeLineChart";
import StudentAnalyticsWeakSectionsTable from "../../components/student/StudentAnalyticsWeakSectionsTable";
import StudentActivityHeatmap from "../../components/student/StudentActivityHeatmap";
import StudentAnalyticsRangePicker from "../../components/student/StudentAnalyticsRangePicker";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import { apiRequest } from "../../lib/apiClient";
import { getStoredUser } from "../../lib/authSession";

const heatmapMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function generateActivityData(length) {
  return Array.from({ length }, (_, i) => {
    const dayOfWeek = i % 7;
    const cycle = Math.sin(i / 11);
    if (dayOfWeek === 6) return 0;
    if (cycle > 0.6) return 3;
    if (cycle > 0.1) return 2;
    if (dayOfWeek === 5) return 1;
    return i % 3 === 0 ? 1 : 0;
  });
}

const heatmapData = generateActivityData(365);

export default function StudentAnalyticsPage() {
  const [range, setRange] = useLocalStorageState("student:analytics:range", "week");
  const [dynamicHeatmap, setDynamicHeatmap] = useState(null);
  const [todayStudyMinutes, setTodayStudyMinutes] = useState(0);

  const studentId = useMemo(
    () => String(getStoredUser()?.email || "").trim().toLowerCase(),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadStudyActivity() {
      if (!studentId) {
        return;
      }

      try {
        await apiRequest(`/students/${encodeURIComponent(studentId)}/study-activity/visit`, {
          method: "POST",
        });
      } catch {
        // Keep UI working even if visit tracking fails.
      }

      try {
        const response = await apiRequest(
          `/students/${encodeURIComponent(studentId)}/study-activity/heatmap`,
        );

        if (cancelled) {
          return;
        }

        setDynamicHeatmap(response?.heatmap ?? null);
        setTodayStudyMinutes(
          Number.isFinite(Number(response?.todaysStudyTimeMinutes))
            ? Number(response.todaysStudyTimeMinutes)
            : 0,
        );
      } catch {
        if (!cancelled) {
          setDynamicHeatmap(null);
          setTodayStudyMinutes(0);
        }
      }
    }

    loadStudyActivity();

    return () => {
      cancelled = true;
    };
  }, [studentId]);

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
        <StudentActivityHeatmap
          months={dynamicHeatmap?.months?.length ? dynamicHeatmap.months : heatmapMonths}
          activityData={dynamicHeatmap?.activityData?.length ? dynamicHeatmap.activityData : heatmapData}
        />
        <p className="text-sm text-slate-600">
          Today's study time:{" "}
          <span className="font-semibold text-slate-900">{todayStudyMinutes} minutes</span>
        </p>
      </section>
      <StudentAnalyticsWeakSectionsTable range={range} />
    </div>
  );
}
