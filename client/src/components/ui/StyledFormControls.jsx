import { Children, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
} from "lucide-react";

const sidebarActiveClass =
  "emerald-gradient-fill text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]";
const sidebarHoverClass = "hover:bg-emerald-100/70 hover:text-emerald-900";

function padTwoDigits(value) {
  return String(value).padStart(2, "0");
}

function parseDateValue(value) {
  const safe = String(value || "").trim();
  if (!safe) {
    return null;
  }

  const date = new Date(`${safe}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateValue(date) {
  return `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;
}

function formatDateDisplay(value) {
  const parsedDate = parseDateValue(value);
  if (!parsedDate) {
    return "dd.mm.yyyy";
  }

  return `${padTwoDigits(parsedDate.getDate())}.${padTwoDigits(parsedDate.getMonth() + 1)}.${parsedDate.getFullYear()}`;
}

function normalizeTimeValue(value) {
  const safe = String(value || "").trim();
  const match = safe.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return { hour: "20", minute: "00", value: "20:00" };
  }

  const hour = Math.min(23, Math.max(0, Number.parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, Number.parseInt(match[2], 10)));
  return {
    hour: padTwoDigits(hour),
    minute: padTwoDigits(minute),
    value: `${padTwoDigits(hour)}:${padTwoDigits(minute)}`,
  };
}

function useDismissibleLayer(isOpen, onClose, refs = []) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const targetNode = event.target;
      const clickedInside = refs.some((ref) => ref.current && ref.current.contains(targetNode));
      if (!clickedInside) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose, refs]);
}

function SelectControl({ children, className = "", name = "", ...props }) {
  const { disabled = false, onChange, value, ...rest } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const optionItems = useMemo(
    () =>
      Children.toArray(children)
        .map((child) =>
          child && typeof child === "object"
            ? {
                value: String(child.props?.value ?? ""),
                label: child.props?.children,
                disabled: Boolean(child.props?.disabled),
              }
            : null,
        )
        .filter(Boolean),
    [children],
  );
  const selectedOption =
    optionItems.find((item) => item.value === String(value ?? "")) || optionItems[0] || null;

  useDismissibleLayer(isOpen, () => setIsOpen(false), [wrapperRef, buttonRef, menuRef]);

  useLayoutEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      return undefined;
    }

    const updateMenuPosition = () => {
      const button = buttonRef.current;

      if (!button) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const viewportPadding = 12;
      const menuGap = 8;
      const availableBelow = window.innerHeight - rect.bottom - viewportPadding - menuGap;
      const availableAbove = rect.top - viewportPadding - menuGap;
      const shouldOpenAbove = availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = Math.max(120, Math.min(256, shouldOpenAbove ? availableAbove : availableBelow));
      const width = rect.width;
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
      );
      const top = shouldOpenAbove
        ? Math.max(viewportPadding, rect.top - menuGap - maxHeight)
        : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + menuGap);

      setMenuPosition({
        left,
        maxHeight,
        top,
        width,
      });
    };

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, optionItems.length]);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        className={`relative flex w-full items-center border border-slate-200 bg-white text-left text-slate-900 outline-none transition-colors duration-200 focus:border-emerald-300 ${className} ${
          disabled ? "cursor-not-allowed opacity-55" : ""
        }`}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        ref={buttonRef}
        type="button"
        {...rest}
      >
        <span className="block min-w-0 flex-1 truncate">{selectedOption?.label || ""}</span>
        <ChevronDown
          className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && menuPosition && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed z-[80] overflow-hidden border border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)]"
          ref={menuRef}
          style={{
            left: `${menuPosition.left}px`,
            top: `${menuPosition.top}px`,
            width: `${menuPosition.width}px`,
          }}
        >
          <div className="overflow-y-auto py-2" style={{ maxHeight: `${menuPosition.maxHeight}px` }}>
            {optionItems.map((item) => {
              const isSelected = item.value === String(value ?? "");

              return (
                <button
                  className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition-colors duration-150 ${
                    isSelected
                      ? sidebarActiveClass
                      : `text-slate-700 ${sidebarHoverClass}`
                  } ${item.disabled ? "cursor-not-allowed opacity-50" : ""}`}
                  disabled={item.disabled}
                  key={item.value}
                  onClick={() => {
                    onChange?.({ target: { name, value: item.value } });
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span>{item.label}</span>
                  {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}

function DatePickerField({ className = "", name = "", onChange, value }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const selectedDate = parseDateValue(value);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        year: "numeric",
      }).format(viewDate),
    [viewDate],
  );
  const weekdayLabels = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  useDismissibleLayer(isOpen, () => setIsOpen(false), [wrapperRef, buttonRef]);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const previousMonthDays = new Date(year, month, 0).getDate();
    const items = [];

    for (let index = 0; index < startOffset; index += 1) {
      const day = previousMonthDays - startOffset + index + 1;
      items.push({
        key: `prev-${day}`,
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
        label: day,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({
        key: `current-${day}`,
        date: new Date(year, month, day),
        isCurrentMonth: true,
        label: day,
      });
    }

    while (items.length % 7 !== 0 || items.length < 42) {
      const day = items.length - (startOffset + daysInMonth) + 1;
      items.push({
        key: `next-${day}`,
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        label: day,
      });
    }

    return items;
  }, [viewDate]);

  const setNextDate = (nextDate) => {
    onChange?.({ target: { name, value: formatDateValue(nextDate) } });
    setViewDate(nextDate);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        className={`flex w-full items-center justify-between border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 outline-none transition-colors duration-200 focus:border-emerald-300 ${className}`}
        onClick={() => {
          setViewDate(selectedDate || new Date());
          setIsOpen((current) => !current);
        }}
        ref={buttonRef}
        type="button"
      >
        <span className={selectedDate ? "text-slate-900" : "text-slate-400"}>
          {formatDateDisplay(value)}
        </span>
        <Calendar className="ml-4 h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[19rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <button
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 ${sidebarHoverClass}`}
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold capitalize text-slate-950">{monthLabel}</p>
            <button
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 ${sidebarHoverClass}`}
              onClick={() => setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {weekdayLabels.map((weekday) => (
              <span className="py-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400" key={weekday}>
                {weekday}
              </span>
            ))}
            {calendarDays.map((item) => {
              const isSelected =
                selectedDate &&
                formatDateValue(item.date) === formatDateValue(selectedDate);

              return (
                <button
                  className={`inline-flex h-10 items-center justify-center text-sm transition-colors duration-150 ${
                    isSelected
                      ? `${sidebarActiveClass} font-semibold`
                      : item.isCurrentMonth
                        ? `text-slate-900 ${sidebarHoverClass}`
                        : "text-slate-400 hover:bg-emerald-100/70 hover:text-emerald-700"
                  }`}
                  key={item.key}
                  onClick={() => setNextDate(item.date)}
                  type="button"
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
            <button
              className="text-sm font-medium text-slate-500 transition-colors duration-150 hover:text-emerald-900"
              onClick={() => {
                onChange?.({ target: { name, value: "" } });
                setIsOpen(false);
              }}
              type="button"
            >
              Clear
            </button>
            <button
              className="text-sm font-medium text-emerald-700 transition-colors duration-150 hover:text-emerald-900"
              onClick={() => setNextDate(new Date())}
              type="button"
            >
              Today
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimePickerField({ className = "", name = "", onChange, value }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const normalizedTime = normalizeTimeValue(value);
  const hours = Array.from({ length: 24 }, (_, index) => padTwoDigits(index));
  const minutes = Array.from({ length: 60 }, (_, index) => padTwoDigits(index));

  useDismissibleLayer(isOpen, () => setIsOpen(false), [wrapperRef, buttonRef]);

  const setNextTimeValue = (nextHour, nextMinute, shouldClose = false) => {
    onChange?.({ target: { name, value: `${nextHour}:${nextMinute}` } });
    if (shouldClose) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        className={`flex w-full items-center justify-between border border-slate-200 bg-white px-4 py-3 text-left text-slate-900 outline-none transition-colors duration-200 focus:border-emerald-300 ${className}`}
        onClick={() => setIsOpen((current) => !current)}
        ref={buttonRef}
        type="button"
      >
        <span>{normalizedTime.value}</span>
        <Clock3 className="ml-4 h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-2 w-[16rem] border border-slate-200 bg-white p-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Hour
              </p>
              <div className="max-h-56 overflow-y-auto border border-slate-200">
                {hours.map((hour) => {
                  const isSelected = hour === normalizedTime.hour;

                  return (
                    <button
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors duration-150 ${
                        isSelected
                          ? `${sidebarActiveClass} font-semibold`
                          : `text-slate-700 ${sidebarHoverClass}`
                      }`}
                      key={hour}
                      onClick={() => setNextTimeValue(hour, normalizedTime.minute)}
                      type="button"
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Minute
              </p>
              <div className="max-h-56 overflow-y-auto border border-slate-200">
                {minutes.map((minute) => {
                  const isSelected = minute === normalizedTime.minute;

                  return (
                    <button
                      className={`block w-full px-3 py-2 text-left text-sm transition-colors duration-150 ${
                        isSelected
                          ? `${sidebarActiveClass} font-semibold`
                          : `text-slate-700 ${sidebarHoverClass}`
                      }`}
                      key={minute}
                      onClick={() => setNextTimeValue(normalizedTime.hour, minute, true)}
                      type="button"
                    >
                      {minute}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export {
  SelectControl,
  DatePickerField,
  TimePickerField,
};
