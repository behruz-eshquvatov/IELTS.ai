const listeningTasks = [
  { title: "Listening Set 05", detail: "Part 1–4 · 40 questions" },
  { title: "Map Questions", detail: "Focused drill · 15 min" },
  { title: "Multiple Choice", detail: "Accuracy workout" },
];

function StudentListeningPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Listening Library
        </p>
        <h1 className="text-3xl font-semibold">Listening tasks</h1>
        <p className="text-slate-600">
          Practice audio-driven tasks, from full tests to targeted drills.
        </p>
      </header>

      <div className="grid gap-4">
        {listeningTasks.map((task) => (
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5" key={task.title}>
            <p className="text-lg font-semibold">{task.title}</p>
            <p className="mt-2 text-sm text-slate-600">{task.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentListeningPage;


