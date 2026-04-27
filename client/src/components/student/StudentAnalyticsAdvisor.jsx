import { ArrowUpRight } from "lucide-react";
import MagneticButton from "../ui/MagneticButton";

export default function StudentAnalyticsAdvisor({ insight }) {
  const recommendations = Array.isArray(insight?.recommendations) ? insight.recommendations : [];

  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden border border-slate-900 bg-gradient-to-br from-[#020617] via-[#0b1324] to-[#0f172a] px-6 py-12 text-center text-slate-200">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.24) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.24) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-10 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
            {insight?.title || "Analytics insight"}
          </p>
          <p className="mx-auto max-w-3xl text-[1rem] font-medium leading-relaxed text-slate-200">
            {insight?.text || "Complete more tasks to generate reliable insights."}
          </p>
        </div>

        <div className="relative z-10 mt-4 flex flex-col items-center justify-center gap-4">
          {recommendations.length > 0 ? (
            <div className="max-w-3xl text-sm text-slate-400">
              {recommendations.join(" ")}
            </div>
          ) : null}
          <MagneticButton
            to="/student/analytics/assistant"
            className="mt-6 inline-flex rounded-full shadow-[0_18px_40px_-30px_rgba(16,185,129,0.7)] cursor-pointer"
            innerClassName="emerald-gradient-fill flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          >
            <span>Open AI analysis</span>
            <ArrowUpRight className="h-4 w-4" />
          </MagneticButton>
        </div>
      </div>
    </section>
  );
}
