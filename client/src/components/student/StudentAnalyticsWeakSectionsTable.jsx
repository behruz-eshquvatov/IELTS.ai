import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import useLocalStorageState from "../../hooks/useLocalStorageState";

const PART_OPTIONS = [
  { value: "all", label: "All" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "writing", label: "Writing" },
];

const sectionPalette = {
  reading: ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
  listening: ["#059669", "#10b981", "#34d399", "#6ee7b7"],
  writing: ["#c2410c", "#f97316", "#fb923c", "#fdba74"],
  all: ["#64748b", "#94a3b8", "#cbd5e1"],
};

function normalizeSection(value) {
  const safe = String(value || "").trim().toLowerCase();
  return ["reading", "listening", "writing"].includes(safe) ? safe : "all";
}

function formatSectionLabel(section) {
  const safe = normalizeSection(section);
  return safe === "all" ? "" : safe.charAt(0).toUpperCase() + safe.slice(1);
}

function getRowLabel(row, shouldShowSection) {
  const label = String(row?.label || "Other").trim();
  const sectionLabel = row?.sectionLabel || formatSectionLabel(row?.section);
  return shouldShowSection && sectionLabel ? `${label} - ${sectionLabel}` : label;
}

function getRowColor(row, index, selectedPart) {
  const section = selectedPart === "all" ? normalizeSection(row?.section) : normalizeSection(selectedPart);
  const colors = sectionPalette[section] || sectionPalette.all;
  return colors[index % colors.length];
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  return (
    <div className="rounded-none border border-slate-200/90 bg-[#fffaf4] px-3 py-2 shadow-[0_12px_36px_-28px_rgba(15,23,42,0.45)]">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        Mistake type
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{row.label}</p>
      {row.sectionLabel ? (
        <p className="mt-1 text-xs text-slate-500">{row.sectionLabel}</p>
      ) : null}
      <p className="mt-1 text-xs text-slate-600">
        Mistakes: <span className="font-semibold text-rose-600">{row.mistakes}</span>
      </p>
    </div>
  );
}

export default function StudentAnalyticsWeakSectionsTable({ range = "week", weakSections = {}, sectionFilters = PART_OPTIONS }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useLocalStorageState(
    "student:analytics:weak-part",
    "all"
  );

  const titleSuffix =
    range === "month" ? "last month" : range === "lifetime" ? "lifetime" : "last week";

  const options = Array.isArray(sectionFilters) && sectionFilters.length ? sectionFilters : PART_OPTIONS;
  const normalizedSelectedPart = normalizeSection(selectedPart);
  const effectiveSelectedPart = options.some((item) => item.value === selectedPart)
    ? selectedPart
    : options.some((item) => item.value === normalizedSelectedPart)
      ? normalizedSelectedPart
      : "all";

  const chartData = useMemo(() => {
    const rows = weakSections?.[effectiveSelectedPart] ?? weakSections?.all ?? [];
    const presentSections = new Set(
      rows.map((row) => normalizeSection(row?.section)).filter((section) => section !== "all"),
    );
    const shouldShowSection = effectiveSelectedPart === "all" && presentSections.size > 1;
    return rows.map((row, index) => ({
      ...row,
      section: normalizeSection(row?.section || effectiveSelectedPart),
      sectionLabel: row?.sectionLabel || formatSectionLabel(row?.section || effectiveSelectedPart),
      label: getRowLabel(row, shouldShowSection),
      baseLabel: row?.label || "Other",
      color: getRowColor(row, index, effectiveSelectedPart),
    }));
  }, [effectiveSelectedPart, weakSections]);

  const totalMistakes = chartData.reduce((sum, row) => sum + row.mistakes, 0);
  const selectedPartLabel = options.find((item) => item.value === effectiveSelectedPart)?.label ?? "All";
  const groupedChartData = useMemo(() => {
    if (effectiveSelectedPart !== "all") {
      return [];
    }

    return ["reading", "listening", "writing"]
      .map((section) => ({
        section,
        label: formatSectionLabel(section).toUpperCase(),
        rows: chartData.filter((row) => normalizeSection(row.section) === section),
      }))
      .filter((group) => group.rows.length > 0);
  }, [chartData, effectiveSelectedPart]);
  const showGroupedRows = effectiveSelectedPart === "all" && groupedChartData.length > 1;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
          Mistake patterns - {titleSuffix}
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
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedPart(option.value);
                  setIsOpen(false);
                }}
                className={`w-full border-b border-slate-200/70 px-3 py-2 text-left text-sm transition last:border-b-0 ${
                  option.value === effectiveSelectedPart
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
              Most common mistake types in {selectedPartLabel}
            </p>
            {chartData.length > 0 && showGroupedRows ? groupedChartData.map((group) => (
              <div key={group.section} className="space-y-2 border-b border-slate-200/70 pb-3 last:border-b-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {group.label}
                </p>
                {group.rows.map((row, index) => {
                  const percent = totalMistakes ? Math.round((row.mistakes / totalMistakes) * 100) : 0;
                  return (
                    <div key={`${row.section}-${row.baseLabel}`} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: row.color }}
                        />
                        <p className="min-w-0 truncate text-sm text-slate-700">
                          <span className="mr-1 font-semibold text-slate-900">{index + 1}.</span>
                          {row.baseLabel}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-700">
                        <span className="text-rose-600">{row.mistakes}</span>
                        <span className="ml-2 text-slate-500">{percent}%</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            )) : chartData.length > 0 ? chartData.map((row, index) => {
              const percent = totalMistakes ? Math.round((row.mistakes / totalMistakes) * 100) : 0;
              return (
                <div key={`${row.section}-${row.baseLabel}`} className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-2 last:border-b-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: row.color }}
                    />
                    <p className="min-w-0 truncate text-sm text-slate-700">
                      <span className="mr-1 font-semibold text-slate-900">{index + 1}.</span>
                      {row.label}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-700">
                    <span className="text-rose-600">{row.mistakes}</span>
                    <span className="ml-2 text-slate-500">{percent}%</span>
                  </p>
                </div>
              );
            }) : (
              <div className="flex min-h-[12rem] items-center justify-center border border-dashed border-slate-200 text-sm text-slate-500">
                Complete more tasks to see weak sections.
              </div>
            )}
          </div>

          <div className="h-[340px] w-full">
            {chartData.length > 0 ? (
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
                    <Cell key={`${entry.section}-${entry.baseLabel}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No mistake breakdown yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
