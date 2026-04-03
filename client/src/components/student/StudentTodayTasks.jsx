import { memo } from "react";
import { Link } from "react-router-dom";

const todayTasks = [
  {
    title: "Listening Part 3 - Map Questions",
    detail: "12 questions - due today",
    status: "Open",
  },
  {
    title: "Reading - Matching Headings",
    detail: "1 passage - due today",
    status: "Open",
  },
  {
    title: "Writing Task 2 - Outline",
    detail: "15 min drafting - optional",
    status: "Optional",
  },
  {
    title: "Reading - True/False/Not Given",
    detail: "10 questions - due today",
    status: "Open",
  },
  {
    title: "Listening - Multiple Choice",
    detail: "8 questions - due today",
    status: "Open",
  },
];

const StudentTodayTasks = memo(function StudentTodayTasks() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Today&apos;s tasks</h2>
        <span className="text-sm text-slate-500">Due today</span>
      </div>
      <div className="divide-y divide-slate-200 border border-slate-200/80 bg-white/90">
        {todayTasks.map((task) => (
          <div className="flex items-center justify-between px-5 py-4" key={task.title}>
            <div>
              <p className="text-sm font-semibold">{task.title}</p>
              <p className="text-xs text-slate-500">{task.detail}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {task.status}
            </span>
          </div>
        ))}
      </div>
      <Link
        className="inline-flex items-center justify-center border border-slate-200/80 bg-white/90 px-5 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600"
        to="/student/dailytasks"
      >
        Show all tasks
      </Link>
    </section>
  );
});

export default StudentTodayTasks;
