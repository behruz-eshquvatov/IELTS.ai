import { useParams } from "react-router-dom";

function StudentTestStartPage() {
  const { testId } = useParams();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Test In Progress
        </p>
        <h1 className="text-3xl font-semibold">Test {testId}</h1>
        <p className="text-slate-600">
          This is the live exam environment. Analytics and navigation are limited here.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Question Panel</p>
          <div className="mt-4 h-56 rounded-none border border-dashed border-slate-200/80" />
        </div>
        <div className="space-y-4">
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Timer</p>
            <p className="mt-3 text-2xl font-semibold">54:32</p>
          </div>
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Status</p>
            <p className="mt-2 text-sm text-slate-600">Autosave enabled · 0 flags</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentTestStartPage;


