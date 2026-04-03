import { createBrowserRouter, Navigate } from "react-router-dom";
import AppFrame from "../layouts/AppFrame";
import SiteLayout from "../layouts/SiteLayout";
import StudentLayout from "../layouts/StudentLayout";
import TeacherLayout from "../layouts/TeacherLayout";

export const router = createBrowserRouter([
  {
    element: <AppFrame />,
    children: [
      {
        path: "/student/auth",
        lazy: async () => ({
          Component: (await import("../pages/AuthPage")).default,
        }),
      },
      {
        path: "/student",
        element: <StudentLayout />,
        children: [
          {
            index: true,
            element: <Navigate replace to="/student/dashboard" />,
          },
          {
            path: "dashboard",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentDashboardPage")).default,
            }),
          },
          {
            path: "dailytasks",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentDailyTasksPage")).default,
            }),
          },
          {
            path: "tests/listening",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentListeningPage")).default,
            }),
          },
          {
            path: "tests/reading",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentReadingPage")).default,
            }),
          },
          {
            path: "tests/writingTask1",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentWritingTask1Page")).default,
            }),
          },
          {
            path: "tests/writingTask2",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentWritingTask2Page")).default,
            }),
          },
          {
            path: "tests/:testId",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentTestOverviewPage")).default,
            }),
          },
          {
            path: "tests/:testId/start",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentTestStartPage")).default,
            }),
          },
          {
            path: "results",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentResultsPage")).default,
            }),
          },
          {
            path: "results/:attemptId",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentResultDetailPage")).default,
            }),
          },
          {
            path: "analytics",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentAnalyticsPage")).default,
            }),
          },
          {
            path: "profile",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentProfilePage")).default,
            }),
          },
          {
            path: "assignments",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentAssignmentsPage")).default,
            }),
          },
          {
            path: "assignments/:assignmentId",
            lazy: async () => ({
              Component: (await import("../pages/student/StudentAssignmentDetailPage")).default,
            }),
          },
        ],
      },
      {
        path: "/teacher",
        element: <TeacherLayout />,
        children: [
          {
            index: true,
            element: <Navigate replace to="/teacher/classes" />,
          },
          {
            path: "classes",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherClassesPage")).default,
            }),
          },
          {
            path: "classes/:classId",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherClassOverviewPage")).default,
            }),
          },
          {
            path: "students",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherStudentsPage")).default,
            }),
          },
          {
            path: "students/:studentId",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherStudentDetailPage")).default,
            }),
          },
          {
            path: "assignments",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherAssignmentsPage")).default,
            }),
          },
          {
            path: "assignments/create",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherCreateAssignmentPage")).default,
            }),
          },
          {
            path: "submissions",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherSubmissionsPage")).default,
            }),
          },
          {
            path: "reports",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherReportsPage")).default,
            }),
          },
          {
            path: "settings",
            lazy: async () => ({
              Component: (await import("../pages/teacher/TeacherSettingsPage")).default,
            }),
          },
        ],
      },
      {
        path: "/student/forgot-password",
        lazy: async () => ({
          Component: (await import("../pages/ForgotPasswordPage")).default,
        }),
      },
      {
        path: "/teachers/auth",
        lazy: async () => ({
          Component: (await import("../pages/TeacherRegistrationPage")).default,
        }),
      },
      {
        path: "/teachers/forgot-password",
        lazy: async () => ({
          Component: (await import("../pages/ForgotPasswordPage")).default,
        }),
      },
      {
        path: "/auth",
        element: <Navigate replace to="/student/auth" />,
      },
      {
        path: "/forgot-password",
        element: <Navigate replace to="/student/forgot-password" />,
      },
      {
        path: "/teacher-registration",
        element: <Navigate replace to="/teachers/auth" />,
      },
      {
        path: "/",
        element: <SiteLayout />,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import("../pages/LandingPage")).default,
            }),
          },
          {
            path: "*",
            lazy: async () => ({
              Component: (await import("../pages/NotFoundPage")).default,
            }),
          },
        ],
      },
    ],
  },
]);
