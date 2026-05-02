import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function StudentAnalyticsBandChart({ data = [], selectedSectionLabel = "Reading" }) {
  const chartData = (Array.isArray(data) ? data : []).map((item) => ({
    ...item,
    band: Number.isFinite(Number(item?.band ?? item?.value)) ? Number(item.band ?? item.value) : null,
  }));
  const validDataCount = chartData.filter((item) => Number.isFinite(Number(item.band))).length;
  const hasEnoughData = validDataCount >= 2;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Daily unit band - {selectedSectionLabel}
      </h2>
      <div className="rounded-none border border-slate-200/80 bg-[#fffaf4] p-5">
        <div className="h-[260px] w-full">
          {hasEnoughData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 18, right: 18, left: -18, bottom: 0 }}>
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
                  domain={[0, 9]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                  width={32}
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
          ) : (
            <div className="flex h-full items-center justify-center border border-dashed border-slate-200 bg-white/35 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              Not enough data
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
