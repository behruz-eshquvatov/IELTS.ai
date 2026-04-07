import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import MagneticButton from "../../components/ui/MagneticButton";

const analysisSegments = [
  { text: "Your accuracy trend is improving, but ", bold: false },
  { text: "map labeling", bold: true },
  { text: " still causes the most time loss. You missed ", bold: false },
  { text: "12", bold: true },
  {
    text: " items this week in Section 2, mostly from late direction cues. Focus on pre-reading the map legend and marking anchor points before audio starts.",
    bold: false,
  },
];

const suggestionSegments = [
  { text: "Suggested focus: ", bold: false },
  { text: "Map Labelling Sprint", bold: true },
  {
    text: " and a 20-minute daily form completion drill. Re-do the same passage 24 hours later to lock pattern recognition.",
    bold: false,
  },
];

function useTypedSegments(segments, speed, resetKey) {
  const totalLength = useMemo(
    () => segments.reduce((sum, segment) => sum + segment.text.length, 0),
    [segments]
  );
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    setVisibleCount(0);
    if (!totalLength) return;
    const interval = setInterval(() => {
      setVisibleCount((prev) => {
        if (prev >= totalLength) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => clearInterval(interval);
  }, [totalLength, speed, resetKey]);

  const renderedSegments = useMemo(() => {
    let remaining = visibleCount;
    return segments
      .map((segment, index) => {
        if (remaining <= 0) return null;
        const slice = segment.text.slice(0, Math.min(remaining, segment.text.length));
        remaining -= segment.text.length;
        if (!slice) return null;
        if (segment.bold) {
          return (
            <strong key={`${segment.text}-${index}`} className="font-semibold text-slate-900">
              {slice}
            </strong>
          );
        }
        return <span key={`${segment.text}-${index}`}>{slice}</span>;
      })
      .filter(Boolean);
  }, [segments, visibleCount]);

  return { renderedSegments, isComplete: visibleCount >= totalLength };
}

export default function StudentAnalyticsAssistantPage() {
  const { renderedSegments: analysisText, isComplete } = useTypedSegments(analysisSegments, 16, "analysis");
  const { renderedSegments: suggestionText } = useTypedSegments(suggestionSegments, 16, "suggestions");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            AI Analysis
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Weekly performance summary
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MagneticButton
            className="emerald-gradient-fill inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_-30px_rgba(16,185,129,0.7)]"
            innerClassName="flex items-center gap-2"
            type="button"
          >
            <span>Regenerate</span>
            <ArrowUpRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700"
            innerClassName="flex items-center gap-2"
            type="button"
          >
            <span>Download PDF</span>
            <Download className="h-4 w-4" />
          </MagneticButton>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-none border border-slate-200 bg-[#fffaf4] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Analysis</p>
            <p className="mt-3 text-[1rem] leading-relaxed text-slate-800">
              {analysisText}
              {!isComplete ? (
                <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-emerald-500" />
              ) : null}
            </p>
          </div>

          <div className="rounded-none border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Suggestions</p>
            <p className="mt-3 text-[1rem] leading-relaxed text-slate-800">{suggestionText}</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-slate-500">Ask for a deeper breakdown anytime.</span>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col rounded-none border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Chat</p>
          <div className="mt-4 flex-1 space-y-3 overflow-auto">
            <div className="rounded-none border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Hi! Ask me about any section and I will break down the mistakes and next steps.
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
            <input
              type="text"
              placeholder="Ask about your week..."
              className="flex-1 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400"
            />
            <MagneticButton
              className="emerald-gradient-fill inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white"
              innerClassName="flex items-center gap-2"
              type="button"
            >
              <span>Send</span>
              <ArrowUpRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>
      </div>
    </div>
  );
}
