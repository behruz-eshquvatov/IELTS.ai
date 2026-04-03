import {
  Activity,
  BookOpen,
  ClipboardList,
  Headphones,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  PencilLine,
  UserCircle,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { memo, useState } from "react";

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
      { label: "Writing T2", to: "/student/tests/writingTask2", icon: NotebookPen },
    ],
  },
  {
    title: "Personal Info",
    items: [
      { label: "Results", to: "/student/results", icon: Activity },
      { label: "Analytics", to: "/student/analytics", icon: LineChart },
      { label: "Assignments", to: "/student/assignments", icon: ClipboardList },
      { label: "Profile", to: "/student/profile", icon: UserCircle },
    ],
  },
];

function StudentSidebar() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const isSidebarExpanded = isSidebarHovered;

  const linkBase =
    "grid items-center rounded-none px-1 py-2 text-sm font-medium transition-all duration-300 ease-out";

  return (
    <aside
      className={`flex flex-col border-r border-slate-200 bg-white sticky top-0 h-screen z-30 transition-all duration-300 ease-in-out ${isSidebarExpanded ? "w-64" : "w-20"
        }`}
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center border border-slate-200 text-sm font-semibold duration-300 ${isSidebarExpanded ? "ml-0" : "ml-1"
            }`}>
            LH
          </div>
          <div
            className={`flex flex-col transition-opacity duration-200 overflow-hidden ${isSidebarExpanded ? "opacity-100 w-auto" : "opacity-0 w-0"
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
                        `${linkBase} ${isSidebarExpanded ? "grid-cols-[52px_1fr]" : "grid-cols-[52px_0px]"
                        } ${isActive
                          ? "emerald-gradient-fill text-white border border-emerald-300/30 shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`
                      }
                    >
                      <span className="flex h-9 w-13 items-center justify-center">
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
    </aside>
  );
}

const StudentMainContent = memo(function StudentMainContent() {
  return (
    <main className="flex-1 flex flex-col min-w-0">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 z-10 sticky top-0">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Student Portal</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Active Session
          </span>
        </div>
      </header>

      <div className="flex-1 p-4 lg:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </div>
    </main>
  );
});

function StudentLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <StudentSidebar />

      {/* Main Content Area */}
      <StudentMainContent />
    </div>
  );
}

export default StudentLayout;
