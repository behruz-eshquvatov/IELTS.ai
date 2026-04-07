import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const bandByRange = {
  week: [
    { label: "Mon", band: 6.5 },
    { label: "Tue", band: 6.0 },
    { label: "Wed", band: 7.0 },
    { label: "Thu", band: 6.5 },
    { label: "Fri", band: 7.5 },
    { label: "Sat", band: 7.0 },
    { label: "Sun", band: 6.5 },
  ],
  month: [
    { label: "W1", band: 6.5 },
    { label: "W2", band: 6.8 },
    { label: "W3", band: 7.1 },
    { label: "W4", band: 7.0 },
  ],
  lifetime: [
    { label: "2024", band: 6.2 },
    { label: "2025", band: 6.8 },
    { label: "2026", band: 7.1 },
  ],
};

export default function StudentAnalyticsBandChart({ range = "week" }) {
  const data = bandByRange[range] ?? bandByRange.week;
  const titleSuffix =
    range === "month" ? "last month" : range === "lifetime" ? "lifetime" : "last week";

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Overall band by day - {titleSuffix}
      </h2>
      <div className="rounded-none border border-slate-200/80 bg-[#fffaf4] p-5">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 16, right: 12, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id="bandBarFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
              />
              <YAxis
                domain={[5.5, 8]}
                ticks={[5.5, 6, 6.5, 7, 7.5, 8]}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
              />
              <Tooltip
                cursor={{ fill: "rgba(16,185,129,0.08)" }}
                contentStyle={{
                  borderRadius: 0,
                  border: "1px solid rgba(203,213,225,0.8)",
                  backgroundColor: "#fffaf4",
                  fontSize: "12px",
                }}
                formatter={(value) => [`Band ${value}`, "Score"]}
              />
              <Bar dataKey="band" fill="url(#bandBarFill)" radius={[0, 0, 0, 0]} maxBarSize={58} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
