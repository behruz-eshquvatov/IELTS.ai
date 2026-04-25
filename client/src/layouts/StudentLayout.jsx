import {
  Bell,
  BookOpen,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  PenLine,
  PencilLine,
  UserCircle,
  LogOut,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { memo, useEffect, useRef, useState } from "react";
import ConfirmLeaveModal from "../components/student/ConfirmLeaveModal";
import { authApi } from "../lib/apiClient";
import { clearAuthSession } from "../lib/authSession";
import useStudyHeatmapTracker from "../hooks/useStudyHeatmapTracker";

const navGroups = [
  {
    title: "Workspace",
    items: [
      { label: "Dashboard", to: "/student/dashboard", icon: LayoutDashboard },
      { label: "Daily Tasks", to: "/student/dailytasks", icon: ClipboardList },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Listening", to: "/student/tests/listening", icon: Headphones },
      { label: "Reading", to: "/student/tests/reading", icon: BookOpen },
      { label: "Writing T1", to: "/student/tests/writingTask1", icon: PencilLine },
      { label: "Writing T2", to: "/student/tests/writingTask2", icon: PenLine },
    ],
  },
  {
    title: "Personal Info",
    items: [
      { label: "Results", to: "/student/results", icon: NotebookPen },
      { label: "Analytics", to: "/student/analytics", icon: LineChart },
      { label: "Profile", to: "/student/profile", icon: UserCircle },
    ],
  },
];

function StudentSidebar() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const navigate = useNavigate();

  const isSidebarExpanded = isSidebarHovered;

  const linkBase =
    "grid items-center rounded-none px-1 py-2 text-sm font-medium transition-all duration-300 ease-out";

  return (
    <aside
      className="relative w-20 shrink-0"
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
    >
      <div
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-[#fbf8f2] transition-all duration-300 ease-in-out ${isSidebarExpanded ? "w-64" : "w-20"
          }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center border border-slate-200 text-sm font-semibold duration-300 ${isSidebarExpanded ? "ml-0" : "ml-1"
              }`}>
              LH
            </div>
            <div
              className={`flex flex-col overflow-hidden transition-all duration-300 ${isSidebarExpanded ? "opacity-100 w-auto translate-x-2" : "opacity-0 w-0 -translate-x-2"
                }`}
            >
              <span className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                Learning Hub
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
                          `${linkBase} ${isSidebarExpanded ? "grid-cols-[56px_1fr]" : "grid-cols-[56px_0px]"
                          } ${isActive
                            ? "emerald-gradient-fill text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]"
                            : "text-slate-600 hover:bg-emerald-100/70 hover:text-emerald-900"
                          }`
                        }
                      >
                        <span className="flex h-9 w-[56px] items-center justify-center">
                          {Icon && <Icon className="h-5 w-5 shrink-0" />}
                        </span>
                        <span
                          className={`whitespace-nowrap transition-all duration-300 ease-out ${isSidebarExpanded
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
            } border border-transparent w-full text-left text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700`} // <-- Added text-left here
            onClick={() => setIsLeaveOpen(true)}
            type="button"
          >
            <span className="flex h-9 w-[56px] items-center justify-center">
              <LogOut className="h-5 w-5 shrink-0" />
            </span>
            <span
              className={`whitespace-nowrap transition-all duration-500 ease-out ${
                isSidebarExpanded
                  ? "max-w-[180px] opacity-100" // <-- Removed min-w-full to match NavLinks
                  : "max-w-0 opacity-0 overflow-hidden"
              }`}
            >
              Leave
            </span>
          </button>
        </div>
      </div>

      <ConfirmLeaveModal
        isOpen={isLeaveOpen}
        onCancel={() => setIsLeaveOpen(false)}
        onConfirm={async () => {
          setIsLeaveOpen(false);
          try {
            await authApi.logout();
          } catch {
            // Even if request fails, local logout should still proceed.
          } finally {
            clearAuthSession();
            navigate("/student/auth");
          }
        }}
      />
    </aside >
  );
}

const StudentMainContent = memo(function StudentMainContent() {
  const location = useLocation();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationsRef = useRef(null);
  const mainRef = useRef(null);
  const topAnchorRef = useRef(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      topAnchorRef.current?.scrollIntoView({ block: "start" });
      mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!notificationsRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <main className="flex-1 flex flex-col min-w-0" ref={mainRef}>
      <div ref={topAnchorRef} />
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-[#fbf8f2] px-8 z-40 sticky top-0">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            {navGroups
              .flatMap((group) => group.items)
              .find((item) => item.to === location.pathname)?.label ??
              (location.pathname.startsWith("/student/results")
                ? "Results"
                :
              (location.pathname.startsWith("/student/analytics/assistant")
                ? "AI Analysis"
                : "Student Portal"))}
          </h1>
        </div>
        <div
          className="relative flex items-center"
          ref={notificationsRef}
          onMouseEnter={() => setIsNotificationsOpen(true)}
          onMouseLeave={(event) => {
            if (!notificationsRef.current?.contains(event.relatedTarget)) {
              setIsNotificationsOpen(false);
            }
          }}
        >
          <button
            type="button"
            aria-label="Notifications"
            aria-haspopup="dialog"
            aria-expanded={isNotificationsOpen}
            className="group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-none border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-300/40 hover:text-white hover:shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]"
          >
            <span className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 emerald-gradient-fill" />
            <Bell className="relative h-5 w-5" />
          </button>
          <div
            role="dialog"
            aria-label="Notifications"
            className={`absolute right-0 top-12 w-64 min-h-[6.5rem] origin-top-right rounded-none border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] transition ${isNotificationsOpen
              ? "scale-100 opacity-100"
              : "pointer-events-none scale-95 opacity-0"
              }`}
          >
            <span className="absolute -top-3 left-0 h-3 w-full" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Notifications
            </p>
            <p className="mt-2 text-sm text-slate-600">No notifications yet.</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </div>
    </main>
  );
});

function StudentLayout() {
  useStudyHeatmapTracker();

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-slate-900 font-sans flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <StudentSidebar />

      {/* Main Content Area */}
      <StudentMainContent />
    </div>
  );
}

export default StudentLayout;
