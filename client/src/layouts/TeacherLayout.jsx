import {
  Bell,
  GraduationCap,
  LogOut,
  Users,
  User,
  UserCircle,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { authApi } from "../lib/apiClient";
import { clearAuthSession } from "../lib/authSession";
import { getTeacherNotifications, markTeacherNotificationRead } from "../services/teacherService";

const navGroups = [
  {
    title: "Workspace",
    items: [
      { label: "Classes", to: "/teacher/classes", icon: Users },
      { label: "Students", to: "/teacher/students", icon: GraduationCap },
      { label: "Profile", to: "/teacher/profile", icon: UserCircle },
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
  if (pathname === "/teacher/profile") {
    return "Teacher Profile";
  }
  const last = pathname.split("/").filter(Boolean).pop();
  return last ? `${last.charAt(0).toUpperCase()}${last.slice(1)}` : "Teacher Panel";
}

function TeacherLayout() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notificationsRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const routeTitle = getTeacherRouteTitle(location.pathname);

  const linkBase =
    "grid items-center rounded-none px-1 py-2 text-sm font-medium transition-all duration-300 ease-out";

  const isSidebarExpanded = isSidebarHovered;
  const unreadNotifications = notifications.filter((item) => !item.read);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getTeacherNotifications();
        setNotifications(Array.isArray(response?.notifications) ? response.notifications : []);
      } catch {
        setNotifications([]);
      }
    };
    void load();
  }, [location.pathname]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!notificationsRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

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
    <div className="teacher-side min-h-screen bg-[#f7f4ef] text-slate-900 font-sans flex flex-col lg:flex-row">
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
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-[#fbf8f2] pl-6 pr-0 lg:pl-8">
          <div className="pr-4">
            <h1 className="text-lg font-semibold text-slate-900">{routeTitle}</h1>
          </div>
          <div className="flex h-full items-stretch">
            <div className="relative flex items-center border-l border-slate-200 px-4" ref={notificationsRef}>
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={isNotificationsOpen}
                onClick={() => setIsNotificationsOpen((current) => !current)}
                className="relative flex h-10 w-10 items-center justify-center border border-slate-200 bg-white text-slate-600"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications.length > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                    {unreadNotifications.length > 99 ? "99+" : unreadNotifications.length}
                  </span>
                ) : null}
              </button>
              <div
                className={`absolute right-0 top-12 z-30 w-96 border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] transition ${isNotificationsOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Notifications</p>
                <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-slate-600">No notifications yet.</p>
                  ) : notifications.map((item) => (
                    <button
                      className={`w-full border p-2.5 text-left ${item.read ? "border-slate-200 bg-white" : "border-emerald-200 bg-emerald-50/40"}`}
                      key={item._id}
                      onClick={async () => {
                        if (item.read) {
                          return;
                        }
                        try {
                          await markTeacherNotificationRead(item._id);
                          setNotifications((current) => current.map((row) => (row._id === item._id ? { ...row, read: true } : row)));
                        } catch {
                          // keep UI stable
                        }
                      }}
                      type="button"
                    >
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="relative z-0 flex-1 overflow-hidden p-4 lg:p-8">
          <div className="relative z-10 mx-auto max-w-6xl">
            <Outlet
              context={{
                isAddClassModalOpen,
                onOpenAddClassModal: () => setIsAddClassModalOpen(true),
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
