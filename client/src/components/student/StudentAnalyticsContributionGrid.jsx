import StudentActivityHeatmap from "./StudentActivityHeatmap";

const lifetimeMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function generateActivityData(length) {
  return Array.from({ length }, (_, i) => {
    const dayOfWeek = i % 7;
    const cycle = Math.sin(i / 11);
    if (dayOfWeek === 6) return 0;
    if (cycle > 0.6) return 3;
    if (cycle > 0.1) return 2;
    if (dayOfWeek === 5) return 1;
    return i % 3 === 0 ? 1 : 0;
  });
}

const activityByRange = {
  week: {
    months: ["Last week"],
    data: generateActivityData(7),
  },
  month: {
    months: ["Last month"],
    data: generateActivityData(28),
  },
  lifetime: {
    months: lifetimeMonths,
    data: generateActivityData(365),
  },
};

export default function StudentAnalyticsContributionGrid({ range = "week" }) {
  const config = activityByRange[range] ?? activityByRange.week;
  const titleSuffix =
    range === "month" ? "last month" : range === "lifetime" ? "lifetime" : "last week";

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
        Practice consistency - {titleSuffix}
      </h2>
      <StudentActivityHeatmap months={config.months} activityData={config.data} />
    </section>
  );
}
