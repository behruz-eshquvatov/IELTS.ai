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
                path: "results",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentResultsPage")).default,
                }),
              },
              {
                path: "results/:taskType/:taskMode/:taskRefId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentTaskResultHistoryPage")).default,
                }),
              },
              {
                path: "results/:taskType/:taskMode/:taskRefId/:attemptSlug",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentTaskResultHistoryPage")).default,
                }),
              },
              {
                path: "tests/listening",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningPage")).default,
                }),
              },
              {
                path: "tests/listening/full",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningFullTestsPage")).default,
                }),
              },
              {
                path: "tests/listening/full/:testId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningFullTestDetailPage")).default,
                }),
              },
              {
                path: "tests/listening/by-part",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningByPartPage")).default,
                }),
              },
              {
                path: "tests/listening/by-part/:testId/:partNumber",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningFullTestDetailPage")).default,
                }),
              },
              {
                path: "tests/listening/block/:blockId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningBlockPage")).default,
                }),
              },
              {
                path: "tests/listening/:practiceKey",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningFamilyPage")).default,
                }),
              },
              {
                path: "tests/listening/:practiceKey/:blockId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentListeningBlockPage")).default,
                }),
              },
              {
                path: "tests/reading",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentReadingPage")).default,
                }),
              },
              {
                path: "tests/reading/full",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentReadingFullTestsPage")).default,
                }),
              },
              {
                path: "tests/reading/full/:testId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentReadingFullPassagesPage")).default,
                }),
              },
              {
                path: "tests/reading/by-passage",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentReadingByPassagePage")).default,
                }),
              },
              {
                path: "tests/reading/by-passage/:passageId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentReadingPassageTaskPage")).default,
                }),
              },
              {
                path: "tests/reading/:practiceKey",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentReadingPracticePage")).default,
                }),
              },
              {
                path: "tests/reading/:practiceKey/:passageId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentReadingPracticeTaskPage")).default,
                }),
              },
              {
                path: "tests/writingTask1",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentWritingTask1Page")).default,
                }),
              },
              {
                path: "tests/writingTask1/type/:visualType",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentWritingTask1TypePage")).default,
                }),
              },
              {
                path: "tests/:testId/result",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentWritingTask2ResultPage")).default,
                }),
              },
              {
                path: "tests/writingTask1/:itemId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentWritingTask1TaskPage")).default,
                }),
              },
              {
                path: "tests/writingTask2",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentWritingTask2Page")).default,
                }),
              },
              {
                path: "tests/writingTask2/type/:essayType",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentWritingTask2TypePage")).default,
                }),
              },
              {
                path: "tests/writingTask2/:itemId",
                lazy: async () => ({
                  Component: (await import("../pages/student/StudentWritingTask2TaskPage")).default,
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
                path: "profile",
                lazy: async () => ({
                  Component: (await import("../pages/teacher/TeacherProfilePage")).default,
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
        path: "/student/reset-password",
        lazy: async () => ({
          Component: (await import("../pages/ResetPasswordPage")).default,
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
        path: "/teachers/reset-password",
        lazy: async () => ({
          Component: (await import("../pages/ResetPasswordPage")).default,
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
        path: "/reset-password",
        element: <Navigate replace to="/student/reset-password" />,
      },
      {
        path: "/teacher-registration",
        element: <Navigate replace to="/teachers/auth" />,
      },
      {
        path: "/super-admin/:password",
        lazy: async () => ({
          Component: (await import("../pages/SuperAdminPage")).default,
        }),
      },
      {
        path: "/super-admin/:password/listening",
        lazy: async () => ({
          Component: (await import("../pages/SuperAdminListeningPage")).default,
        }),
      },
      {
        path: "/super-admin/:password/writing-task1",
        lazy: async () => ({
          Component: (await import("../pages/SuperAdminWritingTask1Page")).default,
        }),
      },
      {
        path: "/super-admin/:password/writing-task2",
        lazy: async () => ({
          Component: (await import("../pages/SuperAdminWritingTask2Page")).default,
        }),
      },
      {
        path: "/super-admin/:password/reading",
        lazy: async () => ({
          Component: (await import("../pages/SuperAdminReadingPage")).default,
        }),
      },
      {
        path: "/super-admin/:password/daily-units",
        lazy: async () => ({
          Component: (await import("../pages/SuperAdminDailyUnitsPage")).default,
        }),
      },
      {
        path: "/super-admin/:password/organizations",
        lazy: async () => ({
          Component: (await import("../pages/SuperAdminOrganizationsPage")).default,
        }),
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
