import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react";

const overviewByRange = {
  week: {
    scoreTitle: "Overall score",
    scoreBody:
      "Momentum is building from consistent listening + reading practice.",
    scoreTrend: "+0.5 vs last week",
    scoreTrendUp: true,
    scoreValue: "7.5",
    timeTitle: "Time spent",
    timeBody: "Slightly lower study time than last week, but accuracy stayed stable.",
    timeTrend: "12% less",
    timeTrendUp: false,
    timeValue: "7h 32m",
    slides: [
      {
        id: "listening",
        label: "Listening",
        segments: [
          { text: "Listening shows repeated errors in ", bold: false },
          { text: "map labeling", bold: true },
          { text: ". You missed ", bold: false },
          { text: "12", bold: true },
          {
            text: " items this week, mostly in Section 2 form completion.",
            bold: false,
          },
        ],
        mistakes: 12,
        suggestion: "Map Labelling Sprint.",
      },
      {
        id: "reading",
        label: "Reading",
        segments: [
          { text: "Reading accuracy dips in ", bold: false },
          { text: "matching headings", bold: true },
          { text: ". You missed ", bold: false },
          { text: "9", bold: true },
          {
            text: " answers this week, mainly under time pressure.",
            bold: false,
          },
        ],
        mistakes: 9,
        suggestion: "Heading Match Accelerator.",
      },
      {
        id: "writing",
        label: "Writing",
        segments: [
          { text: "Writing shows structure issues in ", bold: false },
          { text: "Task 2 cohesion", bold: true },
          { text: ". You made ", bold: false },
          { text: "7", bold: true },
          {
            text: " critical errors this week, mostly in paragraph flow.",
            bold: false,
          },
        ],
        mistakes: 7,
        suggestion: "Task 2 Cohesion micro-course.",
      },
    ],
  },
  month: {
    scoreTitle: "Overall score",
    scoreBody:
      "Monthly trend is stronger with better consistency in test completion.",
    scoreTrend: "+0.8 vs last month",
    scoreTrendUp: true,
    scoreValue: "7.8",
    timeTitle: "Time spent",
    timeBody:
      "Total study time increased this month, and score volatility dropped.",
    timeTrend: "18% more",
    timeTrendUp: true,
    timeValue: "31h 18m",
    slides: [
      {
        id: "listening",
        label: "Listening",
        segments: [
          { text: "Listening still struggles with ", bold: false },
          { text: "map labeling", bold: true },
          { text: ". You missed ", bold: false },
          { text: "34", bold: true },
          {
            text: " items this month, mostly in direction-heavy tasks.",
            bold: false,
          },
        ],
        mistakes: 34,
        suggestion: "4-week Map + Form completion ladder.",
      },
      {
        id: "reading",
        label: "Reading",
        segments: [
          { text: "Reading weakness remains in ", bold: false },
          { text: "matching headings", bold: true },
          { text: ". You missed ", bold: false },
          { text: "31", bold: true },
          {
            text: " answers this month across late passages.",
            bold: false,
          },
        ],
        mistakes: 31,
        suggestion: "Weekly Heading logic sprint.",
      },
      {
        id: "writing",
        label: "Writing",
        segments: [
          { text: "Writing needs work in ", bold: false },
          { text: "Task 2 cohesion", bold: true },
          { text: ". You made ", bold: false },
          { text: "28", bold: true },
          {
            text: " critical errors this month in flow and linking.",
            bold: false,
          },
        ],
        mistakes: 28,
        suggestion: "Cohesion repair plan (4 weeks).",
      },
    ],
  },
  lifetime: {
    scoreTitle: "Overall score",
    scoreBody:
      "Lifetime performance shows steady growth with stronger control in all sections.",
    scoreTrend: "+1.4 all-time",
    scoreTrendUp: true,
    scoreValue: "8.1",
    timeTitle: "Time spent",
    timeBody:
      "Long-term practice volume is high and supports stable scoring outcomes.",
    timeTrend: "412h total",
    timeTrendUp: true,
    timeValue: "412h",
    slides: [
      {
        id: "listening",
        label: "Listening",
        segments: [
          { text: "Lifetime listening errors are highest in ", bold: false },
          { text: "map labeling", bold: true },
          { text: ", with ", bold: false },
          { text: "94", bold: true },
          {
            text: " mistakes accumulated across full tests.",
            bold: false,
          },
        ],
        mistakes: 94,
        suggestion: "Long-cycle listening recovery track.",
      },
      {
        id: "reading",
        label: "Reading",
        segments: [
          { text: "Lifetime reading bottleneck is ", bold: false },
          { text: "matching headings", bold: true },
          { text: ", with ", bold: false },
          { text: "90", bold: true },
          {
            text: " misses, especially in abstract passages.",
            bold: false,
          },
        ],
        mistakes: 90,
        suggestion: "Reading precision master path.",
      },
      {
        id: "writing",
        label: "Writing",
        segments: [
          { text: "Lifetime writing issue remains ", bold: false },
          { text: "Task 2 cohesion", bold: true },
          { text: ", with ", bold: false },
          { text: "84", bold: true },
          {
            text: " critical mistakes across essays.",
            bold: false,
          },
        ],
        mistakes: 84,
        suggestion: "Advanced cohesion + structure sequence.",
      },
    ],
  },
};

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

export default function StudentAnalyticsOverview({ range = "week", showHeader = true }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSolutionVisible, setIsSolutionVisible] = useState(false);
  const [isTitleVisible, setIsTitleVisible] = useState(true);
  const [isThinking, setIsThinking] = useState(true);
  const [typingSeed, setTypingSeed] = useState(0);

  const content = overviewByRange[range] ?? overviewByRange.week;
  const slides = content.slides;
  const activeSlide = slides[activeIndex] ?? slides[0];

  const { renderedSegments, isComplete } = useTypedSegments(
    activeSlide.segments,
    15,
    `${range}-${activeIndex}-${typingSeed}`
  );

  useEffect(() => {
    setActiveIndex(0);
    setIsSolutionVisible(false);
  }, [range]);

  useEffect(() => {
    setIsSolutionVisible(false);
  }, [activeIndex]);

  useEffect(() => {
    setIsTitleVisible(false);
    const timer = setTimeout(() => setIsTitleVisible(true), 120);
    return () => clearTimeout(timer);
  }, [activeIndex, range]);

  useEffect(() => {
    setIsThinking(true);
    const timer = setTimeout(() => {
      setIsThinking(false);
      setTypingSeed((prev) => prev + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [activeIndex, range]);

  const handleNext = () => setActiveIndex((prev) => (prev + 1) % slides.length);

  return (
    <section className="space-y-4">
      {showHeader ? (
        <header className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Analytics Overview
          </p>
        </header>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="relative flex h-[260px] flex-col overflow-hidden border border-slate-200/80 bg-[#fffaf4]/95 p-6">
          <div className="relative z-10 flex h-full flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{content.scoreTitle}</p>
            <p className="mt-3 text-[0.98rem] font-normal leading-relaxed text-slate-800">
              {content.scoreBody}
            </p>
            <div className="mt-auto">
              <span className={`inline-flex items-center gap-1 text-sm font-bold ${content.scoreTrendUp ? "text-emerald-700" : "text-rose-600"}`}>
                {content.scoreTrendUp ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {content.scoreTrend}
              </span>
            </div>
          </div>
          <span className="pointer-events-none absolute -bottom-6 -right-2 select-none text-[6.5rem] font-black leading-none text-emerald-500/10">
            {content.scoreValue}
          </span>
        </div>

        <div className="relative flex h-[260px] flex-col overflow-hidden border border-slate-200/80 bg-[#fffaf4]/95 p-6">
          <div className="relative z-10 flex h-full flex-col">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{content.timeTitle}</p>
            <p className="mt-3 text-[0.98rem] font-normal leading-relaxed text-slate-800">
              {content.timeBody}
            </p>
            <div className="mt-auto">
              <span className={`inline-flex items-center gap-1 text-sm font-bold ${content.timeTrendUp ? "text-emerald-700" : "text-rose-600"}`}>
                {content.timeTrendUp ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {content.timeTrend}
              </span>
            </div>
          </div>
          <span className="pointer-events-none absolute -bottom-6 -right-2 select-none text-right text-[6.5rem] font-black leading-none text-emerald-500/10">
            {content.timeValue}
          </span>
        </div>

        <div className="relative lg:col-span-2">
          <div
            className="relative h-[260px] overflow-hidden border border-slate-200/80 bg-[#fffaf4]/95"
            onMouseLeave={() => setIsSolutionVisible(false)}
          >
            <div className={`relative z-10 h-full p-6 transition-all duration-300 ${isSolutionVisible ? "-translate-y-8 opacity-0" : "translate-y-0 opacity-100"}`}>
              <p
                className={`text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 transition-opacity duration-300 ${
                  isTitleVisible ? "opacity-100" : "opacity-0"
                }`}
              >
                Problematic areas: {activeSlide.label}
              </p>
              <p className="mt-3 max-w-[70%] text-[0.98rem] font-normal leading-relaxed text-slate-800">
                {isThinking ? (
                  <span className="inline-flex items-center gap-2 text-slate-500">
                    <span>Thinking</span>
                    <span className="inline-flex gap-1">
                      <span className="h-1 w-1 rounded-full bg-slate-400/80 animate-pulse" />
                      <span className="h-1 w-1 rounded-full bg-slate-400/80 animate-pulse [animation-delay:150ms]" />
                      <span className="h-1 w-1 rounded-full bg-slate-400/80 animate-pulse [animation-delay:300ms]" />
                    </span>
                  </span>
                ) : (
                  <>
                    {renderedSegments}
                    {!isComplete ? (
                      <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-emerald-500" />
                    ) : null}
                  </>
                )}
              </p>

              <button
                onMouseEnter={() => setIsSolutionVisible(true)}
                className="absolute bottom-6 left-6 inline-flex items-center gap-2 text-sm font-bold text-slate-950 transition-colors hover:text-emerald-700"
              >
                <span>Solution</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <div className={`absolute inset-0 z-20 flex flex-col bg-[#fffaf4] p-6 transition-transform duration-500 ${isSolutionVisible ? "translate-y-0" : "translate-y-full"}`}>
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-slate-400">The Solution:</p>
              <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                {activeSlide.suggestion}
              </p>
              <button className="mt-auto flex items-center gap-2 text-sm font-bold text-emerald-700">
                Open resources <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            <span className="pointer-events-none absolute -bottom-6 -right-4 z-0 select-none text-[12rem] font-black leading-none text-rose-500/[0.08]">
              {activeSlide.mistakes}
            </span>
          </div>

          <button
            onClick={handleNext}
            className="emerald-gradient-fill absolute -right-5 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-lg transition hover:shadow-[0_22px_50px_-32px_rgba(16,185,129,0.85)]"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" strokeWidth={3} />
          </button>
        </div>
      </div>
    </section>
  );
}
