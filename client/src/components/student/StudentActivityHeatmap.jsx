import React, { useCallback, useEffect, useMemo, useRef } from "react";

export function StudentActivityHeatmap({ months, activityData }) {
  const columns = useMemo(() => Math.ceil(activityData.length / 7), [activityData.length]);
  const canvasRef = useRef(null);
  const gridRef = useRef(null);

  const drawHeatmap = useCallback(() => {
    const canvas = canvasRef.current;
    const grid = gridRef.current;
    if (!canvas || !grid) return;

    const width = grid.clientWidth;
    if (!width) return;

    const rows = 7;
    const gap = 4;
    const cellSize = Math.max((width - gap * (columns - 1)) / columns, 2);
    const height = cellSize * rows + gap * (rows - 1);
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const colors = {
      0: "#ffffff",
      1: "#86efac",
      2: "#34d399",
      3: "#059669",
    };

    for (let i = 0; i < activityData.length; i += 1) {
      const level = activityData[i] ?? 0;
      const col = Math.floor(i / rows);
      const row = i % rows;
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);
      ctx.fillStyle = colors[level] || colors[0];
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = "rgba(148,163,184,0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, cellSize - 1, cellSize - 1);
    }
  }, [activityData, columns]);

  useEffect(() => {
    drawHeatmap();

    const observer = new ResizeObserver(() => {
      drawHeatmap();
    });

    if (gridRef.current) {
      observer.observe(gridRef.current);
    }

    return () => observer.disconnect();
  }, [drawHeatmap]);

  return (
    <div className="w-full text-slate-700">
      <div className="rounded-none border border-slate-200/80 bg-[#fbf7f0]/90 p-4">
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

          <div ref={gridRef} className="w-full">
            <canvas ref={canvasRef} className="block" />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Learn how we count contributions</span>
          <div className="flex items-center gap-2">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <span className="h-3 w-3 rounded-[2px] bg-white" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-300" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-400" />
              <span className="h-3 w-3 rounded-[2px] bg-emerald-600" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentActivityHeatmap;
