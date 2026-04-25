import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDateTime } from "./resultsUtils";

function ResultGroupCard({ group }) {
  const latestAttempt = group?.latestAttempt || null;
  const openRoute = group?.navigation?.route || latestAttempt?.navigation?.route || "/student/results";
  const latestTimeLabel = latestAttempt?.totalTimeSpentLabel || "0m";
  const latestAttemptNumber = Math.max(
    1,
    Number(latestAttempt?.groupAttemptNumber || latestAttempt?.attemptNumber || group?.attemptCount || 1),
  );

  return (
    <article className="rounded-none border border-slate-200/90 bg-white/95 p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.45)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold leading-7 text-slate-900">
            <span>{group?.readableTitle || "Completed task"}</span>
            <span className="ml-3 inline-flex items-center border border-slate-300 bg-slate-50 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-600">
              Attempt {latestAttemptNumber}
            </span>
          </h2>
        </div>
        <Link
          className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
          to={openRoute}
        >
          Open
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Attempts
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">{Number(group?.attemptCount || 0)}</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Latest Score
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">{group?.latestScoreLabel || "Completed"}</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Time Spent
          </p>
          <p className="mt-1 text-base font-semibold text-slate-900">{latestTimeLabel}</p>
        </div>
        <div className="border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Completed
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateTime(group?.latestSubmittedAt)}</p>
        </div>
      </div>
    </article>
  );
}

export default ResultGroupCard;
