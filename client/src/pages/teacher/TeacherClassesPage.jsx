import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { LayoutGrid, List, Plus, Search, Trash2 } from "lucide-react";
import { teacherClasses, teacherStudents } from "../../data/teacherPanel";
import TeacherClassCard from "../../components/teacher/TeacherClassCard";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import useBodyScrollLock from "../../hooks/useBodyScrollLock";

const MotionSpan = motion.span;

function StudentDirectoryPanel({
  classroom,
  classStudents,
  globalStudents,
  searchValue,
  onSearchChange,
  onRemoveStudent,
  onAddStudent,
}) {
  const query = searchValue.trim().toLowerCase();
  const filteredGlobalStudents = globalStudents.filter((student) => {
    if (!query) {
      return false;
    }

    return (
      student.name.toLowerCase().includes(query) ||
      student.id.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Add students
        </p>
        <label className="flex items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <input
            className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by student name or id"
            type="text"
            value={searchValue}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Students in class
          </p>
          <span className="text-xs text-slate-400">{classStudents.length} active</span>
        </div>
        <div className="divide-y divide-slate-200/70 border border-slate-200/80 bg-white">
          {classStudents.length ? (
            classStudents.map((student) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3" key={student.id}>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{student.id}</p>
                </div>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                  onClick={() => onRemoveStudent(student.id, classroom.id)}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="px-4 py-4 text-sm text-slate-500">No students in this class yet.</div>
          )}
        </div>
      </div>

      {query ? (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Search results
          </p>
          <div className="divide-y divide-slate-200/70 border border-slate-200/80 bg-white">
            {filteredGlobalStudents.length ? (
              filteredGlobalStudents.map((student) => (
                <div className="group flex items-center justify-between gap-3 px-4 py-3" key={student.id}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{student.id}</p>
                  </div>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-emerald-500 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-emerald-50"
                    onClick={() => onAddStudent(student.id, classroom.id)}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-slate-500">No matching students found.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StudentDirectoryModal(props) {
  const { classroom, onClose } = props;
  useBodyScrollLock(Boolean(classroom));

  if (!classroom) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]"
      onClick={onClose}
      role="presentation"
    >
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div
          className="max-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden border border-slate-200 bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)] sm:max-h-[calc(100vh-3rem)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Students in class
            </p>
            <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
              {classroom.name}
            </h3>
          </div>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
            onClick={onClose}
            type="button"
          >
            x
          </button>
        </div>
          <div
            className="hide-scrollbar max-h-[calc(100vh-9rem)] overflow-y-auto p-6 sm:max-h-[calc(100vh-10rem)]"
            style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          >
            <StudentDirectoryPanel {...props} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TeacherClassesPage() {
  const [viewMode, setViewMode] = useLocalStorageState("teacher:classes:view-mode", "list");
  const [classesState, setClassesState] = useState(() => teacherClasses.map((item) => ({ ...item })));
  const [studentsState, setStudentsState] = useState(() => {
    const seededStudents = [
      ...teacherStudents,
      { id: "kamola-y", name: "Kamola Yuldasheva", className: "Blue Cohort" },
      { id: "behruz-t", name: "Behruz Tursunov", className: "Blue Cohort" },
      { id: "nilufar-m", name: "Nilufar Mamatova", className: "Blue Cohort" },
      { id: "shahzod-u", name: "Shahzod Usmonov", className: "Blue Cohort" },
      { id: "madina-p", name: "Madina Pulatova", className: "Intensive Morning" },
      { id: "aziz-k", name: "Aziz Kamilov", className: "Weekend Accelerator" },
      { id: "farzona-r", name: "Farzona Rasulova", className: null },
      { id: "javohir-s", name: "Javohir Saidov", className: null },
      { id: "mohira-a", name: "Mohira Alimuhamedova", className: null },
      { id: "samandar-n", name: "Samandar Nuriddinov", className: null },
    ];

    return seededStudents.map((student) => {
      const matchedClass = teacherClasses.find((item) => item.name === student.className);

      return {
        id: student.id,
        name: student.name,
        classId: matchedClass?.id ?? null,
      };
    });
  });
  const [editingField, setEditingField] = useState(null);
  const [draftValue, setDraftValue] = useState("");
  const [activeClassId, setActiveClassId] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef(null);
  const viewButtons = [
    { key: "list", icon: List },
    { key: "grid", icon: LayoutGrid },
  ];

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const handleStartEditing = (classId, field, value) => {
    setEditingField({ classId, field });
    setDraftValue(value);
  };

  const handleCommit = () => {
    if (!editingField) {
      return;
    }

    const nextValue = draftValue.trim();

    if (nextValue) {
      setClassesState((current) =>
        current.map((item) =>
          item.id === editingField.classId ? { ...item, [editingField.field]: nextValue } : item,
        ),
      );
    }

    setEditingField(null);
    setDraftValue("");
  };

  const handleCancel = () => {
    setEditingField(null);
    setDraftValue("");
  };

  const handleOpenStudents = (classId) => {
    setActiveClassId(classId);
    setStudentSearch("");
  };

  const handleCloseStudents = () => {
    setActiveClassId(null);
    setStudentSearch("");
  };

  const showNotice = (message) => {
    setNotice(message);

    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
    }, 2200);
  };

  const handleRemoveStudent = (studentId, classId) => {
    setStudentsState((current) =>
      current.map((student) =>
        student.id === studentId && student.classId === classId
          ? { ...student, classId: null }
          : student,
      ),
    );

    setClassesState((current) =>
      current.map((item) =>
        item.id === classId ? { ...item, students: Math.max(item.students - 1, 0) } : item,
      ),
    );
  };

  const handleAddStudent = (studentId, classId) => {
    let didAssign = false;

    setStudentsState((current) =>
      current.map((student) => {
        if (student.id !== studentId || student.classId === classId) {
          return student;
        }

        didAssign = true;
        return { ...student, classId };
      }),
    );

    if (didAssign) {
      setClassesState((current) =>
        current.map((item) => (item.id === classId ? { ...item, students: item.students + 1 } : item)),
      );
      showNotice("Request send to student");
    }
  };

  return (
    <section className="space-y-4">
      <StudentDirectoryModal
        classStudents={studentsState.filter((student) => student.classId === activeClassId)}
        classroom={classesState.find((item) => item.id === activeClassId) ?? null}
        globalStudents={studentsState.filter((student) => student.classId !== activeClassId)}
        onAddStudent={handleAddStudent}
        onClose={handleCloseStudents}
        onRemoveStudent={handleRemoveStudent}
        onSearchChange={setStudentSearch}
        searchValue={studentSearch}
      />
      {notice ? (
        <div className="fixed right-6 top-24 z-[60] rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.35)]">
          {notice}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <motion.div
          layout
          className="relative flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.25)]"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          {viewButtons.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.key;

            return (
              <motion.button
                layout
                className={`relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 ${
                  isActive ? "text-white" : "text-slate-500 hover:text-slate-900"
                }`}
                key={item.key}
                onClick={() => setViewMode(item.key)}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                type="button"
              >
                {isActive ? (
                  <MotionSpan
                    className="absolute inset-0 rounded-full bg-slate-900"
                    layoutId="teacher-view-switch"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <Icon className="relative z-10 h-4 w-4" />
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      <div className={viewMode === "grid" ? "grid gap-4 lg:grid-cols-2 2xl:grid-cols-3" : "grid gap-2"}>
        {classesState.map((classroom) => (
          <TeacherClassCard
            classroom={classroom}
            draftValue={draftValue}
            editingField={editingField}
            key={classroom.id}
            onCancel={handleCancel}
            onCommit={handleCommit}
            onDraftChange={setDraftValue}
            onOpenStudents={handleOpenStudents}
            onStartEditing={handleStartEditing}
            viewMode={viewMode}
          />
        ))}
      </div>
    </section>
  );
}

export default TeacherClassesPage;
