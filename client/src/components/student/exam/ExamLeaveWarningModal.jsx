import { AlertTriangle } from "lucide-react";
import ExamPopup from "./ExamPopup";

const DEFAULT_WARNING_TEXT =
  "Do you really want to leave this page? If you leave, your current task attempt will be auto-submitted.";

function ExamLeaveWarningModal({
  isOpen,
  onLeave,
  onStay,
  isSubmitting = false,
  message = DEFAULT_WARNING_TEXT,
}) {
  return (
    <ExamPopup isOpen={isOpen} maxWidthClass="max-w-lg" onClose={onStay}>
      <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Leave Test?</p>
      <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-700">{message}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50"
          onClick={onStay}
          type="button"
        >
          Stay
        </button>
        <button
          className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          onClick={onLeave}
          type="button"
        >
          {isSubmitting ? "Submitting..." : "Yes, Leave"}
        </button>
      </div>
    </ExamPopup>
  );
}

export default ExamLeaveWarningModal;
