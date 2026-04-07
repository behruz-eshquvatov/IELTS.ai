import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const RANGE_OPTIONS = [
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "lifetime", label: "Lifetime" },
];

export default function StudentAnalyticsRangePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const activeOption = RANGE_OPTIONS.find((item) => item.value === value) ?? RANGE_OPTIONS[0];

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex min-w-[180px] items-center justify-between gap-3 rounded-none border border-slate-200/90 bg-[#fffaf4] px-4 py-2.5 text-left transition hover:border-emerald-300/60"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Analytics period
          </span>
          <span className="mt-0.5 block text-sm font-semibold text-slate-900">
            {activeOption.label}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`absolute right-0 top-[calc(100%+0.5rem)] z-30 min-w-[180px] overflow-hidden rounded-none border border-slate-200/90 bg-[#fffaf4] shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)] transition ${
          isOpen ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1"
        }`}
        role="listbox"
        aria-label="Analytics period options"
      >
        {RANGE_OPTIONS.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full border-b border-slate-200/70 px-4 py-2.5 text-left text-sm transition last:border-b-0 ${
                isActive
                  ? "emerald-gradient-fill font-semibold text-white"
                  : "text-slate-700 hover:bg-emerald-50/70 hover:text-emerald-800"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
