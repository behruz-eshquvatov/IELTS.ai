import StudentRecentCompleted from "../../components/student/StudentRecentCompleted";
import StudentStudyActivities from "../../components/student/StudentStudyActivities";
import StudentTodayTasks from "../../components/student/StudentTodayTasks";

function StudentDashboardPage() {
  return (
    <div className="space-y-10">
      <StudentStudyActivities />

      <StudentRecentCompleted />

      <StudentTodayTasks maxUnits={5} />
    </div>
  );
}

export default StudentDashboardPage;
