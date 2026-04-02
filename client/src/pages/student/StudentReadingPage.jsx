const readingTasks = [
  { title: "Reading Set 04", detail: "Passage + 40 questions" },
  { title: "Matching Headings", detail: "Timed drill" },
  { title: "Inference Practice", detail: "Focus on accuracy" },
];

function StudentReadingPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Reading Library
        </p>
        <h1 className="text-3xl font-semibold">Reading tasks</h1>
        <p className="text-slate-600">
          Choose full passages or targeted reading skills.
        </p>
      </header>

      <div className="grid gap-4">
        {readingTasks.map((task) => (
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5" key={task.title}>
            <p className="text-lg font-semibold">{task.title}</p>
            <p className="mt-2 text-sm text-slate-600">{task.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentReadingPage;


