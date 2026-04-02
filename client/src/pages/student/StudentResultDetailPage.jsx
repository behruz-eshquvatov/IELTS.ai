import { useParams } from "react-router-dom";

function StudentResultDetailPage() {
  const { attemptId } = useParams();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Attempt Detail
        </p>
        <h1 className="text-3xl font-semibold">Attempt {attemptId}</h1>
        <p className="text-slate-600">
          Detailed breakdown, timing analysis, and AI feedback.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Score</p>
          <p className="mt-3 text-2xl font-semibold">Band 6.5</p>
          <p className="mt-2 text-sm text-slate-600">Accuracy 72%</p>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Timing</p>
          <p className="mt-3 text-sm text-slate-600">Avg 1m 30s per question</p>
        </div>
      </div>

      <div className="rounded-none border border-slate-200/80 bg-white/90 p-5">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">AI feedback</p>
        <p className="mt-3 text-sm text-slate-600">
          Focus on inference questions and reduce time spent on paragraph matching.
        </p>
      </div>
    </div>
  );
}

export default StudentResultDetailPage;


