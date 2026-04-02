function StudentAnalyticsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Analytics Overview
        </p>
        <h1 className="text-3xl font-semibold">Progress insights</h1>
        <p className="text-slate-600">
          Track improvement trends, forecast target timelines, and spot weaknesses.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Forecast</p>
          <p className="mt-3 text-2xl font-semibold">6 weeks to Band 7</p>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Weekly trend</p>
          <p className="mt-3 text-2xl font-semibold">+0.3 band</p>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Consistency</p>
          <p className="mt-3 text-2xl font-semibold">82%</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Score progression</p>
          <div className="mt-4 h-52 rounded-none border border-dashed border-slate-200/80" />
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Weak skill clusters</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Map listening accuracy</li>
            <li>Inference reading speed</li>
            <li>Task response structure</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default StudentAnalyticsPage;


