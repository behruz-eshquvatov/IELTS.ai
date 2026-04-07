import { memo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  FileText,
  Headphones,
  Lock,
  NotebookPen,
  PenLine,
} from "lucide-react";
import UnitAttemptsModal from "./UnitAttemptsModal";

const dailyUnits = [
  {
    id: "unit-1",
    unit: "Unit 1",
    status: "completed",
    summary: "",
    band: "7.0",
    timeSpent: "1h 38m",
    tasks: [
      {
        id: "u1-listening",
        label: "Listening: Section 2 - Multiple choice",
        kind: "Lesson",
        to: "/student/tests/listening",
        icon: Headphones,
        status: "completed",
      },
      {
        id: "u1-reading",
        label: "Reading: Passage 1 - Urban migration",
        kind: "Lesson",
        to: "/student/tests/reading",
        icon: BookOpen,
        status: "completed",
      },
      {
        id: "u1-writing-1",
        label: "Writing Task 1: Rail network comparison",
        kind: "Document",
        to: "/student/tests/writingTask1",
        icon: FileText,
        status: "completed",
      },
      {
        id: "u1-writing-2",
        label: "Writing Task 2: Public transport funding",
        kind: "Document",
        to: "/student/tests/writingTask2",
        icon: PenLine,
        status: "completed",
      },
    ],
    attempts: [
      {
        id: "u1-a1",
        label: "Attempt 1",
        band: "6.5",
        time: "1h 55m",
        date: "Mar 25",
        breakdown: "L6.5 / R6.5 / W6.0",
      },
      {
        id: "u1-a2",
        label: "Attempt 2",
        band: "7.0",
        time: "1h 38m",
        date: "Mar 27",
        breakdown: "L7.5 / R7.0 / W6.5",
      },
    ],
  },
  {
    id: "unit-2",
    unit: "Unit 2",
    status: "completed",
    summary: "",
    band: "7.5",
    timeSpent: "1h 46m",
    tasks: [
      {
        id: "u2-listening",
        label: "Listening: Section 4 - Lecture notes",
        kind: "Lesson",
        to: "/student/tests/listening",
        icon: Headphones,
        status: "completed",
      },
      {
        id: "u2-reading",
        label: "Reading: Passage 3 - Ocean habitats",
        kind: "Lesson",
        to: "/student/tests/reading",
        icon: BookOpen,
        status: "completed",
      },
      {
        id: "u2-writing-1",
        label: "Writing Task 1: Energy usage chart",
        kind: "Document",
        to: "/student/tests/writingTask1",
        icon: FileText,
        status: "completed",
      },
      {
        id: "u2-writing-2",
        label: "Writing Task 2: Technology in classrooms",
        kind: "Document",
        to: "/student/tests/writingTask2",
        icon: PenLine,
        status: "completed",
      },
    ],
    attempts: [
      {
        id: "u2-a1",
        label: "Attempt 1",
        band: "6.5",
        time: "2h 04m",
        date: "Mar 29",
        breakdown: "L6.5 / R6.0 / W6.0",
      },
      {
        id: "u2-a2",
        label: "Attempt 2",
        band: "7.0",
        time: "1h 50m",
        date: "Mar 31",
        breakdown: "L7.0 / R7.0 / W6.5",
      },
      {
        id: "u2-a3",
        label: "Attempt 3",
        band: "7.5",
        time: "1h 46m",
        date: "Apr 1",
        breakdown: "L8.0 / R7.5 / W7.0",
      },
    ],
  },
  {
    id: "unit-3",
    unit: "Unit 3",
    status: "today",
    summary: "Est. 1h 20m",
    estTime: "1h 20m",
    tasks: [
      {
        id: "u3-listening",
        label: "Listening: Section 3 - Map completion",
        kind: "Lesson",
        to: "/student/tests/listening",
        icon: Headphones,
      },
      {
        id: "u3-reading",
        label: "Reading: Passage 2 - Climate adaptation",
        kind: "Lesson",
        to: "/student/tests/reading",
        icon: BookOpen,
      },
      {
        id: "u3-writing-1",
        label: "Writing Task 1: City center redevelopment plan",
        kind: "Document",
        to: "/student/tests/writingTask1",
        icon: FileText,
      },
      {
        id: "u3-writing-2",
        label: "Writing Task 2: Remote work and productivity",
        kind: "Document",
        to: "/student/tests/writingTask2",
        icon: PenLine,
      },
    ],
  },
  {
    id: "unit-4",
    unit: "Unit 4",
    status: "locked",
    summary: "",
    tasksCount: 3,
    lockHint: "Complete Unit 3 to unlock",
  },
  {
    id: "unit-5",
    unit: "Unit 5",
    status: "locked",
    summary: "",
    tasksCount: 2,
    lockHint: "Unlocks after Unit 4",
  },
  {
    id: "unit-6",
    unit: "Unit 6",
    status: "locked",
    summary: "",
    tasksCount: 3,
    lockHint: "Unlocks after Unit 5",
  },
  {
    id: "unit-7",
    unit: "Unit 7",
    status: "locked",
    summary: "",
    tasksCount: 2,
    lockHint: "Unlocks after Unit 6",
  },
  {
    id: "unit-8",
    unit: "Unit 8",
    status: "locked",
    summary: "",
    tasksCount: 4,
    lockHint: "Unlocks after Unit 7",
  },
  {
    id: "unit-9",
    unit: "Unit 9",
    status: "locked",
    summary: "",
    tasksCount: 3,
    lockHint: "Unlocks after Unit 8",
  },
  {
    id: "unit-10",
    unit: "Unit 10",
    status: "locked",
    summary: "",
    tasksCount: 2,
    lockHint: "Unlocks after Unit 9",
  },
];

const StudentTodayTasks = memo(function StudentTodayTasks({
  showHeader = true,
  showAllLink = true,
  maxUnits = null,
}) {
  const defaultOpenUnit = dailyUnits.find((unit) => unit.status === "today")?.id ?? null;
  const [expandedUnit, setExpandedUnit] = useState(defaultOpenUnit);
  const [openAttemptsUnit, setOpenAttemptsUnit] = useState(null);
  const selectedAttemptsUnit = dailyUnits.find((unit) => unit.id === openAttemptsUnit) ?? null;
  const visibleUnits = maxUnits ? dailyUnits.slice(0, maxUnits) : dailyUnits;

  return (
    <section className="space-y-3 mt-20">
      {showHeader ? (
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Daily tasks
          </h2>
          {showAllLink ? (
            <Link
              className="group flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 transition hover:text-emerald-600"
              to="/student/dailytasks"
            >
              <span className="relative block h-[1.1rem] overflow-hidden">
                <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
                  <span>Show all tasks</span>
                  <span className="text-emerald-700">Show all tasks</span>
                </span>
              </span>
              <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-emerald-600" />
            </Link>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-3">
        {visibleUnits.map((unit) => {
          const isToday = unit.status === "today";
          const isCompleted = unit.status === "completed";
          const isLocked = unit.status === "locked";
          const isExpandable = isToday || isCompleted;
          const isExpanded = isExpandable && expandedUnit === unit.id;
          return (
            <div
              key={unit.id}
              onClick={() => (isExpandable ? setExpandedUnit(isExpanded ? null : unit.id) : null)}
              className={`relative rounded-none border p-4 transition ${isLocked ? "cursor-not-allowed" : isExpandable ? "cursor-pointer" : ""} ${isToday
                ? "border-emerald-200/80 bg-emerald-50/60"
                : isCompleted
                  ? "border-slate-200/80 bg-[#fffaf4]/95"
                  : "border-slate-200/70 bg-[#fbf7f0]/70"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-1 flex-col gap-3">
                  <button
                  type="button"
                  onClick={() => (isExpandable ? setExpandedUnit(isExpanded ? null : unit.id) : null)}
                  disabled={!isExpandable}
                  className={`flex items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-100 ${isExpandable ? "cursor-pointer" : "cursor-default"
                    }`}
                  aria-expanded={isExpandable ? isExpanded : undefined}
                  aria-disabled={!isExpandable}
                >
                    <NotebookPen className="mt-0.5 h-5 w-5 text-slate-500" />
                    <div>
                      <p className="text-base font-semibold text-slate-900">{unit.unit}</p>
                  </div>
                  </button>
                  {isCompleted ? (
                    <div className="flex w-full flex-wrap items-center justify-start gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenAttemptsUnit(unit.id)}
                          className="group/band rounded-none border border-emerald-300/30 emerald-gradient-fill px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                        >
                          <span className="relative block h-[1.1rem] overflow-hidden">
                            <span className="flex flex-col transition-transform duration-300 ease-out group-hover/band:-translate-y-1/2">
                              <span>Band {unit.band}</span>
                              <span className="text-white">Band {unit.band}</span>
                            </span>
                          </span>
                        </button>
                      <button
                        type="button"
                        onClick={() => setOpenAttemptsUnit(unit.id)}
                        className="group/badge rounded-none border border-slate-300/60 bg-transparent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:emerald-gradient-fill hover:text-white"
                      >
                        <span className="relative block h-[1.1rem] overflow-hidden">
                          <span className="flex flex-col transition-transform duration-300 ease-out group-hover/badge:-translate-y-1/2">
                            <span>Time {unit.timeSpent}</span>
                            <span className="text-emerald-700">Time {unit.timeSpent}</span>
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenAttemptsUnit(unit.id)}
                        className="group/attempt rounded-none border border-slate-300/60 bg-transparent px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:emerald-gradient-fill hover:text-white"
                      >
                        <span className="relative block h-[1.1rem] overflow-hidden">
                          <span className="flex flex-col transition-transform duration-300 ease-out group-hover/attempt:-translate-y-1/2">
                            <span>{unit.attempts.length} Attempts</span>
                            <span className="text-emerald-700">{unit.attempts.length} Attempts</span>
                          </span>
                        </span>
                      </button>
                    </div>
                  ) : null}
                  {isLocked ? (
                    <div>
                      <span className="rounded-none border border-slate-300/70 bg-transparent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Locked
                      </span>
                    </div>
                  ) : null}
                  {isToday ? (
                    <div>
                      <span className="rounded-none border border-emerald-300/30 bg-transparent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                        {unit.estTime ? `Est. ${unit.estTime}` : unit.summary}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="h-5 w-5 text-slate-400" />
                  ) : null}
                  {isExpandable ? (
                    <button
                      className="flex h-8 w-8 items-center justify-center text-slate-500 transition hover:text-slate-900"
                      onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                      type="button"
                      aria-label="Toggle unit"
                    >
                      <ChevronDown
                        className={`h-6 w-6 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : null}
                </div>
              </div>

              {isCompleted ? null : null}

              <div
                className={`grid transition-all duration-300 ease-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="mt-4 space-y-3 pl-12">
                    {(unit.tasks || []).map((item) => {
                      const Icon = item.icon;
                      const isDone = item.status === "completed";
                      return (
                        <Link
                          key={item.id}
                          to={item.to}
                          className={`group flex items-center gap-3 rounded-none border border-transparent bg-white/60 px-3 py-2 text-left transition ${
                            isDone ? "opacity-80" : "hover:border-emerald-200/80 hover:bg-white"
                          }`}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-none bg-white text-slate-500 shadow-sm transition group-hover:text-emerald-600">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {item.label}
                            </p>
                          
                          </div>
                          {!isDone ? (
                            <span className="relative h-[1.1rem] min-w-[6.5rem] overflow-hidden text-center text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                              <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
                                <span>Start</span>
                                <span>Start</span>
                              </span>
                            </span>
                          ) : (
                            <span className="relative h-[1.1rem] min-w-[6.5rem] overflow-hidden text-center text-xs font-semibold uppercase tracking-[0.18em]">
                              <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
                                <span className="text-slate-500">Completed</span>
                                <span className="text-emerald-600">Restart</span>
                              </span>
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>
      <UnitAttemptsModal
        isOpen={Boolean(openAttemptsUnit)}
        onClose={() => setOpenAttemptsUnit(null)}
        unit={selectedAttemptsUnit}
      />
    </section>
  );
});

export default StudentTodayTasks;
