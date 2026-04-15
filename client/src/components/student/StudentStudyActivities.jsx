import { memo, useEffect, useMemo, useState } from "react";
import StudentActivityHeatmap from "./StudentActivityHeatmap";
import { apiRequest } from "../../lib/apiClient";
import { buildBlankCalendarHeatmap } from "../../lib/heatmapCalendar";

const StudentStudyActivities = memo(function StudentStudyActivities() {
  const [dynamicHeatmap, setDynamicHeatmap] = useState(null);
  const [todayStudyMinutes, setTodayStudyMinutes] = useState(0);
  const blankHeatmap = useMemo(() => buildBlankCalendarHeatmap(), []);

  useEffect(() => {
    let cancelled = false;

    async function loadStudyActivity() {
      try {
        const response = await apiRequest("/students/me/study-activity/heatmap");

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
    const intervalId = window.setInterval(loadStudyActivity, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Study activities
      </h2>
      <StudentActivityHeatmap
        months={dynamicHeatmap?.months?.length ? dynamicHeatmap.months : blankHeatmap.months}
        monthTicks={dynamicHeatmap?.monthTicks?.length ? dynamicHeatmap.monthTicks : blankHeatmap.monthTicks}
        activityData={
          dynamicHeatmap?.activityData?.length ? dynamicHeatmap.activityData : blankHeatmap.activityData
        }
        visibilityData={
          dynamicHeatmap?.visibilityData?.length ? dynamicHeatmap.visibilityData : blankHeatmap.visibilityData
        }
      />
      <p className="text-sm text-slate-600">
        Today's study time:{" "}
        <span className="font-semibold text-slate-900">{todayStudyMinutes} minutes</span>
      </p>
    </section>
  );
});

export default StudentStudyActivities;
