import { createBrowserRouter, Navigate } from "react-router-dom";
import AppFrame from "../layouts/AppFrame";
import SiteLayout from "../layouts/SiteLayout";
import StudentLayout from "../layouts/StudentLayout";
import TeacherLayout from "../layouts/TeacherLayout";
import RoleProtectedRoute from "../components/auth/RoleProtectedRoute";

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
        element: <RoleProtectedRoute allowedRole="student" redirectTo="/student/auth" />,
        children: [
          {
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
                path: "analytics",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentAnalyticsPage")).default,
                }),
              },
              {
                path: "analytics/assistant",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentAnalyticsAssistantPage")).default,
                }),
              },
              {
                path: "profile",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentProfilePage")).default,
                }),
              },
            ],
          },
        ],
      },
      {
        path: "/teacher",
        element: <RoleProtectedRoute allowedRole="teacher" redirectTo="/teachers/auth" />,
        children: [
          {
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
