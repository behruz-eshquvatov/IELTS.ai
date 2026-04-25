import { LayoutGroup, motion as Motion } from "framer-motion";
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
  const autoScrollFrameRef = useRef(null);
  const autoScrollDirectionRef = useRef(0);
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

  const stopAutoScroll = useCallback(() => {
    autoScrollDirectionRef.current = 0;
    if (autoScrollFrameRef.current) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((direction) => {
    autoScrollDirectionRef.current = direction;

    if (autoScrollFrameRef.current) {
      return;
    }

    const tick = () => {
      const element = scrollRef.current;
      const currentDirection = autoScrollDirectionRef.current;

      if (!element || currentDirection === 0) {
        autoScrollFrameRef.current = null;
        return;
      }

      const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
      if (
        (currentDirection < 0 && element.scrollLeft <= 0)
        || (currentDirection > 0 && element.scrollLeft >= maxScrollLeft)
      ) {
        stopAutoScroll();
        updateScrollState();
        return;
      }

      element.scrollLeft += currentDirection * 7;
      updateScrollState();
      autoScrollFrameRef.current = window.requestAnimationFrame(tick);
    };

    autoScrollFrameRef.current = window.requestAnimationFrame(tick);
  }, [stopAutoScroll, updateScrollState]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateScrollState);
      stopAutoScroll();
    };
  }, [stopAutoScroll, updateScrollState]);

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

    const frameId = window.requestAnimationFrame(updateScrollState);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [activeKey, filters, updateScrollState]);

  return (
    <LayoutGroup>
      <div className="border-none bg-transparent p-0">
        <div className="relative">
          <div
            ref={scrollRef}
            className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            onScroll={updateScrollState}
          >
            <div className="flex min-w-max items-center gap-2 pr-1">
              {(Array.isArray(filters) ? filters : []).map((filter) => {
                const isActive = activeKey === filter.key;
                const label = filter?.label || String(filter?.key || "").toUpperCase();

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
                      <Motion.span
                        className="absolute inset-0 z-0 border-b-2 border-slate-500 bg-transparent"
                        layoutId="results-filter-active-underline"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    ) : null}
                    <RollingLabel active={isActive} label={label} />
                  </button>
                );
              })}
            </div>
          </div>

          <div
            aria-hidden="true"
            className={`absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-[#fbf8f2]/80 to-transparent transition-opacity ${
              canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onMouseEnter={() => startAutoScroll(-1)}
            onMouseLeave={stopAutoScroll}
          />
          <div
            aria-hidden="true"
            className={`absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-[#fbf8f2]/80 to-transparent transition-opacity ${
              canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onMouseEnter={() => startAutoScroll(1)}
            onMouseLeave={stopAutoScroll}
          />
        </div>
      </div>
    </LayoutGroup>
  );
}

export default ResultsFilterTabs;
