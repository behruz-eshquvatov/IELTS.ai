import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Headphones, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";

const recentTasks = [
  {
    title: "Unit 1: Reading Passage",
    detail: "30 correct answers - band 7.0",
    icon: BookOpen,
    to: "/student/tests/reading",
  },
  {
    title: "Unit 1: Listening",
    detail: "28 correct answers - band 6.5",
    icon: Headphones,
    to: "/student/tests/listening",
  },
  {
    title: "Unit 2: Reading Passages",
    detail: "34 correct answers - band 7.5",
    icon: BookOpen,
    to: "/student/tests/reading",
  },
  {
    title: "Unit 2: Writing Task 1",
    detail: "Band 6.0",
    icon: PencilLine,
    to: "/student/tests/writingTask1",
  },
  {
    title: "Extra task: Listening - Gap filling",
    detail: "Continue task",
    icon: Headphones,
    to: "/student/tests/listening",
    isExtra: true,
  },
  {
    title: "Unit 3: Listening Section 3",
    detail: "29 correct answers - band 6.5",
    icon: Headphones,
    to: "/student/tests/listening",
  },
  {
    title: "Unit 3: Reading Passage 2",
    detail: "31 correct answers - band 7.0",
    icon: BookOpen,
    to: "/student/tests/reading",
  },
  {
    title: "Unit 4: Writing Task 2",
    detail: "Band 6.5",
    icon: PencilLine,
    to: "/student/tests/writingTask2",
  },
  {
    title: "Unit 4: Writing Task 1",
    detail: "Band 6.0",
    icon: PencilLine,
    to: "/student/tests/writingTask1",
  },
  {
    title: "Extra task: Reading - TFNG",
    detail: "Continue task",
    icon: BookOpen,
    to: "/student/tests/reading",
    isExtra: true,
  },
  {
    title: "Extra task: Listening - Map labeling",
    detail: "Continue task",
    icon: Headphones,
    to: "/student/tests/listening",
    isExtra: true,
  },
];

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
      key={task.title}
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
        <div className="absolute right-4 top-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
          <span className="translate-x-2 opacity-0 transition duration-200 group-hover:translate-x-0 group-hover:opacity-100">
            {task.isExtra ? "Continue" : "Review"}
          </span>
          <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-600" />
        </div>
        <div className="flex items-start gap-3">
          <Icon className="mt-1 h-5 w-5 text-slate-600 transition group-hover:text-emerald-600" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 transition group-hover:text-slate-950">
              {task.title}
            </p>
            {!task.isExtra ? <p className="text-xs text-slate-500">{task.detail}</p> : null}
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
  const baseCount = 5;
  const maxCount = 11;
  const [targetCount, setTargetCount] = useState(baseCount);
  const [visibleCount, setVisibleCount] = useState(baseCount);
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleTasks = recentTasks.slice(0, visibleCount);
  const toggleRow = Math.floor(visibleTasks.length / 3) + 1;

  // Slower interval to give the layout spring time to breathe and look fluid
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

  const handleToggle = () => {
    if (targetCount === maxCount) {
      setTargetCount(baseCount);
      return;
    }
    setTargetCount(maxCount);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Recently completed
        </h2>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <AnimatePresence initial={false} mode="popLayout">
          {visibleTasks.map((task) => (
            <motion.div
              key={task.title}
              layout
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{
                // Smooth spring for the grid movement
                layout: { type: "spring", stiffness: 300, damping: 30 },
                // Faster, snappier transitions for the fade/slide in
                opacity: { duration: 0.13 },
                y: { duration: 0.13 },
                scale: { duration: 0.13 },
              }}
            >
              <RecentActivityCard task={task} />
            </motion.div>
          ))}

          <motion.div
            key="toggle-completed"
            layout
            // We only need layout transition here since this button never unmounts.
            // Removing opacity/y animations here stops it from blinking/snapping weirdly.
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
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
});

export default StudentRecentCompleted;
