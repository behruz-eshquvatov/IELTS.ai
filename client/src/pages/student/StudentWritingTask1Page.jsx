const writingTasks = [
  { title: "Task 1 · Line Graph", detail: "20 min · band focus" },
  { title: "Task 1 · Process Diagram", detail: "Key vocabulary drill" },
  { title: "Task 1 · Table Summary", detail: "Structure practice" },
];

function StudentWritingTask1Page() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Writing Task 1
        </p>
        <h1 className="text-3xl font-semibold">Task 1 practice</h1>
        <p className="text-slate-600">
          Work through structured prompts and scoring guidance.
        </p>
      </header>

      <div className="grid gap-4">
        {writingTasks.map((task) => (
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5" key={task.title}>
            <p className="text-lg font-semibold">{task.title}</p>
            <p className="mt-2 text-sm text-slate-600">{task.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentWritingTask1Page;


