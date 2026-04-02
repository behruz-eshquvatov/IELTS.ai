const filters = ["All", "Listening", "Reading", "Writing", "Completed", "Locked"];

const tasks = [
  { title: "Unit 01 · Listening Basics", status: "Completed", detail: "Score 28/40" },
  { title: "Unit 02 · Reading Skimming", status: "Completed", detail: "Score 30/40" },
  { title: "Unit 08 · Listening & Reading", status: "In progress", detail: "2 tasks open" },
  { title: "Unit 09 · Writing Focus", status: "Locked", detail: "Unlock after Unit 08" },
];

function StudentDailyTasksPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Tests Library
        </p>
        <h1 className="text-3xl font-semibold">Full task collection</h1>
        <p className="text-slate-600">
          Browse every unit in order, revisit completed work, or review progress
          summaries.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            className="rounded-none border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700"
            key={filter}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {tasks.map((task) => (
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5" key={task.title}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{task.title}</p>
                <p className="text-sm text-slate-600">{task.detail}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                {task.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentDailyTasksPage;


