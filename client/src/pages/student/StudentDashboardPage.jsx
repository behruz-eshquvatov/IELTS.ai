const summaryCards = [
  { label: "Target progress", value: "62%", helper: "Band 7.0 goal" },
  { label: "Score estimate", value: "6.3", helper: "Last 2 attempts" },
  { label: "Study streak", value: "12 days", helper: "Consistency score" },
];

const learningPath = [
  {
    title: "Unit 08 - Listening & Reading",
    status: "In progress",
    detail: "Listening Part 3 - Reading Matching Headings",
    state: "active",
  },
  {
    title: "Unit 09 - Writing Focus",
    status: "Locked",
    detail: "Essay structure & coherence drills",
    state: "locked",
  },
  {
    title: "Unit 10 - Full Mock",
    status: "Locked",
    detail: "Full-length simulation",
    state: "locked",
  },
];

const recommendations = [
  { title: "Map Listening", detail: "15 min targeted practice" },
  { title: "Inference Reading", detail: "12 questions - timed" },
];

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
];

function StudentDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Student Dashboard
        </p>
        <h1 className="text-3xl font-semibold">Your next steps are ready.</h1>
        <p className="text-slate-600">
          Stay focused on the current unit. This view keeps progress lightweight and
          action-oriented.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            className="rounded-none border border-slate-200/80 bg-white/90 p-5"
            key={card.label}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              {card.label}
            </p>
            <p className="mt-3 text-2xl font-semibold">{card.value}</p>
            <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
          </div>
        ))}
      </section>

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
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Current learning path</h2>
          <span className="text-sm text-slate-500">Locked until completion</span>
        </div>
        <div className="grid gap-4">
          {learningPath.map((unit) => (
            <div
              className={`rounded-none border p-5 ${
                unit.state === "active"
                  ? "border-emerald-400/40 bg-emerald-500/10"
                  : "border-slate-200/80 bg-white/90 text-slate-700"
              }`}
              key={unit.title}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">{unit.title}</p>
                  <p className="text-sm text-slate-600">{unit.detail}</p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  {unit.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-none border border-emerald-400/30 bg-emerald-500/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
            Primary Action
          </p>
          <h3 className="mt-3 text-2xl font-semibold">
            Continue Unit 08 - Listening & Reading
          </h3>
          <p className="mt-2 text-sm text-slate-700">
            Resume the current unlocked path. Completion unlocks the next unit
            immediately.
          </p>
          <button
            className="mt-6 inline-flex items-center rounded-none bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900"
            type="button"
          >
            Resume tasks
          </button>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Resume
          </p>
          <p className="mt-3 text-lg font-semibold">Writing Task 2 draft</p>
          <p className="mt-2 text-sm text-slate-600">
            18 minutes remaining - Last edited yesterday
          </p>
          <button className="mt-6 inline-flex items-center rounded-none border border-white/20 px-6 py-3 text-sm font-semibold">
            Continue draft
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recommended support</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {recommendations.map((item) => (
            <div
              className="rounded-none border border-slate-200/80 bg-white/90 p-5"
              key={item.title}
            >
              <p className="text-lg font-semibold">{item.title}</p>
              <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default StudentDashboardPage;
