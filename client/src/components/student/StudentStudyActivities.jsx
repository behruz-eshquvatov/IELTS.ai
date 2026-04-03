import { memo } from "react";
import StudentActivityHeatmap from "./StudentActivityHeatmap";

const activityMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

const activityData = Array(365).fill(0);
const monthStart = {
  nov: 214,
  dec: 244,
  jan: 275,
  feb: 306,
  mar: 334,
};
const lightDays = [
  monthStart.nov + 1,
  monthStart.nov + 2,
  monthStart.nov + 5,
  monthStart.nov + 12,
  monthStart.nov + 20,
  monthStart.dec + 4,
  monthStart.dec + 10,
  monthStart.dec + 22,
  monthStart.jan + 3,
  monthStart.jan + 18,
  monthStart.feb + 6,
  monthStart.feb + 16,
  monthStart.mar + 2,
  monthStart.mar + 9,
  monthStart.mar + 24,
];
const mediumDays = [
  monthStart.nov + 7,
  monthStart.nov + 18,
  monthStart.dec + 6,
  monthStart.dec + 15,
  monthStart.jan + 12,
  monthStart.jan + 27,
  monthStart.mar + 18,
];
const highDays = [
  monthStart.dec + 2,
  monthStart.jan + 8,
];
lightDays.forEach((day) => {
  activityData[day] = 1;
});
mediumDays.forEach((day) => {
  activityData[day] = 2;
});
highDays.forEach((day) => {
  activityData[day] = 3;
});

const StudentStudyActivities = memo(function StudentStudyActivities() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Study activities</h2>
      <StudentActivityHeatmap months={activityMonths} activityData={activityData} />
    </section>
  );
});

export default StudentStudyActivities;
