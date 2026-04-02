import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  teacherBenefits,
  teacherStudents,
  teacherTrendData,
} from "../../data/siteContent";

function SummaryCard({ label, tone = "slate", value }) {
  const toneClasses = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={clsx("rounded-[22px] border p-4", toneClasses[tone])}>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">{label}</p>
      <p className="mt-3 text-[1.6rem] font-semibold tracking-[-0.05em]">{value}</p>
    </div>
  );
}

function TeacherDashboardPreview({ className, detailed = false, showCallouts = false }) {
  return (
    <div className={clsx("surface-card relative overflow-hidden p-6 lg:p-8", className)}>
      <div className="absolute right-0 top-0 h-40 w-64 rounded-full bg-blue-100/60 blur-3xl" />
      <div className="relative space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Active students" value="48" />
          <SummaryCard label="Completion rate" tone="green" value="92%" />
          <SummaryCard label="Review flags" tone="blue" value="4" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
            <div className="mb-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Class overview
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                See learning patterns before class starts
              </h3>
            </div>
            <div className={clsx(detailed ? "h-[18rem]" : "h-[15rem]")}>
              <ResponsiveContainer height="100%" width="100%">
                <BarChart data={teacherTrendData} margin={{ top: 8, right: 0, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" strokeDasharray="4 6" vertical={false} />
                  <XAxis axisLine={false} dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid rgba(226,232,240,0.9)",
                      borderRadius: "18px",
                      boxShadow: "0 18px 48px -36px rgba(15,23,42,0.4)",
                    }}
                  />
                  <Bar barSize={30} dataKey="progress" fill="#84aef7" radius={[14, 14, 14, 14]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Quick student list
            </p>
            <div className="mt-4 space-y-3">
              {teacherStudents.map((student) => (
                <div
                  className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4"
                  key={student.name}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{student.name}</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {student.status}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">{student.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[28px] border border-blue-100 bg-blue-50/75 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-700">
              Homework visibility
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              Time spent, repeat attempts, and suspicious jumps stay visible.
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Teachers can identify whether a result looks earned, inconsistent, or worth
              reviewing before the next lesson begins.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200/80 bg-white p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Practical teacher value
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {teacherBenefits.map((benefit) => (
                <div className="rounded-[22px] bg-slate-50/80 p-4" key={benefit}>
                  <p className="text-sm leading-7 text-slate-700">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showCallouts ? (
        <>
          <div className="pointer-events-none absolute -right-2 top-16 hidden rounded-full border border-white/90 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.35)] xl:block">
            Class summary cards
          </div>
          <div className="pointer-events-none absolute left-10 top-[56%] hidden rounded-full border border-white/90 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.35)] xl:block">
            Homework quality patterns
          </div>
        </>
      ) : null}
    </div>
  );
}

export default TeacherDashboardPreview;
