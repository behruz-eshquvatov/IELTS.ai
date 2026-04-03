import React, { useMemo } from "react";

export function StudentActivityHeatmap({ months, activityData }) {
  const columns = useMemo(() => Math.ceil(activityData.length / 7), [activityData.length]);

  return (
    <div className="w-full text-slate-700">
      <div className="rounded-none border border-slate-200/80 bg-slate-50/90 p-4">
        <div className="grid grid-cols-[auto_1fr] items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-400">
          <span className="w-10" aria-hidden="true" />
          <div className="flex w-full justify-between">
            {months.map((month, index) => (
              <span key={`${month}-${index}`}>{month}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[auto_1fr] gap-4">
          <div className="grid grid-rows-7 text-xs text-slate-400">
            <span className="self-center" style={{ gridRow: 1 }}>Mon</span>
            <span className="self-center" style={{ gridRow: 3 }}>Wed</span>
            <span className="self-center" style={{ gridRow: 5 }}>Fri</span>
            <span className="self-center" style={{ gridRow: 7 }}>Sun</span>
          </div>

          {/* The grid that builds the heatmap */}
          <div
            className="grid w-full gap-1"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: "repeat(7, minmax(0, 1fr))",
              gridAutoFlow: "column",
            }}
          >
            {activityData.map((level, index) => (
              <span
                className={`aspect-square w-full rounded-[2px] border border-slate-200/80 ${level === 3
                    ? "bg-emerald-500"
                    : level === 2
                      ? "bg-emerald-400/80"
                      : level === 1
                        ? "bg-emerald-300/70"
                        : "bg-white"
                  }`}
                key={`activity-${index}`}
              />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Learn how we count contributions</span>
          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-[2px] bg-white" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-300/70" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-400/80" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-500" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentActivityHeatmap;
