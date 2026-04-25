import useBodyScrollLock from "../../hooks/useBodyScrollLock";

function formatAttemptDate(value) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.valueOf())) {
    return "-";
  }

  return parsed.toLocaleString();
}

function UnitAttemptsModal({ isOpen, onClose, unit }) {
  useBodyScrollLock(isOpen && Boolean(unit));

  if (!isOpen || !unit) return null;

  const attempts = Array.isArray(unit?.attempts) ? unit.attempts : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl rounded-none border border-slate-200/80 bg-[#fffaf4]/95 p-6 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Attempts History
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">{unit.unit || unit.title}</h3>
          </div>
          <button
            className="rounded-none border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-none border border-slate-200/80 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Attempt</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Band</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="text-slate-700">
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Attempt {attempt.attemptNumber}
                  </td>
                  <td className="px-4 py-3">{formatAttemptDate(attempt.date)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {Number.isFinite(Number(attempt.band))
                      ? `Band ${Number(attempt.band).toFixed(1)}`
                      : Number.isFinite(Number(attempt.scorePercent))
                        ? `${Math.round(Number(attempt.scorePercent))}%`
                        : "-"}
                  </td>
                  <td className="px-4 py-3">{attempt.timeLabel || "-"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {attempt.breakdown || "-"}
                  </td>
                </tr>
              ))}
              {attempts.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-sm text-slate-500" colSpan={5}>
                    No attempts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default UnitAttemptsModal;
