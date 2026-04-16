import { memo } from "react";
import StudentActivityHeatmap from "./StudentActivityHeatmap";

const StudentStudyActivities = memo(function StudentStudyActivities() {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Study activities
      </h2>
      <StudentActivityHeatmap />
    </section>
  );
});

export default StudentStudyActivities;
