import { Table2 } from "lucide-react";
import { formatDateTime, formatSeconds } from "./resultsUtils";

function AttemptHistoryTable({ attempts = [], activeAttemptId = "", onSelectAttempt }) {
  return (
    <section className="space-y-3 rounded-none border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <Table2 className="h-4 w-4 text-slate-500" />
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Attempt History
        </p>
      </div>
      <div className="overflow-x-auto border border-slate-200">
        <table className="min-w-full border-collapse text-sm text-slate-700">
          <thead className="bg-slate-50">
            <tr>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Attempt</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Score</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Correct / Total</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Time</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Completed</th>
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(attempts) ? attempts : []).map((attempt) => {
              const attemptNumber = Number(
                attempt?.groupAttemptNumber || attempt?.attemptNumber || 1,
              );
              const isActive = String(attempt?.attemptId || "") === String(activeAttemptId || "");

              return (
                <tr
                  className={`${isActive ? "bg-emerald-50/60" : "bg-white hover:bg-slate-50"} cursor-pointer`}
                  key={String(attempt?.attemptId || `attempt-${attemptNumber}`)}
                  onClick={() => onSelectAttempt?.(attempt)}
                >
                  <td className="border border-slate-200 px-3 py-2 font-semibold">
                    Attempt {attemptNumber}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">{attempt?.scoreLabel || "Completed"}</td>
                  <td className="border border-slate-200 px-3 py-2">
                    {Number(attempt?.score?.correctCount || 0)} / {Number(attempt?.score?.totalQuestions || 0)}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {formatSeconds(attempt?.totalTimeSpentSeconds)}
                  </td>
                  <td className="border border-slate-200 px-3 py-2">
                    {formatDateTime(attempt?.submittedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AttemptHistoryTable;
