import { memo } from "react";
import { ChevronRight } from "lucide-react";

const recentTasks = [
  { title: "Reading Passage 3", detail: "Score 30/40" },
  { title: "Listening Set 05", detail: "Score 28/40" },
  { title: "Writing Task 1", detail: "Band 6.0" },
];

const StudentRecentCompleted = memo(function StudentRecentCompleted() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Recently completed</h2>
        <span className="text-sm text-slate-500">Last 7 days</span>
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
        {recentTasks.map((task) => (
          <div
            className="rounded-none border border-slate-200/80 bg-white/90 p-5"
            key={task.title}
          >
            <p className="text-sm font-semibold">{task.title}</p>
            <p className="mt-2 text-xs text-slate-500">{task.detail}</p>
          </div>
        ))}
        <div className="flex w-12 items-center justify-center border border-slate-200/80 bg-white/90">
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </div>
      </div>
    </section>
  );
});

export default StudentRecentCompleted;
