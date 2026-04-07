import {
  Brush,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const timeByRange = {
  week: [
    { label: "Mon", minutes: 68 },
    { label: "Tue", minutes: 52 },
    { label: "Wed", minutes: 81 },
    { label: "Thu", minutes: 74 },
    { label: "Fri", minutes: 95 },
    { label: "Sat", minutes: 86 },
    { label: "Sun", minutes: 46 },
  ],
  month: [
    { label: "W1", minutes: 340 },
    { label: "W2", minutes: 390 },
    { label: "W3", minutes: 420 },
    { label: "W4", minutes: 405 },
  ],
  lifetime: [
    { label: "2024", minutes: 210 },
    { label: "2025", minutes: 278 },
    { label: "2026", minutes: 312 },
  ],
};

function minutesToLabel(value) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (!hours) return `${minutes}m`;
  if (!minutes) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export default function StudentAnalyticsTimeLineChart({ range = "week" }) {
  const data = timeByRange[range] ?? timeByRange.week;
  const titleSuffix =
    range === "month" ? "last month" : range === "lifetime" ? "lifetime" : "last week";

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Time spent - {titleSuffix}
      </h2>
      <div className="rounded-none border border-slate-200/80 bg-[#fffaf4] p-5">
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 14, left: 4, bottom: 28 }}>
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
              >
                <LabelList
                  dataKey="minutes"
                  position="top"
                  formatter={(value) => minutesToLabel(value)}
                  style={{ fontSize: "11px", fill: "#334155" }}
                />
              </Line>
              <Brush
                dataKey="label"
                height={18}
                travellerWidth={10}
                stroke="#94a3b8"
                fill="#e2e8f0"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
