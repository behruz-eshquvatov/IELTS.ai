import { useId } from "react";
import clsx from "clsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  studentProgressData,
  studentTasks,
  studentWeakAreas,
  studyTimeData,
} from "../../data/siteContent";

function StatCard({ label, value, tone = "blue" }) {
  const toneClasses = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={clsx("rounded-[22px] border p-4", toneClasses[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="mt-3 text-[1.65rem] font-semibold tracking-[-0.05em]">{value}</p>
    </div>
  );
}

function PreviewCallout({ className, label }) {
  return (
    <div
      className={clsx(
        "pointer-events-none absolute hidden rounded-full border border-white/90 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.35)] xl:block",
        className,
      )}
    >
      {label}
    </div>
  );
}

function StudentDashboardPreview({ className, detailed = false, showCallouts = false }) {
  const gradientId = useId();

  return (
    <div className={clsx("surface-card relative overflow-hidden p-6 lg:p-8", className)}>
      <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(191,219,254,0.45),_transparent_68%)]" />
      <div className="relative grid gap-5 xl:grid-cols-[1.3fr_0.76fr]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Target score" value="6.5" />
            <StatCard label="Current band" tone="slate" value="5.9" />
            <StatCard label="Consistency" tone="green" value="86%" />
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-slate-50/75 p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Score progress
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                  Improvement that feels visible week by week
                </h3>
              </div>
              <div className="rounded-full bg-white px-4 py-2 text-sm text-slate-500">
                5.0 to 6.5 path
              </div>
            </div>

            <div className={clsx(detailed ? "h-[18rem]" : "h-[15rem]")}>
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={studentProgressData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#7ca8f7" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="#7ca8f7" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="4 6" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    domain={[5, 6.8]}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid rgba(226,232,240,0.9)",
                      borderRadius: "18px",
                      boxShadow: "0 18px 48px -36px rgba(15,23,42,0.4)",
                    }}
                  />
                  <Area
                    dataKey="score"
                    fill={`url(#${gradientId})`}
                    stroke="#5d87df"
                    strokeWidth={3}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Recommended next
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                  Practice with a clear sequence
                </h3>
              </div>
              <div className="space-y-3">
                {studentTasks.map((task) => (
                  <div
                    className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4"
                    key={task.title}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{task.title}</p>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {task.state}
                      </span>
                    </div>
                    <p className="text-sm leading-7 text-slate-600">{task.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Study time
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                  Calm consistency across the week
                </h3>
              </div>
              <div className={clsx(detailed ? "h-[14rem]" : "h-[12rem]")}>
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={studyTimeData} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="4 6" vertical={false} />
                    <XAxis axisLine={false} dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                    <YAxis axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        border: "1px solid rgba(226,232,240,0.9)",
                        borderRadius: "18px",
                        boxShadow: "0 18px 48px -36px rgba(15,23,42,0.4)",
                      }}
                    />
                    <Bar barSize={28} dataKey="value" fill="#98b7f6" radius={[14, 14, 14, 14]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Weak areas
            </p>
            <div className="mt-4 space-y-3">
              {studentWeakAreas.map((area, index) => (
                <div className="rounded-[22px] bg-slate-50/85 p-4" key={area.title}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{area.title}</p>
                    <span className="text-sm text-slate-500">{area.value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${72 - index * 12}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/75 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
              Progress signal
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              Reading pace is stabilizing.
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Time loss in later passages is reducing, so the next recommendation shifts toward
              inference accuracy instead of more timing drills.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Focus this week
            </p>
            <div className="mt-4 space-y-4">
              {[
                "Keep passage-3 timing under 18 minutes",
                "Review listening spelling corrections before retrying",
                "Draft one writing task with stronger paragraph control",
              ].map((item) => (
                <div className="flex items-start gap-3" key={item}>
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-400" />
                  <p className="text-sm leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCallouts ? (
        <>
          <PreviewCallout className="-left-3 top-16" label="Target score tracking" />
          <PreviewCallout className="right-12 top-1/2" label="Weak area diagnostics" />
          <PreviewCallout className="bottom-10 left-16" label="Task recommendations" />
        </>
      ) : null}
    </div>
  );
}

export default StudentDashboardPreview;
