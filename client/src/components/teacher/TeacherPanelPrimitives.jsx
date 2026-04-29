import clsx from "clsx";
import { createPortal } from "react-dom";

export function PanelShell({ children, className = "" }) {
  return (
    <section
      className={clsx(
        "overflow-hidden border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  copy,
  action,
  className = "",
  eyebrowClassName = "",
  titleClassName = "",
  copyClassName = "",
}) {
  return (
    <div className={clsx(
      "flex flex-col gap-4 border-b border-slate-200/70 px-5 py-5 sm:flex-row sm:items-end sm:justify-between",
      className,
    )}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className={clsx("text-xs font-semibold uppercase tracking-[0.24em] text-slate-500", eyebrowClassName)}>
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h2 className={clsx("text-xl font-semibold text-slate-950", titleClassName)}>{title}</h2>
          {copy ? <p className={clsx("max-w-2xl text-sm text-slate-600", copyClassName)}>{copy}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, helper, tone = "slate" }) {
  const tones = {
    slate: "border-slate-200/80 bg-white",
    blue: "border-blue-200/70 bg-blue-50/70",
    emerald: "border-emerald-200/70 bg-emerald-50/70",
    amber: "border-amber-200/70 bg-amber-50/70",
  };

  return (
    <div className={clsx("border p-5", tones[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-600">{helper}</p>
    </div>
  );
}

export function StatusBadge({ tone = "slate", children }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    blue: "bg-blue-100 text-blue-700",
    emerald: "border border-emerald-200/80 bg-emerald-50/60 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "border border-rose-200/80 bg-rose-50/60 text-rose-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function ConfirmStudentRemovalModal({
  classroomName,
  isOpen,
  onClose,
  onConfirm,
  studentName,
}) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg overflow-hidden bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
          <div className="flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
              Remove student
            </p>
            <button
              aria-label="Close remove student confirmation"
              className="inline-flex h-10 w-10 items-center justify-center bg-transparent text-2xl leading-none text-white transition-colors duration-200"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="space-y-5 p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-slate-950">
                Remove {studentName} from class?
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                This student will be removed from {classroomName || "this class"} and will no longer appear in this teacher&apos;s students list.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex items-center justify-center border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center justify-center border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition-colors duration-200 hover:border-rose-300 hover:bg-rose-100"
                onClick={onConfirm}
                type="button"
              >
                Remove student
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

