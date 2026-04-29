import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronRight, Plus, Users } from "lucide-react";
import MagneticButton from "../ui/MagneticButton";

function RollingHoverLabel({ label, hoverClassName = "text-emerald-600" }) {
  return (
    <span className="relative block h-[1.2rem] overflow-hidden leading-none">
      <span className="flex translate-y-0 flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
        <span className="flex h-[1.2rem] items-center text-slate-700">{label}</span>
        <span className={`flex h-[1.2rem] items-center ${hoverClassName}`}>{label}</span>
      </span>
    </span>
  );
}

function EditableField({
  value,
  field,
  classId,
  editingField,
  draftValue,
  onDraftChange,
  onStartEditing,
  onCommit,
  onCancel,
  className,
  inputClassName,
  minWidth = 200,
  extraWidth = 30,
}) {
  const inputRef = useRef(null);
  const measureRef = useRef(null);
  const [inputWidth, setInputWidth] = useState(minWidth);
  const isEditing = editingField?.classId === classId && editingField?.field === field;

  useEffect(() => {
    if (!isEditing || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    inputRef.current.select();
  }, [isEditing]);

  useLayoutEffect(() => {
    if (!isEditing || !measureRef.current) {
      return;
    }

    const measuredWidth = Math.ceil(measureRef.current.getBoundingClientRect().width + extraWidth);
    setInputWidth(Math.max(minWidth, measuredWidth));
  }, [draftValue, extraWidth, isEditing, minWidth]);

  if (isEditing) {
    return (
      <>
        <span
          ref={measureRef}
          className="pointer-events-none fixed left-[-9999px] top-[-9999px] whitespace-pre font-semibold"
        >
          {draftValue || value || " "}
        </span>
        <input
          ref={inputRef}
          className={inputClassName}
          onBlur={onCommit}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCommit();
            }

            if (event.key === "Escape") {
              onCancel();
            }
          }}
          style={{ width: `${inputWidth}px` }}
          type="text"
          value={draftValue}
        />
      </>
    );
  }

  return (
    <button className={className} onDoubleClick={onStartEditing} type="button">
      {value}
    </button>
  );
}

function TeacherClassCard({
  classroom,
  viewMode,
  editingField,
  draftValue,
  onDraftChange,
  onStartEditing,
  onCommit,
  onCancel,
  onOpenStudents,
}) {
  const cardRef = useRef(null);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!cardRef.current) {
        return;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      cardRef.current.style.setProperty("--card-x", `${x}px`);
      cardRef.current.style.setProperty("--card-y", `${y}px`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <article
      ref={cardRef}
      className="group/class-card relative z-0 overflow-visible bg-slate-200 p-[1.5px] cursor-default transition-colors duration-600"
      style={{
        backgroundImage:
          "radial-gradient(480px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,1), transparent 68%), radial-gradient(760px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.14), transparent 62%)",
      }}
    >
      <div
        className={`relative flex h-full overflow-hidden ${
          viewMode === "grid"
            ? "justify-center bg-[#f7f4ef] aspect-square flex-col p-6"
            : "justify-center bg-[#f7f4ef] min-h-[140px] flex-col px-6 py-4"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent opacity-0 transition-opacity duration-500 group-hover/class-card:opacity-100" />

        {viewMode === "grid" ? (
          <>
            <div className="relative z-10 flex-1">
              <div className="space-y-1">
                <EditableField
                  classId={classroom.id}
                  className="cursor-text text-left text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-950"
                  draftValue={draftValue}
                  editingField={editingField}
                  extraWidth={30}
                  field="name"
                  inputClassName="border border-emerald-200 bg-white px-2 py-1 text-[2rem] font-semibold leading-none tracking-[-0.04em] text-slate-950 outline-none ring-2 ring-emerald-100"
                  minWidth={200}
                  onCancel={onCancel}
                  onCommit={onCommit}
                  onDraftChange={onDraftChange}
                  onStartEditing={() => onStartEditing(classroom.id, "name", classroom.name)}
                  value={classroom.name}
                />
              </div>

              <div className="mt-6 space-y-3 text-sm text-slate-700">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover/class-card:text-emerald-500" />
                  <span>{classroom.startTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover/class-card:text-emerald-500" />
                  <button
                    className="group inline-flex cursor-pointer items-center gap-2 text-left"
                    onClick={() => onOpenStudents(classroom.id)}
                    type="button"
                  >
                    <RollingHoverLabel hoverClassName="text-emerald-600" label={`${classroom.students} students`} />
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-transparent text-slate-500 transition-colors duration-200 group-hover:border-emerald-300 group-hover:text-emerald-700">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 border-t border-slate-200/80 pt-4">
              <div className="flex justify-end">
              <MagneticButton
                className="rounded-full"
                disableGlow
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]"
                to={`/teacher/classes/${classroom.id}`}
              >
                Enter to classroom
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/class-card:translate-x-1" />
              </MagneticButton>
              </div>
            </div>
          </>
        ) : (
          <div className="relative z-10 flex w-full items-center gap-6">
            <div className="w-full max-w-[75%]">
              <div className="space-y-1">
                <EditableField
                  classId={classroom.id}
                  className="cursor-text text-left text-[1.45rem] font-semibold leading-none tracking-[-0.04em] text-slate-950"
                  draftValue={draftValue}
                  editingField={editingField}
                  extraWidth={30}
                  field="name"
                  inputClassName="border border-emerald-200 bg-white px-2 py-1 text-[1.45rem] font-semibold leading-none tracking-[-0.04em] text-slate-950 outline-none ring-2 ring-emerald-100"
                  minWidth={200}
                  onCancel={onCancel}
                  onCommit={onCommit}
                  onDraftChange={onDraftChange}
                  onStartEditing={() => onStartEditing(classroom.id, "name", classroom.name)}
                  value={classroom.name}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[0.92rem] text-slate-700">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover/class-card:text-emerald-500" />
                  <span>{classroom.startTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover/class-card:text-emerald-500" />
                  <button
                    className="group inline-flex cursor-pointer items-center gap-2 text-left"
                    onClick={() => onOpenStudents(classroom.id)}
                    type="button"
                  >
                    <RollingHoverLabel hoverClassName="text-emerald-600" label={`${classroom.students} students`} />
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-transparent text-slate-500 transition-colors duration-200 group-hover:border-emerald-300 group-hover:text-emerald-700">
                      <Plus className="h-3.5 w-3.5" />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="ml-auto flex w-full max-w-[25%] items-center justify-end">
              <MagneticButton
                className="rounded-full"
                disableGlow
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]"
                to={`/teacher/classes/${classroom.id}`}
              >
                Enter to classroom
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/class-card:translate-x-1" />
              </MagneticButton>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default TeacherClassCard;
