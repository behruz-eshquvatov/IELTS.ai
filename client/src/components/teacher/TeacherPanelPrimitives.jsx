import clsx from "clsx";

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

export function SectionTitle({ eyebrow, title, copy, action }) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200/70 px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
          {copy ? <p className="max-w-2xl text-sm text-slate-600">{copy}</p> : null}
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
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
