import { memo, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, ChevronDown, FileText, Headphones, Lock, NotebookPen, PenLine } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import { LibraryListSkeleton } from "../ui/Skeleton";
import UnitAttemptsModal from "./UnitAttemptsModal";

const STATUS_FILTER_BY_LABEL = {
  All: "",
  Today: "today",
  Completed: "completed",
  Locked: "locked",
};

const ICON_BY_TASK_TYPE = {
  reading: BookOpen,
  listening: Headphones,
  writing_task1: FileText,
  writing_task2: PenLine,
};

function resolveVisibleUnits(units = [], activeFilter = "All", maxUnits = null) {
  const statusFilter = STATUS_FILTER_BY_LABEL[String(activeFilter || "All")] || "";
  const filtered = statusFilter
    ? units.filter((unit) => String(unit?.status || "") === statusFilter)
    : units;

  return Number.isFinite(Number(maxUnits)) && Number(maxUnits) > 0
    ? filtered.slice(0, Number(maxUnits))
    : filtered;
}

function formatBand(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return numeric.toFixed(1);
}

const StudentTodayTasks = memo(function StudentTodayTasks({
  showHeader = true,
  showAllLink = true,
  maxUnits = null,
  activeFilter = "All",
}) {
  const [units, setUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [expandedUnit, setExpandedUnit] = useState(null);
  const [attemptsModalUnit, setAttemptsModalUnit] = useState(null);

  useEffect(() => {
    let isActive = true;

    async function loadUnits() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await apiRequest("/students/me/daily-tasks");
        if (!isActive) {
          return;
        }

        const nextUnits = Array.isArray(response?.units) ? response.units : [];
        setUnits(nextUnits);

        const defaultOpenUnitId = nextUnits.find((unit) => unit?.status === "today")?.id
          || nextUnits.find((unit) => unit?.status === "completed")?.id
          || null;
        setExpandedUnit(defaultOpenUnitId);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setUnits([]);
        setErrorMessage(error?.message || "Failed to load daily tasks.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadUnits();
    return () => {
      isActive = false;
    };
  }, []);

  const visibleUnits = useMemo(
    () => resolveVisibleUnits(units, activeFilter, maxUnits),
    [units, activeFilter, maxUnits],
  );

  return (
    <section className="space-y-4">
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

      {isLoading ? (
        <LibraryListSkeleton count={Number(maxUnits) > 0 ? Math.min(Number(maxUnits), 3) : 5} />
      ) : null}

      {!isLoading && errorMessage ? (
        <div className="rounded-none border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && visibleUnits.length === 0 ? (
        <div className="rounded-none border border-slate-200/80 bg-white p-6 text-sm text-slate-600">
          No daily units found.
        </div>
      ) : null}

      {!isLoading && !errorMessage ? (
        <div className="grid gap-4">
          {visibleUnits.map((unit) => {
            const isToday = unit.status === "today";
            const isCompleted = unit.status === "completed";
            const isLocked = unit.status === "locked";
            const isExpandable = !isLocked;
            const isExpanded = isExpandable && expandedUnit === unit.id;

            return (
              <div
                key={unit.id}
                onClick={() => (isExpandable ? setExpandedUnit(isExpanded ? null : unit.id) : null)}
                className={`relative rounded-none border p-6 transition ${
                  isLocked ? "cursor-not-allowed" : isExpandable ? "cursor-pointer" : ""
                } ${
                  isToday
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
                      className={`flex items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-100 ${
                        isExpandable ? "cursor-pointer" : "cursor-default"
                      }`}
                      aria-expanded={isExpandable ? isExpanded : undefined}
                      aria-disabled={!isExpandable}
                    >
                      <NotebookPen className="mt-0.5 h-5 w-5 text-slate-500" />
                      <div>
                        <p className="text-base font-semibold text-slate-900">{unit.unit || unit.title}</p>
                      </div>
                    </button>

                    {isCompleted ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-none border border-emerald-300/30 bg-transparent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
                          Completed
                        </span>

                        {formatBand(unit?.latestBand) ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAttemptsModalUnit(unit);
                            }}
                            className="rounded-none border border-slate-300/70 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                          >
                            Band {formatBand(unit.latestBand)}
                          </button>
                        ) : null}

                        {Number(unit?.attemptsCount || 0) > 0 ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAttemptsModalUnit(unit);
                            }}
                            className="rounded-none border border-slate-300/70 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                          >
                            {Number(unit.attemptsCount)} Attempts
                          </button>
                        ) : null}
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
                          {Number(unit.tasksCount || 0)} Tasks
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
                        <ChevronDown className={`h-6 w-6 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="mt-5 space-y-4 pl-12">
                      {(Array.isArray(unit.tasks) ? unit.tasks : []).map((task) => {
                        const taskType = String(task?.taskType || "").trim().toLowerCase();
                        const Icon = ICON_BY_TASK_TYPE[taskType] || FileText;
                        const isTaskDone = task?.status === "completed";
                        const isTaskLocked = task?.status === "locked";

                        return (
                          <Link
                            key={task.id || task.taskId}
                            to={isTaskLocked ? "#" : task.to || "/student/dailytasks"}
                            onClick={(event) => {
                              if (isTaskLocked) {
                                event.preventDefault();
                              }
                            }}
                            className={`group flex items-center gap-4 rounded-none border border-transparent bg-white/60 p-4 text-left transition ${
                              isTaskLocked
                                ? "cursor-not-allowed opacity-70"
                                : isTaskDone
                                  ? "opacity-80"
                                  : "hover:border-emerald-200/80 hover:bg-white"
                            }`}
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-none bg-white text-slate-500 shadow-sm transition group-hover:text-emerald-600">
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {task.label}
                              </p>
                            </div>
                            {isTaskLocked ? (
                              <span className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Locked
                              </span>
                            ) : !isTaskDone ? (
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
      ) : null}

      <UnitAttemptsModal
        isOpen={Boolean(attemptsModalUnit)}
        onClose={() => setAttemptsModalUnit(null)}
        unit={attemptsModalUnit}
      />
    </section>
  );
});

export default StudentTodayTasks;
