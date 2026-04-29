import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutGrid, List, Plus, Search, X } from "lucide-react";
import TeacherClassCard from "../../components/teacher/TeacherClassCard";
import { TimePickerField } from "../../components/ui/StyledFormControls";
import MagneticButton from "../../components/ui/MagneticButton";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import {
  createTeacherClass,
  inviteStudentToTeacherClass,
  listTeacherClasses,
  listTeacherClassStudents,
  searchTeacherClassStudents,
  updateTeacherClass,
} from "../../services/teacherService";

const MotionSpan = motion.span;

function StudentDirectoryModal({
  classroom,
  onClose,
  onSearchChange,
  onInvite,
  rows,
  query,
  loading,
  invitingStudentId,
}) {
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
        <div className="flex h-[55vh] w-full max-w-5xl flex-col overflow-hidden bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]" onClick={(event) => event.stopPropagation()}>
          <div className="-mx-px flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                Class students
              </p>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center bg-slate-950 text-white"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-6">
            <div className="space-y-3 shrink-0">
              <label className="flex items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                <input
                  className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search by name or email"
                  type="text"
                  value={query}
                />
              </label>
            </div>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
              <div className="py-1">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Current class students</p>
                <div className={`mt-3 space-y-2 ${rows.inClass.length === 0 ? (query.trim() ? "min-h-28" : "min-h-64") : ""}`}>
                  {rows.inClass.length === 0 ? (
                    <div className={`flex items-center justify-center ${query.trim() ? "min-h-28" : "min-h-64"}`}>
                      <p className="text-center text-sm text-slate-500">No students yet.</p>
                    </div>
                  ) : rows.inClass.map((student) => (
                    <div className="flex items-center justify-between px-0 py-2 text-sm" key={`in-${student.studentId}`}>
                      <span className="font-medium text-slate-800">{student.fullName}</span>
                      <span className="text-slate-500">{student.email}</span>
                    </div>
                  ))}
                </div>
              </div>

              {query.trim() ? (
                <div className="py-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Matching students</p>
                  <div className="mt-3 space-y-2">
                    {loading ? (
                      <p className="text-sm text-slate-500">Searching...</p>
                    ) : rows.others.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-500">No students found.</p>
                    ) : rows.others.map((student) => (
                      <div className="flex items-center justify-between gap-3 px-0 py-2 text-sm" key={`other-${student.studentId}`}>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-800">{student.fullName}</p>
                          <p className="truncate text-slate-500">{student.email}</p>
                        </div>
                        {student.inClass ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">In class</span>
                        ) : student.pendingRequestStatus === "pending" ? (
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-600">Pending</span>
                        ) : (
                          <button
                            className="emerald-gradient-fill inline-flex items-center gap-2 border border-emerald-300/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-opacity duration-200 disabled:opacity-50"
                            disabled={invitingStudentId === student.studentId}
                            onClick={() => onInvite(student)}
                            type="button"
                          >
                            {invitingStudentId === student.studentId ? "Sending..." : "Add"}
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CreateClassModal({ form, isOpen, onChange, onClose, onSubmit, isSaving }) {
  if (!isOpen) {
    return null;
  }

  const isSubmitDisabled = !form.name.trim() || !form.startTime.trim() || isSaving;

  return createPortal(
    <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <form
          className="w-full max-w-xl overflow-visible bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]"
          onSubmit={onSubmit}
        >
          <div className="flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                New classroom
              </p>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center bg-slate-950 text-white transition-colors duration-200"
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
                <TimePickerField
                  name="startTime"
                  onChange={onChange}
                  value={form.startTime}
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
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
                {isSaving ? "Creating..." : "Create class"}
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
    onOpenAddClassModal = () => { },
    onCloseAddClassModal = () => { },
  } = useOutletContext() ?? {};
  const [viewMode, setViewMode] = useLocalStorageState("teacher:classes:view-mode", "list");
  const [classesState, setClassesState] = useState([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [editingField, setEditingField] = useState(null);
  const [draftValue, setDraftValue] = useState("");
  const [activeClassId, setActiveClassId] = useState(null);
  const [studentInviteSearch, setStudentInviteSearch] = useState("");
  const [modalRows, setModalRows] = useState({ inClass: [], others: [] });
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [invitingStudentId, setInvitingStudentId] = useState("");
  const [createClassForm, setCreateClassForm] = useState({ name: "", startTime: "" });
  const [notice, setNotice] = useState("");
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const noticeTimerRef = useRef(null);
  const searchTimerRef = useRef(null);
  const viewButtons = [
    { key: "list", icon: List },
    { key: "grid", icon: LayoutGrid },
  ];

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
      if (searchTimerRef.current) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      setIsLoadingClasses(true);
      try {
        const response = await listTeacherClasses();
        const rows = Array.isArray(response?.classes) ? response.classes : [];
        setClassesState(rows.map((item) => ({
          ...item,
          id: String(item?._id || ""),
          students: Number(item?.activeStudentsCount || 0),
        })));
      } catch (error) {
        showNotice(error?.message || "Failed to load classes.");
      } finally {
        setIsLoadingClasses(false);
      }
    };
    void run();
  }, []);

  const activeClassroom = classesState.find((classroom) => classroom.id === activeClassId) || null;

  const handleStartEditing = (classId, field, value) => {
    setEditingField({ classId, field });
    setDraftValue(value);
  };

  const handleCommit = async () => {
    if (!editingField) {
      return;
    }

    const nextValue = draftValue.trim();
    const currentClassId = editingField.classId;
    const currentField = editingField.field;
    const previousClass = classesState.find((item) => item.id === currentClassId);
    if (!previousClass) {
      setEditingField(null);
      setDraftValue("");
      return;
    }

    if (!nextValue) {
      setEditingField(null);
      setDraftValue("");
      return;
    }

    setClassesState((current) => current.map((item) => (item.id === currentClassId ? { ...item, [currentField]: nextValue } : item)));
    setEditingField(null);
    setDraftValue("");

    try {
      await updateTeacherClass(currentClassId, { [currentField]: nextValue });
    } catch (error) {
      setClassesState((current) =>
        current.map((item) =>
          item.id === currentClassId ? { ...item, [currentField]: previousClass[currentField] } : item,
        ));
      showNotice(error?.message || "Failed to save class.");
    }
  };

  const handleCancel = () => {
    setEditingField(null);
    setDraftValue("");
  };

  const loadClassStudentsSearch = async (classId, query = "") => {
    setIsLoadingSearch(true);
    try {
      const response = await searchTeacherClassStudents(classId, query);
      setModalRows({
        inClass: Array.isArray(response?.inClass) ? response.inClass : [],
        others: Array.isArray(response?.others) ? response.others : [],
      });
    } catch (error) {
      showNotice(error?.message || "Failed to search students.");
      setModalRows({ inClass: [], others: [] });
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleOpenStudents = async (classId) => {
    setActiveClassId(classId);
    setStudentInviteSearch("");
    setModalRows({ inClass: [], others: [] });
    setIsLoadingSearch(true);
    try {
      const [membersResponse, searchResponse] = await Promise.all([
        listTeacherClassStudents(classId),
        searchTeacherClassStudents(classId, ""),
      ]);
      setModalRows({
        inClass: Array.isArray(membersResponse?.students)
          ? membersResponse.students.map((item) => ({ ...item, inClass: true }))
          : Array.isArray(searchResponse?.inClass)
            ? searchResponse.inClass
            : [],
        others: Array.isArray(searchResponse?.others) ? searchResponse.others : [],
      });
    } catch (error) {
      showNotice(error?.message || "Failed to load class students.");
      setModalRows({ inClass: [], others: [] });
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleCloseStudents = () => {
    setActiveClassId(null);
    setStudentInviteSearch("");
    setModalRows({ inClass: [], others: [] });
    setInvitingStudentId("");
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

  const handleCreateClass = async (event) => {
    event.preventDefault();
    const trimmedName = createClassForm.name.trim();
    const trimmedStartTime = createClassForm.startTime.trim();
    if (!trimmedName || !trimmedStartTime || isCreatingClass) {
      return;
    }
    setIsCreatingClass(true);
    try {
      const response = await createTeacherClass({
        name: trimmedName,
        startTime: trimmedStartTime,
        status: "active",
      });
      const created = response?.class;
      if (created?._id) {
        setClassesState((current) => [
          {
            ...created,
            id: String(created._id),
            students: Number(created?.activeStudentsCount || 0),
          },
          ...current,
        ]);
      }
      handleCloseCreateClassModal();
      showNotice("Class created");
    } catch (error) {
      showNotice(error?.message || "Failed to create class.");
    } finally {
      setIsCreatingClass(false);
    }
  };

  const handleInviteStudent = async (student) => {
    if (!activeClassId || !student?.studentId || invitingStudentId) {
      return;
    }
    setInvitingStudentId(student.studentId);
    try {
      await inviteStudentToTeacherClass(activeClassId, student.studentId);
      setModalRows((current) => ({
        ...current,
        others: current.others.map((item) =>
          item.studentId === student.studentId
            ? { ...item, pendingRequestStatus: "pending", canInvite: false }
            : item),
      }));
      showNotice("Join request sent");
    } catch (error) {
      showNotice(error?.message || "Failed to send request.");
    } finally {
      setInvitingStudentId("");
    }
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

  useEffect(() => {
    if (!activeClassId) {
      return;
    }
    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = window.setTimeout(() => {
      void loadClassStudentsSearch(activeClassId, studentInviteSearch);
    }, 280);
  }, [activeClassId, studentInviteSearch]);

  return (
    <section className="space-y-4">
      <CreateClassModal
        form={createClassForm}
        isOpen={isAddClassModalOpen}
        isSaving={isCreatingClass}
        onChange={handleCreateClassFormChange}
        onClose={handleCloseCreateClassModal}
        onSubmit={handleCreateClass}
      />
      <StudentDirectoryModal
        classroom={activeClassroom}
        invitingStudentId={invitingStudentId}
        loading={isLoadingSearch}
        onClose={handleCloseStudents}
        onInvite={handleInviteStudent}
        onSearchChange={setStudentInviteSearch}
        query={studentInviteSearch}
        rows={modalRows}
      />
      {notice ? (
        <div className="fixed right-6 top-24 z-[60] rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.35)]">
          {notice}
        </div>
      ) : null}

      {classesState.length > 0 ? (
        <div className="flex items-center justify-end gap-3">
          <MagneticButton
            className="rounded-full"
            disableGlow
            innerClassName="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)]"
            onClick={onOpenAddClassModal}
            type="button"
          >
            Add class
            <Plus className="h-4 w-4" />
          </MagneticButton>
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
                  className={`relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 ${isActive ? "text-white" : "text-slate-500 hover:text-slate-900"
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
      ) : null}

      {isLoadingClasses ? (
        <div className="text-sm text-slate-500">Loading classes...</div>
      ) : classesState.length === 0 ? (
        <article className="min-h-[calc(100vh-15rem)] bg-transparent flex items-center justify-center">
          <div className="flex max-w-lg flex-col items-center gap-5 text-center">
            <h2 className="text-4xl font-semibold tracking-[-0.04em] text-slate-950">
              No classes yet
            </h2>
            <p className="text-base leading-8 text-slate-600">
              Start by creating your first class, then invite students and manage their progress from one place.
            </p>
            <MagneticButton
              className="rounded-full"
              disableGlow
              innerClassName="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)]"
              onClick={onOpenAddClassModal}
              type="button"
            >
              Create class
              <Plus className="h-4 w-4" />
            </MagneticButton>
          </div>
        </article>
      ) : (
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
      )}
    </section>
  );
}

export default TeacherClassesPage;

