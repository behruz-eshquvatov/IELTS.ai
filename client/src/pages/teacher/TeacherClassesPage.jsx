import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid, List, Plus, Search, X } from "lucide-react";
import TeacherClassCard from "../../components/teacher/TeacherClassCard";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import {
  buildNewTeacherClass,
  getAllTeacherClasses,
  readCustomTeacherStudents,
  readCustomTeacherClasses,
  readTeacherStudentMemberships,
  resolveTeacherStudentsWithClassIds,
  writeCustomTeacherStudents,
  writeCustomTeacherClasses,
  writeTeacherStudentMemberships,
} from "../../lib/teacherClassStore";

const MotionSpan = motion.span;
const CLASS_OVERRIDES_STORAGE_KEY = "teacher:class-overrides";

function readClassOverrides() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const savedValue = window.localStorage.getItem(CLASS_OVERRIDES_STORAGE_KEY);
    return savedValue ? JSON.parse(savedValue) : {};
  } catch {
    return {};
  }
}

function buildInferredEmail(student) {
  if (student.email) {
    return student.email;
  }

  return `${student.name.toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")}@ieltsai.app`;
}

function StudentDirectoryModal({
  classroom,
  form,
  inviteSearch,
  onClose,
  onFormChange,
  onInviteSearchChange,
  onRegisteredStudentPick,
  onSubmit,
  registeredStudents,
}) {
  const normalizedQuery = inviteSearch.trim().toLowerCase();
  const matchedRegisteredStudents = normalizedQuery
    ? registeredStudents.filter((student) => student.email.toLowerCase().includes(normalizedQuery))
    : [];
  const isSubmitDisabled =
    !form.name.trim() ||
    !form.surname.trim() ||
    !form.email.trim();

  if (!classroom) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-5xl overflow-hidden bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
          <div className="-mx-px flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                New student
              </p>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center bg-slate-950 text-white transition-colors duration-200 hover:bg-white hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 p-6">
            <div className="space-y-3 border-b border-slate-200/70 pb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Search registered students
                </p>
              </div>

              <div className="relative">
                <label className="flex items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                  <Search className="h-4 w-4" />
                  <input
                    className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
                    onChange={(event) => onInviteSearchChange(event.target.value)}
                    placeholder="Search by registered email"
                    type="text"
                    value={inviteSearch}
                  />
                </label>

                {normalizedQuery ? (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-[200px] overflow-y-auto border border-slate-200/80 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.26)]">
                    {matchedRegisteredStudents.length ? (
                      <div className="divide-y divide-slate-200/70">
                        {matchedRegisteredStudents.map((student) => (
                          <button
                            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-slate-700 transition-colors duration-200 hover:bg-emerald-100/70 hover:text-emerald-900"
                            key={`${student.id}-class-list-invite-search`}
                            onClick={() => onRegisteredStudentPick(student)}
                            type="button"
                          >
                            <p className="text-sm font-medium">{student.email}</p>
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-current">
                              Use
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-4 text-sm text-slate-500">
                        No registered student matches this email.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Name</span>
                <input
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="name"
                  onChange={onFormChange}
                  placeholder="Enter name"
                  type="text"
                  value={form.name}
                />
                <span className="block whitespace-nowrap text-sm text-slate-500">
                  The student will be added to the bottom of the list.
                </span>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Surname</span>
                <input
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="surname"
                  onChange={onFormChange}
                  placeholder="Enter surname"
                  type="text"
                  value={form.surname}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Email</span>
                <input
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="email"
                  onChange={onFormChange}
                  placeholder="student@email.com"
                  type="email"
                  value={form.email}
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex items-center gap-2 border border-slate-950 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="emerald-gradient-fill inline-flex items-center gap-2 border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isSubmitDisabled}
                onClick={onSubmit}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add to class
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CreateClassModal({ form, isOpen, onChange, onClose, onSubmit }) {
  if (!isOpen) {
    return null;
  }

  const isSubmitDisabled = !form.name.trim() || !form.startTime.trim();

  return createPortal(
    <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <form
          className="w-full max-w-xl overflow-hidden bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]"
          onSubmit={onSubmit}
        >
          <div className="flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                New classroom
              </p>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center bg-slate-950 text-white transition-colors duration-200 hover:bg-white hover:text-slate-950"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Class name</span>
                <input
                  autoFocus
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="name"
                  onChange={onChange}
                  placeholder="Niners"
                  type="text"
                  value={form.name}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Class time</span>
                <input
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="startTime"
                  onChange={onChange}
                  type="time"
                  value={form.startTime}
                />
              </label>
            </div>

            <p className="text-sm text-slate-500">
              The class will be created with 0 students at the bottom of the list.
            </p>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="emerald-gradient-fill inline-flex items-center gap-2 border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={isSubmitDisabled}
                type="submit"
              >
                Create class
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function TeacherClassesPage() {
  const {
    isAddClassModalOpen = false,
    onCloseAddClassModal = () => {},
  } = useOutletContext() ?? {};
  const [viewMode, setViewMode] = useLocalStorageState("teacher:classes:view-mode", "list");
  const [classOverrides, setClassOverrides] = useState(() => readClassOverrides());
  const [classesState, setClassesState] = useState(() => getAllTeacherClasses().map((item) => ({ ...item })));
  const [studentsState, setStudentsState] = useState(() => resolveTeacherStudentsWithClassIds());
  const [editingField, setEditingField] = useState(null);
  const [draftValue, setDraftValue] = useState("");
  const [activeClassId, setActiveClassId] = useState(null);
  const [studentInviteSearch, setStudentInviteSearch] = useState("");
  const [studentInviteForm, setStudentInviteForm] = useState({
    name: "",
    surname: "",
    email: "",
  });
  const [createClassForm, setCreateClassForm] = useState({ name: "", startTime: "" });
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

  useEffect(() => {
    try {
      window.localStorage.setItem(CLASS_OVERRIDES_STORAGE_KEY, JSON.stringify(classOverrides));
    } catch {
      // Ignore storage write failures.
    }
  }, [classOverrides]);

  useEffect(() => {
    if (!activeClassId && !isAddClassModalOpen) {
      document.body.style.overflow = "";
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeClassId, isAddClassModalOpen]);

  const studentCountsByClassId = studentsState.reduce((counts, student) => {
    if (student.classId) {
      counts[student.classId] = (counts[student.classId] ?? 0) + 1;
    }

    return counts;
  }, {});

  const classesForDisplay = classesState.map((classroom) => ({
    ...classroom,
    ...(classOverrides[classroom.id] ?? {}),
    students: studentCountsByClassId[classroom.id] ?? 0,
  }));

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
      setClassOverrides((current) => ({
        ...current,
        [editingField.classId]: {
          ...(current[editingField.classId] ?? {}),
          [editingField.field]: nextValue,
        },
      }));
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
    setStudentInviteSearch("");
  };

  const handleCloseStudents = () => {
    setActiveClassId(null);
    resetStudentInviteForm();
  };

  const resetStudentInviteForm = () => {
    setStudentInviteForm({
      name: "",
      surname: "",
      email: "",
    });
    setStudentInviteSearch("");
  };

  const resetCreateClassForm = () => {
    setCreateClassForm({ name: "", startTime: "" });
  };

  const handleCloseCreateClassModal = () => {
    resetCreateClassForm();
    onCloseAddClassModal();
  };

  const handleCreateClassFormChange = (event) => {
    const { name, value } = event.target;

    setCreateClassForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateClass = (event) => {
    event.preventDefault();

    const trimmedName = createClassForm.name.trim();
    const trimmedStartTime = createClassForm.startTime.trim();

    if (!trimmedName || !trimmedStartTime) {
      return;
    }

    const newClassroom = buildNewTeacherClass(
      { name: trimmedName, startTime: trimmedStartTime },
      classesState,
    );
    const nextCustomClasses = [...readCustomTeacherClasses(), newClassroom];

    writeCustomTeacherClasses(nextCustomClasses);
    setClassesState((current) => [...current, newClassroom]);
    handleCloseCreateClassModal();
    showNotice("Class created");
  };

  const handleStudentInviteFormChange = (event) => {
    const { name, value } = event.target;

    setStudentInviteForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleRegisteredStudentPick = (student) => {
    const [name = "", ...surnameParts] = student.name.split(" ");

    setStudentInviteForm({
      name,
      surname: surnameParts.join(" "),
      email: student.email,
    });
    setStudentInviteSearch("");
  };

  const handleInviteStudentToActiveClass = () => {
    const trimmedName = studentInviteForm.name.trim();
    const trimmedSurname = studentInviteForm.surname.trim();
    const trimmedEmail = studentInviteForm.email.trim();
    const targetClass = classesForDisplay.find((classroom) => classroom.id === activeClassId);

    if (!trimmedName || !trimmedSurname || !trimmedEmail || !targetClass) {
      return;
    }

    const baseId = `${trimmedName.toLowerCase()}-${trimmedSurname.toLowerCase()}`
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const existingStudentIds = new Set(studentsState.map((student) => student.id));
    let generatedId = baseId || "student";
    let suffix = 2;

    while (existingStudentIds.has(generatedId)) {
      generatedId = `${baseId || "student"}-${suffix}`;
      suffix += 1;
    }

    const invitedStudent = {
      id: generatedId,
      name: `${trimmedName} ${trimmedSurname}`,
      classId: targetClass.id,
      className: targetClass.name,
      targetBand: "TBD",
      currentBand: "TBD",
      status: "Invited",
      weakArea: "Placement pending",
      completionRate: "--",
      lastSubmission: "No submissions yet",
      notes: `Invitation prepared for ${trimmedEmail}. Awaiting student confirmation.`,
      email: trimmedEmail,
    };

    setStudentsState((current) => [...current, invitedStudent]);
    writeCustomTeacherStudents([...readCustomTeacherStudents(), invitedStudent]);
    writeTeacherStudentMemberships({
      ...readTeacherStudentMemberships(),
      [generatedId]: targetClass.id,
    });
    handleCloseStudents();
    showNotice("Student added to class");
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

  const registeredStudents = studentsState
    .filter((student) => student.classId !== activeClassId)
    .map((student) => ({
      ...student,
      email: buildInferredEmail(student),
    }));

  return (
    <section className="space-y-4">
      <CreateClassModal
        form={createClassForm}
        isOpen={isAddClassModalOpen}
        onChange={handleCreateClassFormChange}
        onClose={handleCloseCreateClassModal}
        onSubmit={handleCreateClass}
      />
      <StudentDirectoryModal
        classroom={classesForDisplay.find((item) => item.id === activeClassId) ?? null}
        form={studentInviteForm}
        inviteSearch={studentInviteSearch}
        onClose={handleCloseStudents}
        onFormChange={handleStudentInviteFormChange}
        onInviteSearchChange={setStudentInviteSearch}
        onRegisteredStudentPick={handleRegisteredStudentPick}
        onSubmit={handleInviteStudentToActiveClass}
        registeredStudents={registeredStudents}
      />
      {notice ? (
        <div className="fixed right-6 top-24 z-[60] rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.35)]">
          {notice}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
          Classroom Library
        </p>
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
        {classesForDisplay.map((classroom) => (
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
