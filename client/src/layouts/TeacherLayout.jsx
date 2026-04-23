import {
  BarChart,
  ClipboardList,
  FileText,
  LogOut,
  Plus,
  Settings2,
  Users,
  User,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { authApi } from "../lib/apiClient";
import { clearAuthSession } from "../lib/authSession";
import MagneticButton from "../components/ui/MagneticButton";

const navGroups = [
  {
    title: "Workspace",
    items: [
      { label: "Classes", to: "/teacher/classes", icon: Users },
      { label: "Students", to: "/teacher/students", icon: User },
      { label: "Assignments", to: "/teacher/assignments", icon: ClipboardList },
    ],
  },
  {
    title: "Review",
    items: [
      { label: "Submissions", to: "/teacher/submissions", icon: FileText },
      { label: "Reports", to: "/teacher/reports", icon: BarChart },
    ],
  },
  {
    title: "Settings",
    items: [
      { label: "Teacher Settings", to: "/teacher/settings", icon: Settings2 },
    ],
  },
];

function getTeacherRouteTitle(pathname) {
  if (pathname === "/teacher" || pathname === "/teacher/classes") {
    return "Classes";
  }
  if (pathname.startsWith("/teacher/classes/")) {
    return "Live Classroom";
  }
  if (pathname === "/teacher/students") {
    return "Student Directory";
  }
  if (pathname.startsWith("/teacher/students/")) {
    return "Student Detail";
  }
  if (pathname === "/teacher/assignments/create") {
    return "Create Assignment";
  }
  if (pathname === "/teacher/assignments") {
    return "Assignments Management";
  }
  if (pathname === "/teacher/submissions") {
    return "Submissions Review";
  }
  if (pathname === "/teacher/reports") {
    return "Reports";
  }
  if (pathname === "/teacher/settings") {
    return "Teacher Settings";
  }

  const last = pathname.split("/").filter(Boolean).pop();
  return last ? `${last.charAt(0).toUpperCase()}${last.slice(1)}` : "Teacher Panel";
}

function TeacherLayout() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const routeTitle = getTeacherRouteTitle(location.pathname);
  const isClassesRoute = location.pathname === "/teacher" || location.pathname === "/teacher/classes";

  const linkBase =
    "grid items-center rounded-none px-1 py-2 text-sm font-medium transition-all duration-300 ease-out";

  const isSidebarExpanded = isSidebarHovered;

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Local session clear should still happen.
    } finally {
      clearAuthSession();
      navigate("/teachers/auth");
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-slate-900 font-sans flex flex-col lg:flex-row">
      <aside
        className="relative w-20 shrink-0"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div
          className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-[#fbf8f2] transition-all duration-300 ease-in-out ${
            isSidebarExpanded ? "w-64" : "w-20"
          }`}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center border border-slate-200 text-sm font-semibold duration-300 ${
                  isSidebarExpanded ? "ml-0" : "ml-1"
                }`}
              >
                TH
              </div>
              <div
                className={`flex flex-col overflow-hidden transition-all duration-300 ${
                  isSidebarExpanded ? "opacity-100 w-auto translate-x-2" : "opacity-0 w-0 -translate-x-2"
                }`}
              >
                <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                  Teacher Hub
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
            <nav className="flex flex-col space-y-4 px-2">
              {navGroups.map((group, groupIndex) => (
                <div key={group.title} className="flex flex-col">
                  <div className="flex flex-col gap-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          title={!isSidebarExpanded ? item.label : undefined}
                          className={({ isActive }) =>
                            `${linkBase} ${
                              isSidebarExpanded ? "grid-cols-[56px_1fr]" : "grid-cols-[56px_0px]"
                            } ${
                              isActive
                                ? "emerald-gradient-fill text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]"
                                : "text-slate-600 hover:bg-emerald-100/70 hover:text-emerald-900"
                            }`
                          }
                        >
                          <span className="flex h-9 w-[56px] items-center justify-center">
                            {Icon && <Icon className="h-5 w-5 shrink-0" />}
                          </span>
                          <span
                            className={`whitespace-nowrap transition-all duration-300 ease-out ${
                              isSidebarExpanded
                                ? "max-w-[180px] opacity-100"
                                : "max-w-0 opacity-0 overflow-hidden"
                            }`}
                          >
                            {item.label}
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                  {groupIndex < navGroups.length - 1 ? (
                    <div className="mt-3 h-px bg-slate-200/80" />
                  ) : null}
                </div>
            ))}
          </nav>
        </div>

          <div className="border-t border-slate-100 p-2">
            <button
              className={`${linkBase} ${
                isSidebarExpanded ? "grid-cols-[56px_1fr]" : "grid-cols-[56px_0px]"
              } w-full border border-transparent text-left text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700`}
              onClick={handleLogout}
              type="button"
            >
              <span className="flex h-9 w-[56px] items-center justify-center">
                <LogOut className="h-5 w-5 shrink-0" />
              </span>
              <span
                className={`whitespace-nowrap transition-all duration-500 ease-out ${
                  isSidebarExpanded
                    ? "max-w-[180px] opacity-100"
                    : "max-w-0 opacity-0 overflow-hidden"
                }`}
              >
                Logout
              </span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-[#fbf8f2] px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{routeTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            {isClassesRoute ? (
              <MagneticButton
                className="rounded-full"
                disableGlow
                innerClassName="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)]"
                onClick={() => setIsAddClassModalOpen(true)}
                type="button"
              >
                Add class
                <Plus className="h-4 w-4" />
              </MagneticButton>
            ) : null}
          </div>
        </header>

        <div className="relative z-0 flex-1 overflow-hidden p-4 lg:p-8">
          <div className="relative z-10 mx-auto max-w-6xl">
            <Outlet
              context={{
                isAddClassModalOpen,
                onCloseAddClassModal: () => setIsAddClassModalOpen(false),
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default TeacherLayout;
