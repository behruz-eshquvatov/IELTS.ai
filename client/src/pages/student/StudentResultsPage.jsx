const attempts = [
  { id: "A-1024", section: "Reading", score: "30/40", date: "2 days ago" },
  { id: "A-1021", section: "Listening", score: "28/40", date: "5 days ago" },
  { id: "A-1018", section: "Writing Task 2", score: "Band 6.0", date: "1 week ago" },
];

function StudentResultsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Results History
        </p>
        <h1 className="text-3xl font-semibold">Your recent attempts</h1>
        <p className="text-slate-600">
          Review past performance and open detailed reports.
        </p>
      </header>

      <div className="grid gap-4">
        {attempts.map((attempt) => (
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5" key={attempt.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{attempt.section}</p>
                <p className="text-sm text-slate-600">{attempt.score}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {attempt.date}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-600">Attempt ID: {attempt.id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentResultsPage;


