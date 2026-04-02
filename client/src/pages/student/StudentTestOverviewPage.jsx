import { Link, useParams } from "react-router-dom";

function StudentTestOverviewPage() {
  const { testId } = useParams();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Test Overview
        </p>
        <h1 className="text-3xl font-semibold">Test {testId}</h1>
        <p className="text-slate-600">
          Review instructions, timing, and rules before starting.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Section</p>
          <p className="mt-2 text-lg font-semibold">Reading</p>
          <p className="mt-2 text-sm text-slate-600">40 questions · 60 minutes</p>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Rules</p>
          <p className="mt-2 text-sm text-slate-600">
            Timed environment, no pause after start, attempts saved automatically.
          </p>
        </div>
      </div>

      <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Instructions</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          <li>Read all directions before you begin.</li>
          <li>Answer every question; you can return to flagged items.</li>
          <li>Submit before time expires to record the attempt.</li>
        </ul>
      </div>

      <Link
        className="inline-flex items-center rounded-none bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-900"
        to={`/student/tests/${testId}/start`}
      >
        Start test
      </Link>
    </div>
  );
}

export default StudentTestOverviewPage;


