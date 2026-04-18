import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function PracticeTipsCarousel({ tips = [] }) {
  const safeTips = useMemo(() => {
    if (!Array.isArray(tips) || tips.length === 0) {
      return ["Review instructions first and stay consistent with answer format."];
    }

    const preparedTips = tips.map((tip) => String(tip || "").trim()).filter(Boolean);
    if (preparedTips.length === 0) {
      return ["Review instructions first and stay consistent with answer format."];
    }

    return preparedTips;
  }, [tips]);
  const tipsKey = useMemo(() => safeTips.join("||"), [safeTips]);
  const [activeTipIndex, setActiveTipIndex] = useState(0);

  useEffect(() => {
    setActiveTipIndex(0);
  }, [tipsKey]);

  useEffect(() => {
    if (safeTips.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveTipIndex((previousIndex) => (previousIndex + 1) % safeTips.length);
    }, 40000);

    return () => window.clearInterval(intervalId);
  }, [safeTips.length, tipsKey]);

  return (
    <section className="relative overflow-hidden rounded-none border border-slate-800 bg-slate-950 px-6 py-5 sm:px-10 sm:py-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-slate-900/85 to-slate-950" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative z-10 min-h-[190px]">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
          Before You Start
        </p>

        {safeTips.map((tipText, index) => {
          const isActive = index === activeTipIndex;

          return (
            <article
              className={`absolute inset-0 flex flex-col items-center justify-center px-10 text-center transition-opacity duration-700 ${
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              key={`${index}-${tipText.slice(0, 20)}`}
            >
              <p className="mx-auto max-w-3xl text-base leading-8 text-slate-100 sm:text-lg">{tipText}</p>
            </article>
          );
        })}

        {safeTips.length > 1 ? (
          <>
            <button
              aria-label="Previous tip"
              className="absolute left-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-600 bg-slate-900 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 sm:left-2"
              onClick={() =>
                setActiveTipIndex((previousIndex) =>
                  previousIndex === 0 ? safeTips.length - 1 : previousIndex - 1,
                )
              }
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              aria-label="Next tip"
              className="absolute right-0 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-slate-600 bg-slate-900 text-slate-200 transition hover:border-emerald-400 hover:text-emerald-300 sm:right-2"
              onClick={() => setActiveTipIndex((previousIndex) => (previousIndex + 1) % safeTips.length)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}

export default PracticeTipsCarousel;
