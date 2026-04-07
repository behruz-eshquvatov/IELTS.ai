import { memo } from "react";
import StudentActivityHeatmap from "./StudentActivityHeatmap";

// 1. Static Data Generation (Runs ONCE outside the React lifecycle)
// Generates a deterministic, realistic 365-day array (values 0-3 based on hours)
// Ready to be swapped with an API call later.
const generateStaticActivityData = () => {
  return Array.from({ length: 365 }, (_, i) => {
    const dayOfWeek = i % 7;
    // Creates organic-looking "waves" of study activity
    const streakFactor = Math.sin(i / 14); 

    if (dayOfWeek === 6) return 0; // e.g., Sundays usually off
    if (streakFactor > 0.6) return 3; // 3+ hours (Heavy study periods)
    if (streakFactor > 0) return 2;   // 2 hours
    if (dayOfWeek === 5) return 1;    // 1 hour (Light Fridays)
    return i % 4 === 0 ? 1 : 0;       // Scattered light days
  });
};

const activityData = generateStaticActivityData();
const activityMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const StudentStudyActivities = memo(function StudentStudyActivities() {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Study activities
      </h2>
      
      {/* Ensure this child component is also wrapped in memo() in its own file */}
      <StudentActivityHeatmap months={activityMonths} activityData={activityData} />

    </section>
  );
});

export default StudentStudyActivities;
