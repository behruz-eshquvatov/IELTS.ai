import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import useLocalStorageState from "../../hooks/useLocalStorageState";

const PART_OPTIONS = [
  { value: "Listening", label: "Listening" },
  { value: "Reading", label: "Reading" },
  { value: "Writing", label: "Writing" },
];

const palette = ["#10b981", "#22c55e", "#14b8a6", "#34d399", "#6ee7b7", "#bbf7d0"];

const weakByRangeAndPart = {
  week: {
    Listening: [
      { label: "Map labeling", mistakes: 12 },
      { label: "Form completion", mistakes: 10 },
      { label: "Multiple choice distractors", mistakes: 8 },
      { label: "Sentence completion", mistakes: 6 },
      { label: "Speaker matching", mistakes: 5 },
      { label: "Other", mistakes: 4 },
    ],
    Reading: [
      { label: "Matching headings", mistakes: 9 },
      { label: "True/False/Not Given", mistakes: 7 },
      { label: "Sentence completion", mistakes: 6 },
      { label: "Summary completion", mistakes: 5 },
      { label: "Paragraph matching", mistakes: 4 },
      { label: "Other", mistakes: 3 },
    ],
    Writing: [
      { label: "Task 2 cohesion", mistakes: 7 },
      { label: "Argument development", mistakes: 6 },
      { label: "Grammar range", mistakes: 5 },
      { label: "Task 1 overview clarity", mistakes: 5 },
      { label: "Data grouping", mistakes: 4 },
      { label: "Other", mistakes: 3 },
    ],
  },
  month: {
    Listening: [
      { label: "Map labeling", mistakes: 34 },
      { label: "Multiple choice distractors", mistakes: 29 },
      { label: "Form completion", mistakes: 25 },
      { label: "Sentence completion", mistakes: 21 },
      { label: "Speaker matching", mistakes: 18 },
      { label: "Other", mistakes: 14 },
    ],
    Reading: [
      { label: "Matching headings", mistakes: 31 },
      { label: "True/False/Not Given", mistakes: 24 },
      { label: "Summary completion", mistakes: 21 },
      { label: "Sentence completion", mistakes: 17 },
      { label: "Paragraph matching", mistakes: 14 },
      { label: "Other", mistakes: 10 },
    ],
    Writing: [
      { label: "Task 2 cohesion", mistakes: 28 },
      { label: "Argument development", mistakes: 22 },
      { label: "Grammar range", mistakes: 20 },
      { label: "Task 1 overview clarity", mistakes: 19 },
      { label: "Data grouping", mistakes: 16 },
      { label: "Other", mistakes: 12 },
    ],
  },
  lifetime: {
    Listening: [
      { label: "Map labeling", mistakes: 94 },
      { label: "Multiple choice distractors", mistakes: 88 },
      { label: "Form completion", mistakes: 81 },
      { label: "Sentence completion", mistakes: 73 },
      { label: "Speaker matching", mistakes: 65 },
      { label: "Other", mistakes: 51 },
    ],
    Reading: [
      { label: "Matching headings", mistakes: 90 },
      { label: "True/False/Not Given", mistakes: 76 },
      { label: "Summary completion", mistakes: 72 },
      { label: "Sentence completion", mistakes: 63 },
      { label: "Paragraph matching", mistakes: 58 },
      { label: "Other", mistakes: 45 },
    ],
    Writing: [
      { label: "Task 2 cohesion", mistakes: 84 },
      { label: "Argument development", mistakes: 79 },
      { label: "Grammar range", mistakes: 75 },
      { label: "Task 1 overview clarity", mistakes: 68 },
      { label: "Data grouping", mistakes: 62 },
      { label: "Other", mistakes: 49 },
    ],
  },
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-none border border-slate-200/90 bg-[#fffaf4] px-3 py-2 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.45)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Mistake type
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{row.label}</p>
      <p className="mt-1 text-xs text-slate-600">
        Mistakes: <span className="font-semibold text-rose-600">{row.mistakes}</span>
      </p>
    </div>
  );
}

export default function StudentAnalyticsWeakSectionsTable({ range = "week" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useLocalStorageState(
    "student:analytics:weak-part",
    "Listening"
  );

  const titleSuffix =
    range === "month" ? "last month" : range === "lifetime" ? "lifetime" : "last week";

  const chartData = useMemo(() => {
    const source = weakByRangeAndPart[range] ?? weakByRangeAndPart.week;
    const rows = source[selectedPart] ?? source.Listening;
    return rows.map((row, index) => ({
      ...row,
      color: palette[index % palette.length],
    }));
  }, [range, selectedPart]);

  const totalMistakes = chartData.reduce((sum, row) => sum + row.mistakes, 0);
  const selectedPartLabel = PART_OPTIONS.find((item) => item.value === selectedPart)?.label ?? "Listening";

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Weak sections - {titleSuffix}
        </h2>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex min-w-[170px] items-center justify-between gap-2 rounded-none border border-slate-200/90 bg-[#fffaf4] px-3 py-2 text-sm font-semibold text-slate-800 transition hover:border-emerald-300/60"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span>{selectedPartLabel}</span>
            <ChevronDown
              className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`absolute right-0 top-[calc(100%+0.4rem)] z-20 min-w-[170px] overflow-hidden rounded-none border border-slate-200/90 bg-[#fffaf4] shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)] transition ${
              isOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
            }`}
            role="listbox"
            aria-label="Part selector"
          >
            {PART_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedPart(option.value);
                  setIsOpen(false);
                }}
                className={`w-full border-b border-slate-200/70 px-3 py-2 text-left text-sm transition last:border-b-0 ${
                  option.value === selectedPart
                    ? "emerald-gradient-fill text-white"
                    : "text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-none border border-slate-200/80 bg-[#fffaf4] p-5">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Top mistake types in {selectedPartLabel}
            </p>
            {chartData.map((row, index) => {
              const percent = totalMistakes ? Math.round((row.mistakes / totalMistakes) * 100) : 0;
              return (
                <div key={row.label} className="flex items-center justify-between border-b border-slate-200/70 pb-2 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <p className="text-sm text-slate-700">
                      <span className="mr-1 font-semibold text-slate-900">{index + 1}.</span>
                      {row.label}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    <span className="text-rose-600">{row.mistakes}</span>
                    <span className="ml-2 text-slate-500">{percent}%</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="mistakes"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={72}
                  outerRadius={120}
                  paddingAngle={2}
                  stroke="rgba(255,250,244,0.9)"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
