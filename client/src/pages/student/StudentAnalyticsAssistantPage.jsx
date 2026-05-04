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

function ThinkingText({ label = "Thinking" }) {
  return (
    <span className="inline-flex items-center gap-1 text-slate-500">
      <span>{label}</span>
      <span className="inline-flex w-5 justify-start">
        <span className="animate-pulse">.</span>
        <span className="animate-pulse [animation-delay:150ms]">.</span>
        <span className="animate-pulse [animation-delay:300ms]">.</span>
      </span>
    </span>
  );
}

function useDelayedFlag(delayMs, resetKey, isEnabled = true) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setIsReady(true);
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs, isEnabled, resetKey]);

  return isReady;
}

function useTypedSegments(segments, speed, resetKey, isEnabled = true) {
  const totalLength = useMemo(
    () => segments.reduce((sum, segment) => sum + segment.text.length, 0),
    [segments]
  );
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (!totalLength || !isEnabled) return undefined;
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
  }, [totalLength, speed, resetKey, isEnabled]);

  const renderedSegments = useMemo(() => {
    return segments
      .map((segment, index) => {
        const previousLength = segments
          .slice(0, index)
          .reduce((sum, previousSegment) => sum + previousSegment.text.length, 0);
        const visibleLength = Math.max(0, Math.min(visibleCount - previousLength, segment.text.length));
        if (visibleLength <= 0) return null;
        const slice = segment.text.slice(0, visibleLength);
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
  const [chatDraft, setChatDraft] = useState("");
  const analysisReady = useDelayedFlag(700, "analysis");
  const { renderedSegments: analysisText, isComplete: isAnalysisComplete } = useTypedSegments(
    analysisSegments,
    16,
    "analysis",
    analysisReady,
  );
  const suggestionsReady = useDelayedFlag(900, "suggestions", isAnalysisComplete);
  const { renderedSegments: suggestionText, isComplete: isSuggestionComplete } = useTypedSegments(
    suggestionSegments,
    16,
    "suggestions",
    suggestionsReady,
  );
  const chatTextareaRows = Math.min(5, Math.max(1, chatDraft.split("\n").length));

  function handleChatSend() {
    const safeDraft = chatDraft.trim();
    if (!safeDraft) {
      return;
    }

    setChatDraft("");
  }

  function handleChatKeyDown(event) {
    if (event.key !== "Enter" || event.ctrlKey) {
      return;
    }

    event.preventDefault();
    handleChatSend();
  }

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
            className="text-sm font-semibold text-white"
            innerClassName="emerald-gradient-fill flex items-center gap-2 rounded-full px-5 py-2 shadow-[0_18px_40px_-30px_rgba(16,185,129,0.7)]"
            type="button"
          >
            <span>Regenerate</span>
            <ArrowUpRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton
            className="text-sm font-semibold text-slate-700"
            innerClassName="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2"
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
              {!analysisReady ? <ThinkingText /> : analysisText}
              {analysisReady && !isAnalysisComplete ? (
                <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-emerald-500" />
              ) : null}
            </p>
          </div>

          <div className="rounded-none border border-slate-200 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Suggestions</p>
            <p className="mt-3 text-[1rem] leading-relaxed text-slate-800">
              {!isAnalysisComplete ? (
                <span className="text-slate-400">Waiting for analysis...</span>
              ) : !suggestionsReady ? (
                <ThinkingText label="Thinking about suggestions" />
              ) : (
                suggestionText
              )}
              {suggestionsReady && !isSuggestionComplete ? (
                <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-emerald-500" />
              ) : null}
            </p>
            {isSuggestionComplete ? (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-slate-500">Ask for a deeper breakdown anytime.</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex h-full flex-col rounded-none border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Chat</p>
          <div className="mt-4 flex-1 space-y-3 overflow-auto">
            <div className="rounded-none border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Ask there about any section and get a breakdown of mistakes and next steps.
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
            <textarea
              placeholder="Ask about your week..."
              className="max-h-36 min-h-[2.625rem] flex-1 resize-none whitespace-pre-wrap border-0 border-b border-slate-200 bg-transparent px-0 py-2 text-sm leading-6 text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-300"
              onChange={(event) => setChatDraft(event.target.value)}
              onKeyDown={handleChatKeyDown}
              rows={chatTextareaRows}
              value={chatDraft}
            />
            <MagneticButton
              className="text-sm font-semibold text-white"
              innerClassName="emerald-gradient-fill flex items-center gap-2 rounded-full px-4 py-2"
              onClick={handleChatSend}
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
