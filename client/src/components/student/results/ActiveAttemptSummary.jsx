import { formatDateTime, formatSeconds } from "./resultsUtils";

function ActiveAttemptSummary({ activeAttempt }) {
  const attemptNumber = Number(
    activeAttempt?.groupAttemptNumber || activeAttempt?.attemptNumber || 1,
  );

  return (
    <section className="grid gap-3 sm:grid-cols-4">
      <article className="border border-slate-200 bg-white px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Active Attempt
        </p>
        <p className="mt-1 text-xl font-semibold text-slate-900">
          #{attemptNumber}
        </p>
      </article>
      <article className="border border-slate-200 bg-white px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Score
        </p>
        <p className="mt-1 text-xl font-semibold text-slate-900">
          {activeAttempt?.scoreLabel || "Completed"}
        </p>
      </article>
      <article className="border border-slate-200 bg-white px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Time Spent
        </p>
        <p className="mt-1 text-xl font-semibold text-slate-900">
          {formatSeconds(activeAttempt?.totalTimeSpentSeconds)}
        </p>
      </article>
      <article className="border border-slate-200 bg-white px-4 py-3">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Submitted
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-900">
          {formatDateTime(activeAttempt?.submittedAt)}
        </p>
      </article>
    </section>
  );
}

export default ActiveAttemptSummary;
