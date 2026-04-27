import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function minutesToLabel(value) {
  const roundedValue = Math.max(0, Math.round(Number(value) || 0));
  const hours = Math.floor(roundedValue / 60);
  const minutes = roundedValue % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function StudentAnalyticsTimeLineChart({ range = "week", data = [] }) {
  const chartData = Array.isArray(data) ? data : [];
  const hasData = chartData.some((item) => Number(item?.minutes || 0) > 0);
  const titleSuffix =
    range === "month" ? "last month" : range === "lifetime" ? "lifetime" : "last week";

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Time spent - {titleSuffix}
      </h2>
      <div className="rounded-none border border-slate-200/80 bg-[#fffaf4] p-5">
        <div className="h-[260px] w-full">
          {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 14, left: 4, bottom: 28 }}>
              <defs>
                <linearGradient id="timeLineStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
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
                tickFormatter={(value) => `${value}m`}
                tick={{ fill: "#64748b", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
              />
              <Tooltip
                cursor={{ stroke: "rgba(16,185,129,0.35)", strokeWidth: 1 }}
                contentStyle={{
                  borderRadius: 0,
                  border: "1px solid rgba(203,213,225,0.8)",
                  backgroundColor: "#fffaf4",
                  fontSize: "12px",
                }}
                formatter={(value) => [minutesToLabel(value), "Time"]}
              />
              <Line
                type="monotone"
                dataKey="minutes"
                stroke="url(#timeLineStroke)"
                strokeWidth={4}
                dot={{ r: 5, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 7, fill: "#059669" }}
              />
              <Brush
                dataKey="label"
                height={18}
                travellerWidth={10}
                stroke="#94a3b8"
                fill="#e2e8f0"
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No study activity recorded in this period.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
