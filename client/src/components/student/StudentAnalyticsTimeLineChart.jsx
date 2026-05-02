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

function formatScore(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toFixed(1) : "-";
}

function ScoreTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-none border border-slate-200/90 bg-[#fffaf4] px-3 py-2 text-xs shadow-[0_12px_36px_-28px_rgba(15,23,42,0.45)]">
      <p className="font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">Score: {formatScore(row.score)}</p>
      <p className="mt-1 text-slate-600">
        Correct answers:{" "}
        <span className="font-semibold text-slate-900">
          {Number.isFinite(Number(row.correctCount)) ? Number(row.correctCount) : "-"}
          {Number.isFinite(Number(row.totalQuestions)) ? ` / ${Number(row.totalQuestions)}` : ""}
        </span>
      </p>
    </div>
  );
}

export default function StudentAnalyticsTimeLineChart({ data = [], selectedSectionLabel = "Reading" }) {
  const chartData = Array.isArray(data) ? data : [];
  const validDataCount = chartData.filter((item) => Number.isFinite(Number(item?.score))).length;
  const hasEnoughData = validDataCount >= 2;

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Daily unit score - {selectedSectionLabel}
      </h2>
      <div className="rounded-none border border-slate-200/80 bg-[#fffaf4] p-5">
        <div className="h-[260px] w-full">
          {hasEnoughData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 18, left: -18, bottom: 14 }}>
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
                  domain={[0, 9]}
                  ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                  width={32}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "rgba(148,163,184,0.45)" }}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(16,185,129,0.35)", strokeWidth: 1 }}
                  content={<ScoreTooltip />}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="url(#timeLineStroke)"
                  strokeWidth={4}
                  dot={{ r: 5, fill: "#10b981", strokeWidth: 0 }}
                  activeDot={{ r: 7, fill: "#059669" }}
                />
                <Brush
                  dataKey="label"
                  height={16}
                  travellerWidth={10}
                  stroke="#94a3b8"
                  fill="#e2e8f0"
                />
              </LineChart>
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
