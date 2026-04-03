import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CalendarDays, ChevronRight, Users } from "lucide-react";
import { Link } from "react-router-dom";

function RollingHoverLabel({ label, hoverClassName = "text-emerald-600" }) {
  return (
    <span className="relative block h-[1.2rem] overflow-hidden">
      <span className="flex translate-y-0 flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
        <span className="h-[1.2rem] text-slate-700">{label}</span>
        <span className={`h-[1.2rem] ${hoverClassName}`}>{label}</span>
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
      className={`group/class-card relative overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(242,247,245,0.96))] p-px shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_28px_56px_-34px_rgba(16,185,129,0.24)] ${
        viewMode === "grid" ? "aspect-square" : "min-h-[116px]"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(360px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.28), transparent 62%), radial-gradient(620px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.08), transparent 58%)",
      }}
    >
      <div
        className={`relative flex h-full bg-white p-5 ${
          viewMode === "grid" ? "flex-col" : "flex-col gap-3 lg:flex-row lg:items-center lg:px-5 lg:py-3"
        }`}
      >
        <div
          className="pointer-events-none absolute h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),rgba(255,255,255,0)_72%)] opacity-0 transition-opacity duration-200 group-hover/class-card:opacity-100"
          style={{ left: "var(--card-x, 50%)", top: "var(--card-y, 50%)", willChange: "left, top, opacity" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent opacity-0 transition-opacity duration-500 group-hover/class-card:opacity-100" />

        <div className={`relative z-10 ${viewMode === "grid" ? "" : "flex-1"}`}>
          <div className="space-y-1">
            <EditableField
              classId={classroom.id}
              className={`cursor-text text-left font-semibold leading-none tracking-[-0.04em] text-slate-950 ${
                viewMode === "grid" ? "text-[2rem]" : "text-[1.45rem]"
              }`}
              draftValue={draftValue}
              editingField={editingField}
              extraWidth={30}
              field="name"
              inputClassName={`border border-emerald-200 bg-white px-2 py-1 font-semibold leading-none tracking-[-0.04em] text-slate-950 outline-none ring-2 ring-emerald-100 ${
                viewMode === "grid" ? "text-[2rem]" : "text-[1.45rem]"
              }`}
              minWidth={200}
              onCancel={onCancel}
              onCommit={onCommit}
              onDraftChange={onDraftChange}
              onStartEditing={() => onStartEditing(classroom.id, "name", classroom.name)}
              value={classroom.name}
            />
          </div>

          <div
            className={`text-slate-700 ${
              viewMode === "grid"
                ? "mt-6 space-y-3 text-sm"
                : "mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[0.92rem] lg:mt-2"
            }`}
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover/class-card:text-emerald-500" />
              <EditableField
                classId={classroom.id}
                className="cursor-text text-left"
                draftValue={draftValue}
                editingField={editingField}
                extraWidth={18}
                field="startTime"
                inputClassName="border border-emerald-200 bg-white px-2 py-1 text-[0.92rem] text-slate-700 outline-none ring-2 ring-emerald-100"
                minWidth={74}
                onCancel={onCancel}
                onCommit={onCommit}
                onDraftChange={onDraftChange}
                onStartEditing={() => onStartEditing(classroom.id, "startTime", classroom.startTime)}
                value={classroom.startTime}
              />
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-slate-400 transition-colors duration-300 group-hover/class-card:text-emerald-500" />
              <button
                className="group inline-flex cursor-pointer text-left"
                onClick={() => onOpenStudents(classroom.id)}
                type="button"
              >
                <RollingHoverLabel hoverClassName="text-emerald-600" label={`${classroom.students} students`} />
              </button>
            </div>
          </div>
        </div>

        <div
          className={`relative z-10 flex justify-end ${
            viewMode === "grid"
              ? "mt-auto border-t border-slate-200/80 pt-4"
              : "border-t border-slate-200/80 pt-4 lg:ml-auto lg:self-center lg:border-t-0 lg:pt-0"
          }`}
        >
          <Link
            className="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-transform duration-200 hover:-translate-y-0.5"
            to={`/teacher/classes/${classroom.id}`}
          >
            Enter to classroom
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default TeacherClassCard;
