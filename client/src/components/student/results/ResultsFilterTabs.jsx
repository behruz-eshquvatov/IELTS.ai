import { LayoutGroup, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function RollingLabel({ label, active }) {
  return (
    <span className="relative block h-[1.2rem] overflow-hidden">
      <span
        className={`flex flex-col transition-transform duration-300 ease-out group-hover/filter:-translate-y-1/2 ${
          active ? "-translate-y-1/2" : "translate-y-0"
        }`}
      >
        <span className="h-[1.2rem]">{label}</span>
        <span className="h-[1.2rem] text-slate-950">{label}</span>
      </span>
    </span>
  );
}

function ResultsFilterTabs({ filters = [], activeKey = "all", onChange }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = scrollRef.current;
    if (!element) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    setCanScrollLeft(element.scrollLeft > 2);
    setCanScrollRight(element.scrollLeft < maxScrollLeft - 2);
  }, []);

  const handleArrowScroll = useCallback((direction) => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    element.scrollBy({
      left: direction * 280,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) {
      return;
    }

    const activeElement = element.querySelector(`[data-filter-key="${String(activeKey)}"]`);
    if (activeElement && typeof activeElement.scrollIntoView === "function") {
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeKey, filters]);

  return (
    <LayoutGroup>
      <div className="rounded-none border border-slate-200/90 bg-[#fbf8f2] p-3">
        <div className="flex items-center gap-2">
          <button
            aria-label="Scroll filters left"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center border text-slate-700 transition ${
              canScrollLeft
                ? "border-slate-300 bg-white hover:border-slate-400 hover:text-slate-900"
                : "border-slate-200 bg-slate-100 text-slate-300"
            }`}
            disabled={!canScrollLeft}
            onClick={() => handleArrowScroll(-1)}
            type="button"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={scrollRef}
            className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onScroll={updateScrollState}
          >
            <div className="flex min-w-max items-center gap-2 pr-1">
          {(Array.isArray(filters) ? filters : []).map((filter) => {
            const isActive = activeKey === filter.key;
            const label = `${filter?.label || String(filter?.key || "").toUpperCase()} (${Number(filter?.count || 0)})`;

            return (
              <button
                className={`group/filter relative shrink-0 rounded-none px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                  isActive ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                }`}
                data-filter-key={String(filter?.key || "")}
                key={String(filter?.key || label)}
                onClick={() => onChange?.(filter?.key || "all")}
                type="button"
              >
                {isActive ? (
                  <motion.span
                    className="absolute inset-0 z-0 border border-slate-300 bg-white"
                    layoutId="results-filter-active-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                ) : null}
                <RollingLabel active={isActive} label={label} />
              </button>
            );
          })}
            </div>
          </div>

          <button
            aria-label="Scroll filters right"
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center border text-slate-700 transition ${
              canScrollRight
                ? "border-slate-300 bg-white hover:border-slate-400 hover:text-slate-900"
                : "border-slate-200 bg-slate-100 text-slate-300"
            }`}
            disabled={!canScrollRight}
            onClick={() => handleArrowScroll(1)}
            type="button"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </LayoutGroup>
  );
}

export default ResultsFilterTabs;
