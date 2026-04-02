const writingTasks = [
  { title: "Task 2 · Opinion Essay", detail: "40 min · coherence focus" },
  { title: "Task 2 · Discussion Essay", detail: "Argument structure" },
  { title: "Task 2 · Problem/Solution", detail: "Idea development drill" },
];

function StudentWritingTask2Page() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Writing Task 2
        </p>
        <h1 className="text-3xl font-semibold">Task 2 practice</h1>
        <p className="text-slate-600">
          Essay prompts with criteria-based feedback.
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

export default StudentWritingTask2Page;


