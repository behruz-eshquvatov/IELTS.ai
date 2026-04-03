import StudentHeroBlock from "../../components/student/StudentHeroBlock";
import StudentRecentCompleted from "../../components/student/StudentRecentCompleted";
import StudentStudyActivities from "../../components/student/StudentStudyActivities";
import StudentSummaryCards from "../../components/student/StudentSummaryCards";
import StudentTodayTasks from "../../components/student/StudentTodayTasks";

function StudentDashboardPage() {
  return (
    <div className="space-y-8">
      <StudentHeroBlock />

      <StudentSummaryCards />

      <StudentStudyActivities />

      <StudentRecentCompleted />

      <StudentTodayTasks />
    </div>
  );
}

export default StudentDashboardPage;
