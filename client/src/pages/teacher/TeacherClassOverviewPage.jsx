import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BellRing,
  ChevronRight,
  Clock3,
  LockKeyhole,
  PauseCircle,
  PenSquare,
  PlayCircle,
  Plus,
  Radio,
  Search,
  Send,
  ShieldAlert,
  TimerReset,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users2,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import {
  ConfirmStudentRemovalModal,
  PanelShell,
  StatusBadge,
} from "../../components/teacher/TeacherPanelPrimitives";
import { teacherStudents } from "../../data/teacherPanel";
import {
  getAllTeacherClasses,
  readCustomTeacherStudents,
  readTeacherStudentMemberships,
  resolveTeacherStudentsWithClassIds,
  writeCustomTeacherStudents,
  writeTeacherStudentMemberships,
} from "../../lib/teacherClassStore";

const CLASS_OVERRIDES_STORAGE_KEY = "teacher:class-overrides";
const TIMER_PRESETS = [
  { label: "20 min", minutes: 20 },
  { label: "40 min", minutes: 40 },
  { label: "60 min", minutes: 60 },
  { label: "90 min", minutes: 90 },
];

const DEFAULT_REMINDERS = [
  { id: "payment-reminder", label: "Pay payment" },
];

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

function formatAccuracy(correctAnswers, answeredQuestions) {
  if (!answeredQuestions) {
    return "0%";
  }

  return `${Math.round((correctAnswers / answeredQuestions) * 100)}%`;
}

function getStudentStatusTone(status) {
  if (status === "Suspicious") {
    return "rose";
  }
  if (status === "Inactive") {
    return "amber";
  }
  if (status === "Submitted") {
    return "blue";
  }
  return "emerald";
}

function getIdleTone(idleSeconds) {
  if (idleSeconds >= 180) {
    return "rose";
  }
  if (idleSeconds >= 90) {
    return "amber";
  }
  return "emerald";
}

function getRiskTone(riskLevel) {
  if (riskLevel === "High") {
    return "rose";
  }
  if (riskLevel === "Watch") {
    return "amber";
  }
  return "emerald";
}

function getResultBarColor(student) {
  if (student.status === "Suspicious") {
    return "#f43f5e";
  }
  if (student.status === "Inactive") {
    return "#f59e0b";
  }
  return "#10b981";
}

function buildInferredEmail(student) {
  if (student.email) {
    return student.email;
  }

  return `${student.name.toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")}@ieltsai.app`;
}

function getPaymentStatus(student) {
  return student.paymentStatus ?? (student.id.length % 4 === 0 ? "Unpaid" : "Paid");
}

function buildLastWeekHours(student, index) {
  if (typeof student.lastWeekHours === "number") {
    return student.lastWeekHours;
  }

  if (student.status === "Invited") {
    return 0;
  }

  return [5.5, 7.0, 4.5, 8.0, 6.0][index % 5];
}

function formatLastWeekTime(hoursValue) {
  const totalMinutes = Math.round(hoursValue * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours} hour ${minutes} mins`;
}

function snapBandScore(value) {
  return Math.round(value * 2) / 2;
}

function getClassStudentIndex(student) {
  return teacherStudents
    .filter((item) => item.className === student.className)
    .findIndex((item) => item.id === student.id);
}

const blueCohortMap = {
  "amina-n": {
    currentTask: "Reading Part 3 - Inference",
    progress: 82,
    score: 7.0,
    previousWeekScore: 6.5,
    answeredQuestions: 31,
    correctAnswers: 24,
    tabSwitches: 0,
    idleSeconds: 18,
    idleLabel: "Active now",
    riskLevel: "Clear",
    note: "Steady pacing with no interruptions.",
    focusSignal: "Stable pace",
  },
  "diyor-r": {
    currentTask: "Listening Map Labeling",
    progress: 34,
    score: 5.5,
    previousWeekScore: 6.0,
    answeredQuestions: 14,
    correctAnswers: 8,
    tabSwitches: 1,
    idleSeconds: 192,
    idleLabel: "Idle 3m 12s",
    riskLevel: "Watch",
    note: "No answer movement for several minutes.",
    focusSignal: "Needs prompt",
  },
  "kamola-y": {
    currentTask: "Writing Task 2 Planning",
    progress: 68,
    score: 6.5,
    previousWeekScore: 6.0,
    answeredQuestions: 22,
    correctAnswers: 16,
    tabSwitches: 0,
    idleSeconds: 41,
    idleLabel: "Reviewing outline",
    riskLevel: "Clear",
    note: "Working at a normal decision speed.",
    focusSignal: "Good rhythm",
  },
  "behruz-t": {
    currentTask: "Reading Matching Headings",
    progress: 91,
    score: 7.5,
    previousWeekScore: 8.0,
    answeredQuestions: 35,
    correctAnswers: 27,
    tabSwitches: 7,
    idleSeconds: 9,
    idleLabel: "Active now",
    riskLevel: "High",
    note: "Rapid answer switching needs review.",
    focusSignal: "Suspicious changes",
  },
  "nilufar-m": {
    currentTask: "Submitted final answers",
    progress: 100,
    score: 7.0,
    previousWeekScore: 7.0,
    answeredQuestions: 40,
    correctAnswers: 31,
    tabSwitches: 0,
    idleSeconds: 26,
    idleLabel: "Awaiting review",
    riskLevel: "Clear",
    note: "Submitted early with time remaining.",
    focusSignal: "Completed",
  },
  "shahzod-u": {
    currentTask: "Listening Part 4 Notes",
    progress: 57,
    score: 6.0,
    previousWeekScore: 6.0,
    answeredQuestions: 21,
    correctAnswers: 13,
    tabSwitches: 2,
    idleSeconds: 72,
    idleLabel: "Brief pause",
    riskLevel: "Watch",
    note: "Recovered after a slower start.",
    focusSignal: "Pace improving",
  },
};

function buildGenericSessionStudent(student, index) {
  const status = index % 5 === 0 ? "Inactive" : index % 4 === 0 ? "Submitted" : "Active";
  const parsedScore = Number.parseFloat(student.currentBand);
  const score = Number.isFinite(parsedScore) ? snapBandScore(parsedScore) : 6.0;
  const classStudentIndex = Math.max(0, getClassStudentIndex(student));
  const seededPreviousWeekDelta = [0.5, -0.5, 0.5, -0.5, 0.0][classStudentIndex % 5];
  const previousWeekScore = snapBandScore(score - seededPreviousWeekDelta);

  return {
    id: student.id,
    name: student.name,
    email: buildInferredEmail(student),
    lastWeekHours: buildLastWeekHours(student, index),
    status,
    progress: [28, 44, 61, 75, 94][index % 5],
    currentTask: ["Reading Review", "Listening Drill", "Writing Task 1", "Writing Task 2"][index % 4],
    score,
    previousWeekScore,
    scoreTrendDelta: snapBandScore(score - previousWeekScore),
    answeredQuestions: [10, 16, 20, 28, 36][index % 5],
    correctAnswers: [6, 10, 14, 20, 29][index % 5],
    tabSwitches: [0, 1, 0, 2, 1][index % 5],
    idleSeconds: [24, 66, 130, 18, 40][index % 5],
    idleLabel: ["Active now", "Checking notes", "Idle 2m 10s", "Active now", "Working"][index % 5],
    riskLevel: index % 5 === 2 ? "Watch" : "Clear",
    note: student.notes,
    focusSignal: ["Stable pace", "Warm-up lag", "Needs teacher ping", "Good rhythm", "Finishing strong"][index % 5],
    band: student.currentBand,
    targetBand: student.targetBand,
  };
}

function buildBlueCohortSessionStudent(student, index) {
  const session = blueCohortMap[student.id];

  if (!session) {
    return buildGenericSessionStudent(student, index);
  }

  const score = snapBandScore(session.score);
  const previousWeekScore = snapBandScore(session.previousWeekScore ?? score);

  return {
    id: student.id,
    name: student.name,
    email: buildInferredEmail(student),
    lastWeekHours: buildLastWeekHours(student, index),
    status: session.riskLevel === "High"
      ? "Suspicious"
      : session.progress === 100
        ? "Submitted"
        : session.idleSeconds >= 180
          ? "Inactive"
          : "Active",
    currentTask: session.currentTask,
    progress: session.progress,
    score,
    previousWeekScore,
    scoreTrendDelta: snapBandScore(score - previousWeekScore),
    answeredQuestions: session.answeredQuestions,
    correctAnswers: session.correctAnswers,
    tabSwitches: session.tabSwitches,
    idleSeconds: session.idleSeconds,
    idleLabel: session.idleLabel,
    riskLevel: session.riskLevel,
    note: session.note,
    focusSignal: session.focusSignal,
    band: student.currentBand,
    targetBand: student.targetBand,
  };
}

function buildSessionStudents(classroom, matchedStudents) {
  if (classroom.id === "blue-cohort") {
    return matchedStudents.map((student, index) => buildBlueCohortSessionStudent(student, index));
  }

  return matchedStudents.map((student, index) => buildGenericSessionStudent(student, index));
}

function buildActivityFeed(classroom, students) {
  if (classroom.id === "blue-cohort") {
    return [
      {
        id: "feed-1",
        title: "Behruz Tursunov triggered a high-risk flag",
        detail: "7 tab switches and 6 rapid answer edits across Reading Part 3 in under 2 minutes.",
        tone: "rose",
      },
      {
        id: "feed-2",
        title: "Diyor Rakhimov is idle",
        detail: "No input detected for 3m 12s during the listening task. Teacher follow-up may be needed.",
        tone: "amber",
      },
      {
        id: "feed-3",
        title: "Nilufar Mamatova submitted early",
        detail: "All answers are locked in with 8 minutes still on the classroom timer.",
        tone: "blue",
      },
    ];
  }

  return students.slice(0, 3).map((student, index) => ({
    id: `generic-${student.id}`,
    title: `${student.name} activity update`,
    detail: `${student.currentTask}. ${student.note}`,
    tone: index === 1 ? "amber" : "blue",
  }));
}

function ResultsTooltip({ active, label, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="border border-slate-200 bg-white px-3 py-2 text-sm shadow-[0_16px_40px_-28px_rgba(15,23,42,0.3)]">
      <p className="font-semibold text-slate-950">{label}</p>
      <div className="mt-2 space-y-1 text-slate-600">
        {payload.map((item) => (
          <p key={item.dataKey}>
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    </div>
  );
}

function SummaryChip({ icon: Icon, label, value, tone = "slate" }) {
  const toneClasses = {
    slate: "border-slate-200/80 bg-white text-slate-700",
    emerald: "border-emerald-200/80 bg-emerald-50/60 text-emerald-700",
    amber: "border-amber-200/80 bg-amber-50 text-amber-700",
    rose: "border-rose-200/80 bg-rose-50 text-rose-700",
    blue: "border-blue-200/80 bg-blue-50 text-blue-700",
  };

  return (
    <div className={`inline-flex items-center gap-3 border px-4 py-3 ${toneClasses[tone]}`}>
      <span className="flex h-9 w-9 items-center justify-center border border-current/15 bg-white/80">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-current/80">{label}</p>
        <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
      </div>
    </div>
  );
}

function HeaderPanel({
  classroom,
  onOpenEditModal,
  onOpenInviteModal,
  totalStudents,
  students,
}) {
  return (
    <PanelShell className="border-slate-200/80 bg-white">
      <div className="px-5 py-5 lg:px-6 lg:py-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
                Live Classroom
              </p>
              <h2 className="text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {classroom.name}
              </h2>
              <div className="flex flex-wrap gap-3">
                <SummaryChip icon={Clock3} label="Lesson time" value={classroom.startTime} />
                <SummaryChip icon={Users2} label="Total students" value={String(totalStudents)} tone="emerald" />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50"
                onClick={onOpenEditModal}
                type="button"
              >
                <PenSquare className="h-4 w-4" />
                Edit class
              </button>
              <button
                className="emerald-gradient-fill inline-flex items-center gap-2 border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]"
                onClick={onOpenInviteModal}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add student
              </button>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function EditClassModal({ form, isOpen, onChange, onClose, onSubmit }) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl overflow-hidden border border-slate-200 bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
          <div className="flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <div className="flex min-h-11 items-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                Edit class
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
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="name"
                  onChange={onChange}
                  placeholder="Enter class name"
                  type="text"
                  value={form.name}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Lesson time</span>
                <input
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="startTime"
                  onChange={onChange}
                  type="time"
                  value={form.startTime}
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
                className="emerald-gradient-fill inline-flex items-center gap-2 border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white"
                onClick={onSubmit}
                type="button"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function InviteStudentModal({
  classroom,
  inviteForm,
  inviteSearch,
  isOpen,
  onClose,
  onInviteFormChange,
  onInviteSearchChange,
  onRegisteredStudentPick,
  onInviteSubmit,
  registeredStudents,
}) {
  if (!classroom || !isOpen) {
    return null;
  }

  const normalizedQuery = inviteSearch.trim().toLowerCase();
  const matchedRegisteredStudents = normalizedQuery
    ? registeredStudents.filter((student) => student.email.toLowerCase().includes(normalizedQuery))
    : [];
  const isSubmitDisabled =
    !inviteForm.name.trim() ||
    !inviteForm.surname.trim() ||
    !inviteForm.email.trim();

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
                            key={`${student.id}-invite-search`}
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
                  onChange={onInviteFormChange}
                  placeholder="Enter name"
                  type="text"
                  value={inviteForm.name}
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
                  onChange={onInviteFormChange}
                  placeholder="Enter surname"
                  type="text"
                  value={inviteForm.surname}
                />
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Email</span>
                <input
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  name="email"
                  onChange={onInviteFormChange}
                  placeholder="student@email.com"
                  type="email"
                  value={inviteForm.email}
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
                onClick={onInviteSubmit}
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

function AddStudentModal({
  isOpen,
  classroom,
  candidates,
  searchValue,
  onSearchChange,
  onAddStudent,
  onClose,
}) {
  if (!classroom || !isOpen) {
    return null;
  }

  const query = searchValue.trim().toLowerCase();
  const filteredCandidates = candidates.filter((student) => {
    if (!query) {
      return true;
    }

    return (
      student.name.toLowerCase().includes(query) ||
      student.id.toLowerCase().includes(query)
    );
  });

  return createPortal(
    <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-3xl overflow-hidden border border-slate-200 bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Add student
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                {classroom.name}
              </h3>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center border border-slate-200 bg-white text-slate-500 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-5 p-6">
            <label className="flex items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              <input
                className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search unassigned students"
                type="text"
                value={searchValue}
              />
            </label>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Available students
                </p>
                <span className="text-xs text-slate-400">{filteredCandidates.length} visible</span>
              </div>

              <div className="divide-y divide-slate-200/70 border border-slate-200/80 bg-white">
                {filteredCandidates.length ? (
                  filteredCandidates.map((student) => (
                    <div className="flex items-center justify-between gap-3 px-4 py-4" key={student.id}>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{student.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {student.currentBand} current band / {student.targetBand} target
                        </p>
                      </div>
                      <button
                        className="inline-flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-100"
                        onClick={() => onAddStudent(student)}
                        type="button"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-5 text-sm text-slate-500">
                    No available students match this search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StudentsPanel({
  searchValue,
  showTrendColumn = false,
  students,
  onOpenStudent,
  onRemoveStudent,
  onSearchChange,
}) {

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Students Panel
          </p>
        </div>
        <label className="flex min-w-72 items-center gap-3 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <input
            className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search students in this class"
            type="text"
            value={searchValue}
          />
        </label>
      </div>

      <PanelShell>
        <div className="bg-slate-950">
          <table className="w-full table-fixed">
            <colgroup>
              <col className={showTrendColumn ? "w-[27%]" : "w-[32%]"} />
              <col className={showTrendColumn ? "w-[19%]" : "w-[21%]"} />
              <col className={showTrendColumn ? "w-[16%]" : "w-[17%]"} />
              {showTrendColumn ? <col className="w-[11%]" /> : null}
              <col className={showTrendColumn ? "w-[10%]" : "w-[11%]"} />
              <col className={showTrendColumn ? "w-[11%]" : "w-[13%]"} />
              <col className="w-[6%]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-950 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                <th className="bg-slate-950 px-5 py-4">Student</th>
                <th className="bg-slate-950 px-5 py-4">Progress</th>
                <th className="bg-slate-950 px-5 py-4">Last Week Time</th>
                {showTrendColumn ? <th className="bg-slate-950 px-5 py-4">Trend</th> : null}
                <th className="bg-slate-950 px-5 py-4">Score</th>
                <th className="bg-slate-950 px-5 py-4">Status</th>
                <th aria-label="Remove student" className="bg-slate-950 px-5 py-4" />
              </tr>
            </thead>
          </table>
        </div>
        <div className="max-h-[690px] overflow-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className={showTrendColumn ? "w-[27%]" : "w-[32%]"} />
              <col className={showTrendColumn ? "w-[19%]" : "w-[21%]"} />
              <col className={showTrendColumn ? "w-[16%]" : "w-[17%]"} />
              {showTrendColumn ? <col className="w-[11%]" /> : null}
              <col className={showTrendColumn ? "w-[10%]" : "w-[11%]"} />
              <col className={showTrendColumn ? "w-[11%]" : "w-[13%]"} />
              <col className="w-[6%]" />
            </colgroup>
            <tbody className="divide-y divide-slate-200/70 bg-white">
              {students.length ? students.map((student) => (
                <tr
                  className="cursor-pointer align-middle transition-colors duration-200 hover:bg-slate-50"
                  key={student.id}
                  onClick={() => onOpenStudent(student)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onOpenStudent(student);
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{student.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{student.email}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <div className="min-w-36">
                      <div className="h-2 w-full overflow-hidden bg-slate-200">
                        <div
                          className={`h-full ${
                            student.status === "Suspicious"
                              ? "bg-linear-to-r from-rose-500 to-rose-400"
                              : student.status === "Inactive"
                                ? "bg-linear-to-r from-amber-500 to-amber-400"
                                : "bg-linear-to-r from-emerald-500 to-emerald-400"
                          }`}
                          style={{ width: `${student.progress}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {student.progress}% complete
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    <p className="text-sm font-semibold text-slate-950">
                      {formatLastWeekTime(student.lastWeekHours)}
                    </p>
                  </td>
                  <td className="px-5 py-4 align-middle">
                    {showTrendColumn ? (
                      <div className="flex items-center gap-2">
                        {student.scoreTrendDelta > 0 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        ) : student.scoreTrendDelta < 0 ? (
                          <TrendingDown className="h-4 w-4 text-rose-600" />
                        ) : (
                          <span className="text-base font-semibold leading-none text-slate-950">~</span>
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            student.scoreTrendDelta > 0
                              ? "text-emerald-700"
                              : student.scoreTrendDelta < 0
                                ? "text-rose-700"
                                : "text-slate-950"
                          }`}
                        >
                          {student.scoreTrendDelta > 0 ? "+" : student.scoreTrendDelta < 0 ? "-" : ""}
                          {Math.abs(student.scoreTrendDelta).toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {student.score.toFixed(1)}
                      </p>
                    )}
                  </td>
                  {showTrendColumn ? (
                    <td className="px-5 py-4 align-middle">
                      <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {student.score.toFixed(1)}
                      </p>
                    </td>
                  ) : null}
                  <td className="px-5 py-4 align-middle">
                    {(() => {
                      const paymentStatus = getPaymentStatus(student);

                      return (
                        <StatusBadge tone={paymentStatus === "Paid" ? "emerald" : "rose"}>
                          {paymentStatus}
                        </StatusBadge>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4 align-middle text-right">
                    <button
                      aria-label={`Remove ${student.name} from class`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveStudent(student);
                      }}
                      onKeyDown={(event) => event.stopPropagation()}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={showTrendColumn ? 7 : 6}>
                    {searchValue.trim() ? "No students match this search." : "No students in this class yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelShell>
    </div>
  );
}

function MonitoringPanel({ students, feed }) {
  const totalTabSwitches = students.reduce((sum, student) => sum + student.tabSwitches, 0);
  const idleCount = students.filter((student) => student.idleSeconds >= 90).length;
  const suspiciousStudents = students.filter((student) => student.riskLevel === "High");

  return (
    <PanelShell>
      <div className="border-b border-slate-200/70 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Live Monitoring Panel
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Behavior watch</h3>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="border border-slate-200/80 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tab switching
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {totalTabSwitches}
            </p>
            <p className="mt-2 text-sm text-slate-600">Across the current visible roster.</p>
          </div>
          <div className="border border-amber-200/80 bg-amber-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
              Idle students
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {idleCount}
            </p>
            <p className="mt-2 text-sm text-slate-600">Idle for more than 90 seconds.</p>
          </div>
          <div className="border border-rose-200/80 bg-rose-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
              Suspicious
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {suspiciousStudents.length}
            </p>
            <p className="mt-2 text-sm text-slate-600">Students needing review right now.</p>
          </div>
        </div>

        <div className="space-y-3">
          {feed.map((item) => (
            <article
              className={`border p-4 ${
                item.tone === "rose"
                  ? "border-rose-200/80 bg-rose-50/70"
                  : item.tone === "amber"
                    ? "border-amber-200/80 bg-amber-50/70"
                    : "border-slate-200/80 bg-white"
              }`}
              key={item.id}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 flex h-9 w-9 items-center justify-center ${
                    item.tone === "rose"
                      ? "bg-rose-100 text-rose-700"
                      : item.tone === "amber"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {item.tone === "rose" ? (
                    <ShieldAlert className="h-4 w-4" />
                  ) : item.tone === "amber" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <Radio className="h-4 w-4" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

function TaskControlPanel({
  sessionLive,
  answersLocked,
  selectedPreset,
  onStart,
  onPause,
  onLockToggle,
  onPresetChange,
  onResetTimer,
}) {
  return (
    <PanelShell>
      <div className="border-b border-slate-200/70 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Task Control Panel
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Teacher controls</h3>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex items-center justify-center gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-100"
            onClick={onStart}
            type="button"
          >
            <PlayCircle className="h-4 w-4" />
            Start test
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 transition-colors duration-200 hover:bg-amber-100"
            onClick={onPause}
            type="button"
          >
            <PauseCircle className="h-4 w-4" />
            Pause test
          </button>
        </div>

        <button
          className={`inline-flex w-full items-center justify-center gap-2 border px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
            answersLocked
              ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
              : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
          }`}
          onClick={onLockToggle}
          type="button"
        >
          <LockKeyhole className="h-4 w-4" />
          {answersLocked ? "Answers locked" : "Lock answers"}
        </button>

        <div className="border border-slate-200/80 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Set timer</p>
              <p className="mt-1 text-sm text-slate-500">Choose the test duration for the room.</p>
            </div>
            <button
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition-colors duration-200 hover:text-slate-900"
              onClick={onResetTimer}
              type="button"
            >
              <TimerReset className="h-4 w-4" />
              Reset
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {TIMER_PRESETS.map((preset) => {
              const isActive = preset.minutes === selectedPreset;

              return (
                <button
                  className={`border px-3 py-3 text-sm font-semibold transition-colors duration-200 ${
                    isActive
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                  key={preset.minutes}
                  onClick={() => onPresetChange(preset.minutes)}
                  type="button"
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border border-slate-200/80 bg-white px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Session mode
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {sessionLive ? "Live assessment running" : "Classroom paused"}
            </p>
          </div>
          <StatusBadge tone={sessionLive ? "emerald" : "amber"}>
            {sessionLive ? "Live" : "Paused"}
          </StatusBadge>
        </div>
      </div>
    </PanelShell>
  );
}

function LiveResultsPanel({ students }) {
  const chartData = students.map((student) => ({
    name: student.name.split(" ")[0],
    answered: student.answeredQuestions,
    correct: student.correctAnswers,
    fill: getResultBarColor(student),
  }));

  const answeredTotal = students.reduce((sum, student) => sum + student.answeredQuestions, 0);
  const correctTotal = students.reduce((sum, student) => sum + student.correctAnswers, 0);
  const averageAccuracy = answeredTotal ? Math.round((correctTotal / answeredTotal) * 100) : 0;

  return (
    <PanelShell>
      <div className="flex flex-col gap-4 border-b border-slate-200/70 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Live Results Panel
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Answered vs correct by student</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone="blue">{answeredTotal} total answers</StatusBadge>
          <StatusBadge tone="emerald">{averageAccuracy}% avg accuracy</StatusBadge>
        </div>
      </div>

      <div className="grid gap-5 p-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="h-80 border border-slate-200/80 bg-slate-50/60 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ResultsTooltip />} />
              <Bar dataKey="answered" name="Answered" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="correct" name="Correct" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell fill={entry.fill} key={`cell-${entry.name}`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {students.map((student) => (
            <div className="border border-slate-200/80 bg-white p-4" key={student.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{student.currentTask}</p>
                </div>
                <StatusBadge tone={getStudentStatusTone(student.status)}>{student.status}</StatusBadge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Answered</p>
                  <p className="mt-1 font-semibold text-slate-950">{student.answeredQuestions}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Correct</p>
                  <p className="mt-1 font-semibold text-slate-950">{student.correctAnswers}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Accuracy</p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {formatAccuracy(student.correctAnswers, student.answeredQuestions)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

function CommunicationPanel({ message, lastSentMessage, onChange, onSend, onQuickAlert }) {
  const [reminders, setReminders] = useState(() => DEFAULT_REMINDERS);
  const [reminderDraft, setReminderDraft] = useState("");
  const [isReminderComposerOpen, setIsReminderComposerOpen] = useState(false);
  const hasReminderDraft = reminderDraft.trim().length > 0;
  const reminderComposerRef = useRef(null);

  const handleAddReminder = () => {
    const trimmedReminder = reminderDraft.trim();
    if (!trimmedReminder) {
      return;
    }

    setReminders((current) => [
      ...current,
      {
        id: `reminder-${Date.now()}`,
        label: trimmedReminder,
      },
    ]);
    setReminderDraft("");
    setIsReminderComposerOpen(false);
  };

  const handleDeleteReminder = (reminderId) => {
    setReminders((current) => current.filter((reminder) => reminder.id !== reminderId));
  };

  useEffect(() => {
    if (!isReminderComposerOpen) {
      return undefined;
    }

    const handleOutsidePointerDown = (event) => {
      if (reminderComposerRef.current?.contains(event.target)) {
        return;
      }

      setReminderDraft("");
      setIsReminderComposerOpen(false);
    };

    document.addEventListener("mousedown", handleOutsidePointerDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePointerDown);
    };
  }, [isReminderComposerOpen]);

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        Messaging
      </p>
      <PanelShell>
        <div className="border-b border-slate-950 bg-slate-950 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white">
            Send message to class
          </p>
        </div>

        <div className="space-y-4 p-5">
          <textarea
            className="min-h-32 w-full resize-none border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Type a message for all students."
            value={message}
          />

          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Quick reminders
              </p>
              <div className="flex items-center justify-end gap-2 overflow-hidden sm:w-auto" ref={reminderComposerRef}>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isReminderComposerOpen
                      ? "max-w-xs translate-x-0 opacity-100"
                      : "max-w-0 translate-x-6 opacity-0 pointer-events-none"
                  }`}
                >
                  <input
                    className="w-56 min-w-0 border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-slate-400"
                    onChange={(event) => setReminderDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddReminder();
                      }
                    }}
                    placeholder="Type reminder"
                    value={reminderDraft}
                  />
                </div>
                <button
                  className={`inline-flex items-center justify-center gap-2 border px-3 py-2 text-sm font-medium shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)] ${
                    !isReminderComposerOpen
                      ? "emerald-gradient-fill border-emerald-300/20 text-white"
                      : hasReminderDraft
                        ? "emerald-gradient-fill border-emerald-300/20 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() => {
                    if (!isReminderComposerOpen) {
                      setIsReminderComposerOpen(true);
                      return;
                    }

                    if (!hasReminderDraft) {
                      setReminderDraft("");
                      setIsReminderComposerOpen(false);
                      return;
                    }

                    handleAddReminder();
                  }}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isReminderComposerOpen ? "Add" : "Add reminder"}</span>
                </button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {reminders.map((reminder) => (
                <div
                  className="inline-flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  key={reminder.id}
                >
                  <button
                    className="inline-flex items-center gap-2 text-left transition-colors duration-200 hover:text-amber-800"
                    onClick={() => onQuickAlert(reminder.label)}
                    type="button"
                  >
                    <BellRing className="h-4 w-4" />
                    <span>{reminder.label}</span>
                  </button>
                  <button
                    aria-label={`Delete ${reminder.label}`}
                    className="inline-flex items-center justify-center text-slate-400 transition-colors duration-200 hover:text-rose-600"
                    onClick={() => handleDeleteReminder(reminder.id)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              {lastSentMessage ? `Last message: ${lastSentMessage}` : "No classroom message sent yet."}
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800"
              onClick={onSend}
              type="button"
            >
              <Send className="h-4 w-4" />
              Send message
            </button>
          </div>
        </div>
      </PanelShell>
    </div>
  );
}

function TeacherClassOverviewPage() {
  const navigate = useNavigate();
  const { classId } = useParams();
  const [classOverrides, setClassOverrides] = useState(() => readClassOverrides());
  const allTeacherClasses = useMemo(() => getAllTeacherClasses(), []);
  const baseClassroom = allTeacherClasses.find((item) => item.id === classId) ?? allTeacherClasses[0];
  const classroom = {
    ...baseClassroom,
    ...(classOverrides[baseClassroom.id] ?? {}),
  };
  const [classDetails, setClassDetails] = useState(() => ({
    name: classroom.name,
    startTime: classroom.startTime,
  }));
  const [classEditForm, setClassEditForm] = useState(() => ({
    name: classroom.name,
    startTime: classroom.startTime,
  }));
  const [teacherStudentCatalog, setTeacherStudentCatalog] = useState(() => resolveTeacherStudentsWithClassIds());
  const refreshStudentMemberships = () => setTeacherStudentCatalog(resolveTeacherStudentsWithClassIds());
  const matchedStudents = useMemo(
    () => teacherStudentCatalog.filter((student) => student.classId === classId),
    [classId, teacherStudentCatalog],
  );
  const [rosterStudents, setRosterStudents] = useState(() => matchedStudents);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [studentPendingRemoval, setStudentPendingRemoval] = useState(null);
  const [inviteSearch, setInviteSearch] = useState("");
  const [studentRosterSearch, setStudentRosterSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [inviteForm, setInviteForm] = useState({
    name: "",
    surname: "",
    email: "",
  });

  const students = useMemo(
    () => buildSessionStudents(classroom, rosterStudents),
    [classroom, rosterStudents],
  );
  const filteredStudents = useMemo(() => {
    const query = studentRosterSearch.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const searchable = [
        student.name,
        student.id,
        student.email,
      ].filter(Boolean).join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [studentRosterSearch, students]);
  const activityFeed = useMemo(() => buildActivityFeed(classroom, students), [classroom, students]);
  const availableStudents = useMemo(
    () =>
      teacherStudentCatalog.filter(
        (student) =>
          student.classId == null &&
          !rosterStudents.some((rosterStudent) => rosterStudent.id === student.id),
      ),
    [rosterStudents, teacherStudentCatalog],
  );
  const registeredStudents = useMemo(
    () =>
      teacherStudentCatalog
        .filter((student) => !rosterStudents.some((rosterStudent) => rosterStudent.id === student.id))
        .map((student) => ({
          ...student,
          email: buildInferredEmail(student),
        })),
    [rosterStudents, teacherStudentCatalog],
  );

  const defaultPreset = 40;
  const [selectedPreset, setSelectedPreset] = useState(defaultPreset);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultPreset * 60);
  const [sessionLive, setSessionLive] = useState(true);
  const [answersLocked, setAnswersLocked] = useState(false);
  const [message, setMessage] = useState("");
  const [lastSentMessage, setLastSentMessage] = useState("");
  const displayClassroom = {
    ...classroom,
    ...classDetails,
  };
  const totalStudentsCount = rosterStudents.length;

  useEffect(() => {
    setRosterStudents(matchedStudents);
  }, [matchedStudents]);

  useEffect(() => {
    setTeacherStudentCatalog(resolveTeacherStudentsWithClassIds());
  }, [classId]);

  useEffect(() => {
    const nextClassDetails = {
      name: classroom.name,
      startTime: classroom.startTime,
    };

    setClassDetails(nextClassDetails);
    setClassEditForm(nextClassDetails);
  }, [classroom.id, classroom.name, classroom.startTime]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CLASS_OVERRIDES_STORAGE_KEY, JSON.stringify(classOverrides));
    } catch {
      // Ignore storage write failures.
    }
  }, [classOverrides]);

  useEffect(() => {
    if (!isAddStudentModalOpen && !isInviteModalOpen && !isEditClassModalOpen && !studentPendingRemoval) {
      setStudentSearch("");
      document.body.style.overflow = "";
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAddStudentModalOpen, isEditClassModalOpen, isInviteModalOpen, studentPendingRemoval]);

  useEffect(() => {
    if (!sessionLive || remainingSeconds <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remainingSeconds, sessionLive]);

  const handleStart = () => {
    if (remainingSeconds <= 0) {
      setRemainingSeconds(selectedPreset * 60);
    }
    setSessionLive(true);
  };

  const handlePause = () => {
    setSessionLive(false);
  };

  const handleEnd = () => {
    setSessionLive(false);
    setRemainingSeconds(0);
  };

  const handlePresetChange = (minutes) => {
    setSelectedPreset(minutes);
    setRemainingSeconds(minutes * 60);
  };

  const handleResetTimer = () => {
    setRemainingSeconds(selectedPreset * 60);
  };

  const handleSendMessage = () => {
    if (!message.trim()) {
      return;
    }

    setLastSentMessage(message.trim());
    setMessage("");
  };

  const handleQuickAlert = (alert) => {
    setLastSentMessage(alert);
    setMessage("");
  };

  const handleOpenEditClassModal = () => {
    setClassEditForm(classDetails);
    setIsEditClassModalOpen(true);
  };

  const handleCloseEditClassModal = () => {
    setClassEditForm(classDetails);
    setIsEditClassModalOpen(false);
  };

  const handleEditClassFormChange = (event) => {
    const { name, value } = event.target;

    setClassEditForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSaveClassDetails = () => {
    const trimmedName = classEditForm.name.trim();
    const trimmedStartTime = classEditForm.startTime.trim();

    if (!trimmedName || !trimmedStartTime) {
      return;
    }

    setClassDetails({
      name: trimmedName,
      startTime: trimmedStartTime,
    });
    setClassOverrides((current) => ({
      ...current,
      [classroom.id]: {
        ...(current[classroom.id] ?? {}),
        name: trimmedName,
        startTime: trimmedStartTime,
      },
    }));
    setIsEditClassModalOpen(false);
  };

  const resetInviteForm = () => {
    setInviteForm({
      name: "",
      surname: "",
      email: "",
    });
    setInviteSearch("");
  };

  const handleInviteFormChange = (event) => {
    const { name, value } = event.target;

    setInviteForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddStudentToClass = (student) => {
    setRosterStudents((current) => [
      ...current,
      { ...student, classId, className: classDetails.name },
    ]);
    writeTeacherStudentMemberships({
      ...readTeacherStudentMemberships(),
      [student.id]: classId,
    });
    refreshStudentMemberships();
    setIsAddStudentModalOpen(false);
  };

  const handleRemoveStudentFromClass = (studentId) => {
    setRosterStudents((current) => current.filter((student) => student.id !== studentId));
    writeTeacherStudentMemberships({
      ...readTeacherStudentMemberships(),
      [studentId]: null,
    });
    refreshStudentMemberships();
  };
  const handleConfirmRemoveStudent = () => {
    if (!studentPendingRemoval) {
      return;
    }

    handleRemoveStudentFromClass(studentPendingRemoval.id);
    setStudentPendingRemoval(null);
  };

  const handleRegisteredStudentPick = (student) => {
    const [name = "", ...surnameParts] = student.name.split(" ");

    setInviteForm({
      name,
      surname: surnameParts.join(" "),
      email: student.email,
    });
    setInviteSearch("");
  };

  const handleInviteStudent = () => {
    const trimmedName = inviteForm.name.trim();
    const trimmedSurname = inviteForm.surname.trim();
    const trimmedEmail = inviteForm.email.trim();

    if (!trimmedName || !trimmedSurname || !trimmedEmail) {
      return;
    }

    const generatedId = `${trimmedName.toLowerCase()}-${trimmedSurname.toLowerCase()}-${Date.now()}`
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const invitedStudent = {
      id: generatedId,
      name: `${trimmedName} ${trimmedSurname}`,
      classId,
      className: classDetails.name,
      targetBand: "TBD",
      currentBand: "TBD",
      status: "Invited",
      weakArea: "Placement pending",
      completionRate: "--",
      lastSubmission: "No submissions yet",
      notes: `Invitation prepared for ${trimmedEmail}. Awaiting student confirmation.`,
      email: trimmedEmail,
    };

    setRosterStudents((current) => [...current, invitedStudent]);
    writeCustomTeacherStudents([...readCustomTeacherStudents(), invitedStudent]);
    writeTeacherStudentMemberships({
      ...readTeacherStudentMemberships(),
      [generatedId]: classId,
    });
    refreshStudentMemberships();

    resetInviteForm();
    setIsInviteModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
          Classroom Dashboard
        </p>
      </div>

      <InviteStudentModal
        classroom={displayClassroom}
        inviteForm={inviteForm}
        inviteSearch={inviteSearch}
        isOpen={isInviteModalOpen}
        onClose={() => {
          resetInviteForm();
          setIsInviteModalOpen(false);
        }}
        onInviteFormChange={handleInviteFormChange}
        onInviteSearchChange={setInviteSearch}
        onRegisteredStudentPick={handleRegisteredStudentPick}
        onInviteSubmit={handleInviteStudent}
        registeredStudents={registeredStudents}
      />

      <ConfirmStudentRemovalModal
        classroomName={displayClassroom.name}
        isOpen={Boolean(studentPendingRemoval)}
        onClose={() => setStudentPendingRemoval(null)}
        onConfirm={handleConfirmRemoveStudent}
        studentName={studentPendingRemoval?.name}
      />

      <AddStudentModal
        candidates={availableStudents}
        classroom={displayClassroom}
        isOpen={isAddStudentModalOpen}
        onAddStudent={handleAddStudentToClass}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSearchChange={setStudentSearch}
        searchValue={studentSearch}
      />

      <EditClassModal
        form={classEditForm}
        isOpen={isEditClassModalOpen}
        onChange={handleEditClassFormChange}
        onClose={handleCloseEditClassModal}
        onSubmit={handleSaveClassDetails}
      />

      <HeaderPanel
        classroom={displayClassroom}
        onOpenEditModal={handleOpenEditClassModal}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        totalStudents={totalStudentsCount}
        students={students}
      />

      <section>
        <StudentsPanel
          onOpenStudent={(student) =>
            navigate(`/teacher/students/${student.id}`, {
              state: { studentData: student },
            })}
          onRemoveStudent={setStudentPendingRemoval}
          onSearchChange={setStudentRosterSearch}
          searchValue={studentRosterSearch}
          showTrendColumn
          students={filteredStudents}
        />
      </section>

      <section>
        <CommunicationPanel
          lastSentMessage={lastSentMessage}
          message={message}
          onChange={setMessage}
          onQuickAlert={handleQuickAlert}
          onSend={handleSendMessage}
        />
      </section>
    </div>
  );
}

export default TeacherClassOverviewPage;
