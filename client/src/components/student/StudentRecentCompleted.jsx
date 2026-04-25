import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ArrowUpRight, BookOpen, FileText, Headphones, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/apiClient";

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
      <div className="relative flex min-h-[75px] flex-1 flex-col gap-3 bg-[#fffaf4]/95 p-4">
        <div className="absolute right-3 top-3 z-10 inline-flex items-center rounded-sm bg-[#fffaf4]/95 px-2 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
          <span className="max-w-0 -translate-x-1 overflow-hidden whitespace-nowrap text-emerald-700/85 opacity-0 transition-[max-width,opacity,transform,margin-right,color] duration-300 ease-out group-hover:mr-2 group-hover:max-w-20 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-emerald-700">
            Review
          </span>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 transition-colors duration-300 group-hover:text-emerald-700" />
        </div>
        <div className="flex items-start gap-3 pr-24">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition group-hover:bg-emerald-50 group-hover:text-emerald-700">
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

function ToggleCompletedCard({ label, onClick, className = "" }) {
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
    <button
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
      type="button"
      onClick={onClick}
    >
      <div className="relative flex min-h-[75px] flex-1 flex-col justify-between bg-[#fffaf4]/95 p-4 text-left">
        <span className="text-sm font-semibold text-slate-900">
          <span className="relative block h-[1.15rem] overflow-hidden">
            <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
              <span className="h-[1.15rem]">{label}</span>
              <span className="h-[1.15rem] text-slate-950">{label}</span>
            </span>
          </span>
        </span>
      </div>
    </button>
  );
}

const StudentRecentCompleted = memo(function StudentRecentCompleted() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [targetCount, setTargetCount] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const baseCount = useMemo(
    () => Math.min(5, items.length),
    [items.length],
  );
  const maxCount = items.length;

  useEffect(() => {
    setTargetCount(baseCount);
    setVisibleCount(baseCount);
    setIsExpanded(false);
  }, [baseCount, maxCount]);

  useEffect(() => {
    if (visibleCount === targetCount) return;
    const direction = targetCount > visibleCount ? 1 : -1;
    const timer = setTimeout(() => {
      setVisibleCount((prev) => prev + direction);
    }, 95);
    return () => clearTimeout(timer);
  }, [targetCount, visibleCount]);

  useEffect(() => {
    if (visibleCount === maxCount && targetCount === maxCount) {
      setIsExpanded(true);
    }
    if (visibleCount === baseCount && targetCount === baseCount) {
      setIsExpanded(false);
    }
  }, [baseCount, maxCount, targetCount, visibleCount]);

  const visibleTasks = items.slice(0, visibleCount);
  const toggleRow = Math.floor(visibleTasks.length / 3) + 1;

  const handleToggle = useCallback(() => {
    if (targetCount === maxCount) {
      setTargetCount(baseCount);
      return;
    }
    setTargetCount(maxCount);
  }, [baseCount, maxCount, targetCount]);

  if (isLoading || items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Recently completed
        </h2>
        <Link
          className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-emerald-700 transition hover:text-emerald-900"
          to="/student/results"
        >
          Results center
        </Link>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
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
              <ToggleCompletedCard
                label={isExpanded ? "Show less" : "See all completed"}
                onClick={handleToggle}
              />
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
});

export default StudentRecentCompleted;
