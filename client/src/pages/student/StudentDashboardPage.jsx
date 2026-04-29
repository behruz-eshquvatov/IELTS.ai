import { useEffect, useState } from "react";
import StudentRecentCompleted from "../../components/student/StudentRecentCompleted";
import StudentStudyActivities from "../../components/student/StudentStudyActivities";
import StudentTodayTasks from "../../components/student/StudentTodayTasks";
import { getCachedDashboardData, getDashboardData, subscribeDashboardData } from "../../services/studentService";
import { AnalyticsSkeleton } from "../../components/ui/Skeleton";

function StudentDashboardPage() {
  const cachedDashboard = getCachedDashboardData();
  const [dashboardData, setDashboardData] = useState(cachedDashboard);
  const [isLoading, setIsLoading] = useState(!cachedDashboard);
  const [errorMessage, setErrorMessage] = useState("");
  const hasDashboardData = Boolean(dashboardData);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = subscribeDashboardData((nextData, nextError) => {
      if (!isMounted || !nextData) {
        return;
      }

      setDashboardData(nextData);
      setIsLoading(false);
      if (nextError) {
        setErrorMessage(nextError?.message || "Failed to refresh dashboard data.");
      }
    });

    const loadDashboard = async () => {
      setErrorMessage("");
      try {
        const response = await getDashboardData({ swr: true });
        if (!isMounted) {
          return;
        }
        setDashboardData(response);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error?.message || "Failed to load dashboard.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  if (isLoading && !hasDashboardData) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="space-y-10">
      {errorMessage && !hasDashboardData ? (
        <div className="border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <StudentStudyActivities
        entries={Array.isArray(dashboardData?.heatmap?.entries) ? dashboardData.heatmap.entries : []}
      />

      <StudentRecentCompleted
        itemsData={Array.isArray(dashboardData?.recentAttempts?.items) ? dashboardData.recentAttempts.items : []}
        isLoadingData={false}
      />

      <StudentTodayTasks
        maxUnits={5}
        unitsData={Array.isArray(dashboardData?.dailyTasks?.units) ? dashboardData.dailyTasks.units : []}
        isLoadingData={false}
        errorData={errorMessage}
      />
    </div>
  );
}

export default StudentDashboardPage;
