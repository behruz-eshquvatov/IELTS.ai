import StudentRecentCompleted from "../../components/student/StudentRecentCompleted";
import StudentStudyActivities from "../../components/student/StudentStudyActivities";
import StudentSummaryCards from "../../components/student/StudentSummaryCards";
import StudentTodayTasks from "../../components/student/StudentTodayTasks";

function StudentDashboardPage() {
  return (
    <div className="space-y-8">
      <StudentSummaryCards />

      <StudentStudyActivities />

      <StudentRecentCompleted />

      <StudentTodayTasks />
    </div>
  );
}

export default StudentDashboardPage;
