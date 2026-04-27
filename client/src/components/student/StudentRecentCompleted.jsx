import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowUpRight, BookOpen, FileText, Headphones, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/apiClient";
import { Skeleton, SkeletonGrid } from "../ui/Skeleton";

const ICON_BY_TASK_TYPE = {
  reading: BookOpen,
  listening: Headphones,
  writing_task1: FileText,
  writing_task2: PencilLine,
};

function RecentActivityCard({ task }) {
  const cardRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  const handlePointerMove = useCallback((event) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cardRef.current.style.setProperty("--card-x", `${x}px`);
    cardRef.current.style.setProperty("--card-y", `${y}px`);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const handleWindowMove = (event) => {
      handlePointerMove(event);
    };

    window.addEventListener("pointermove", handleWindowMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleWindowMove);
  }, [handlePointerMove, isActive]);

  const Icon = task.icon;

  return (
    <Link
      ref={cardRef}
      className="group relative flex flex-col gap-3 overflow-hidden bg-transparent p-[1.5px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(180px_circle_at_var(--card-x,_50%)_var(--card-y,_50%),rgba(16,185,129,0.65),transparent_70%)] before:opacity-0 before:transition before:duration-200 data-[active=true]:before:opacity-100"
      data-active={isActive}
      key={task.id}
      onPointerEnter={(event) => {
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
        }
        setIsActive(true);
        handlePointerMove(event);
      }}
      onPointerLeave={() => {
        leaveTimeoutRef.current = setTimeout(() => {
          setIsActive(false);
        }, 150);
      }}
      onPointerMove={handlePointerMove}
      to={task.to}
    >
      <div className="relative flex min-h-[88px] flex-1 flex-col gap-3 bg-[#fffaf4]/95 p-5">
        <div className="absolute right-3 top-3 z-10 inline-flex items-center rounded-sm bg-[#fffaf4]/95 px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
          <span className="max-w-0 -translate-x-1 overflow-hidden whitespace-nowrap text-emerald-700/85 opacity-0 transition-[max-width,opacity,transform,margin-right,color] duration-300 ease-out group-hover:mr-2 group-hover:max-w-20 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-emerald-700">
            Review
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 transition-colors duration-300 group-hover:text-emerald-700" />
        </div>
        <div className="flex min-h-11 items-stretch gap-3 pr-24">
          <span className="inline-flex w-10 shrink-0 items-center justify-center border border-slate-200 bg-slate-100 text-slate-700 transition group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-700">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold text-slate-900 transition group-hover:text-slate-950">
              {task.title}
            </p>
            <p className="text-xs text-slate-500">{task.detail}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ResultsCenterCard({ className = "" }) {
  const cardRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  const handlePointerMove = useCallback((event) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    cardRef.current.style.setProperty("--card-x", `${x}px`);
    cardRef.current.style.setProperty("--card-y", `${y}px`);
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const handleWindowMove = (event) => {
      handlePointerMove(event);
    };

    window.addEventListener("pointermove", handleWindowMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleWindowMove);
  }, [handlePointerMove, isActive]);

  return (
    <Link
      ref={cardRef}
      className={`group relative flex h-full w-full flex-col overflow-hidden bg-transparent p-[1.5px] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(180px_circle_at_var(--card-x,_50%)_var(--card-y,_50%),rgba(16,185,129,0.65),transparent_70%)] before:opacity-0 before:transition before:duration-200 data-[active=true]:before:opacity-100 ${className}`}
      data-active={isActive}
      onPointerEnter={(event) => {
        if (leaveTimeoutRef.current) {
          clearTimeout(leaveTimeoutRef.current);
        }
        setIsActive(true);
        handlePointerMove(event);
      }}
      onPointerLeave={() => {
        leaveTimeoutRef.current = setTimeout(() => {
          setIsActive(false);
        }, 150);
      }}
      onPointerMove={handlePointerMove}
      to="/student/results"
    >
      <div className="relative flex min-h-[88px] flex-1 flex-col justify-between bg-[#fffaf4]/95 p-5 text-left">
        <span className="text-sm font-semibold text-slate-900">
          <span className="relative block h-[1.15rem] overflow-hidden">
            <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
              <span className="h-[1.15rem]">See all completed</span>
              <span className="h-[1.15rem] text-slate-950">See all completed</span>
            </span>
          </span>
        </span>
      </div>
    </Link>
  );
}

const StudentRecentCompleted = memo(function StudentRecentCompleted() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadRecentCompleted() {
      setIsLoading(true);

      try {
        const response = await apiRequest("/students/me/task-attempts/recent-completed?limit=11");
        if (!isActive) {
          return;
        }

        const nextItems = Array.isArray(response?.items) ? response.items : [];
        const mappedItems = nextItems.map((item) => ({
          id: String(item?.id || `${item?.taskType || "task"}-${item?.taskRefId || ""}`),
          title: String(item?.title || "").trim() || "Completed task",
          detail: String(item?.detail || "").trim() || "Completed",
          to: String(item?.to || "/student/dailytasks"),
          icon: ICON_BY_TASK_TYPE[String(item?.taskType || "").toLowerCase()] || FileText,
        }));

        setItems(mappedItems);
      } catch {
        if (!isActive) {
          return;
        }
        setItems([]);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadRecentCompleted();

    return () => {
      isActive = false;
    };
  }, []);

  const baseCount = Math.min(5, items.length);
  const visibleTasks = items.slice(0, baseCount);
  const toggleRow = Math.floor(visibleTasks.length / 3) + 1;

  if (isLoading) {
    return (
      <section className="space-y-4" aria-busy="true" role="status">
        <span className="sr-only">Loading recently completed tasks</span>
        <Skeleton className="h-3 w-40" />
        <SkeletonGrid count={3} columns="md:grid-cols-3" />
      </section>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Recently completed
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleTasks.map((task) => (
            <Motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{
                layout: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.13 },
                y: { duration: 0.13 },
                scale: { duration: 0.13 },
              }}
            >
              <RecentActivityCard task={task} />
            </Motion.div>
          ))}

          {items.length > baseCount ? (
            <Motion.div
              key="toggle-completed"
              layout
              transition={{
                layout: { type: "spring", stiffness: 300, damping: 30 },
              }}
              className="md:col-start-3 md:[grid-row-start:var(--toggle-row)]"
              style={{ "--toggle-row": String(toggleRow) }}
            >
              <ResultsCenterCard />
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
});

export default StudentRecentCompleted;
