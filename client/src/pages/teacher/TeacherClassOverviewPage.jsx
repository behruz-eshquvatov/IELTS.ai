import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BookOpenText,
  ChevronDown,
  Clock3,
  Headphones,
  LockKeyhole,
  PauseCircle,
  PenSquare,
  PenLine,
  PlayCircle,
  Plus,
  Radio,
  Search,
  Settings2,
  Send,
  ShieldAlert,
  TimerReset,
  Trash2,
  ArrowUpRight,
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
import { TimePickerField } from "../../components/ui/StyledFormControls";
import { teacherStudents } from "../../data/teacherPanel";
import {
  getTeacherClassOverview,
  getTeacherClassHomeworkUnits,
  getTeacherClassUnitHomework,
  inviteStudentToTeacherClass,
  removeStudentFromTeacherClass,
  sendTeacherClassMessage,
  searchTeacherClassStudents,
  updateTeacherClass,
} from "../../services/teacherService";

const CLASS_OVERRIDES_STORAGE_KEY = "teacher:class-overrides";
const TIMER_PRESETS = [
  { label: "20 min", minutes: 20 },
  { label: "40 min", minutes: 40 },
  { label: "60 min", minutes: 60 },
  { label: "90 min", minutes: 90 },
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

const CLASS_SKILL_AREAS = [
  {
    key: "listening",
    label: "Listening",
    icon: Headphones,
    accent: "bg-blue-50 text-blue-700",
  },
  {
    key: "reading",
    label: "Reading",
    icon: BookOpenText,
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "writingTask1",
    label: "Writing Task 1",
    icon: PenLine,
    accent: "bg-amber-50 text-amber-700",
  },
  {
    key: "writingTask2",
    label: "Writing Task 2",
    icon: PenLine,
    accent: "bg-rose-50 text-rose-700",
  },
];

function classifyClassSkillArea(weakArea) {
  const normalizedValue = String(weakArea || "").toLowerCase();

  if (!normalizedValue || normalizedValue.includes("behavior anomaly") || normalizedValue.includes("placement pending")) {
    return null;
  }

  if (
    normalizedValue.includes("reading")
    || normalizedValue.includes("headings")
    || normalizedValue.includes("true-false")
    || normalizedValue.includes("detail trap")
    || normalizedValue.includes("inference")
    || normalizedValue.includes("pacing")
    || normalizedValue.includes("timing")
  ) {
    return "reading";
  }

  if (
    normalizedValue.includes("task 1")
    || normalizedValue.includes("overview")
    || normalizedValue.includes("data grouping")
    || normalizedValue.includes("report")
  ) {
    return "writingTask1";
  }

  if (
    normalizedValue.includes("essay")
    || normalizedValue.includes("cohesion")
    || normalizedValue.includes("coherence")
    || normalizedValue.includes("task response")
    || normalizedValue.includes("conclusion")
    || normalizedValue.includes("planning")
  ) {
    return "writingTask2";
  }

  if (
    normalizedValue.includes("listening")
    || normalizedValue.includes("map")
    || normalizedValue.includes("multiple choice")
    || normalizedValue.includes("note")
    || normalizedValue.includes("form")
    || normalizedValue.includes("sentence completion")
    || normalizedValue.includes("distractor")
  ) {
    return "listening";
  }

  return null;
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
    weakArea: student.weakArea,
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
    weakArea: student.weakArea,
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
    slate: "text-slate-200",
    emerald: "text-emerald-200",
    amber: "text-amber-200",
    rose: "text-rose-200",
    blue: "text-sky-200",
  };

  return (
    <div className={`inline-flex h-[80px] items-center gap-3 ${toneClasses[tone]}`}>
      <span className="flex h-9 w-9 items-center justify-center border border-white/20 bg-white/10">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-current/90">{label}</p>
        <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function RollingHeaderAction({ icon, label, onClick }) {
  const renderedIcon = icon ? icon({ className: "h-4 w-4 shrink-0" }) : null;

  return (
    <button
      className="group inline-flex items-center gap-2 bg-transparent px-1 py-3 text-sm font-semibold text-slate-200/90 transition-colors duration-200 hover:text-white"
      onClick={onClick}
      type="button"
    >
      {renderedIcon}
      <span className="relative block h-[1.15rem] overflow-hidden">
        <span className="flex flex-col transition-transform duration-300 ease-out group-hover:-translate-y-1/2">
          <span className="h-[1.15rem]">{label}</span>
          <span className="h-[1.15rem] text-white">{label}</span>
        </span>
      </span>
    </button>
  );
}

function HeaderPanel({
  classroom,
  onOpenEditModal,
  onOpenAnalysisModal,
  onOpenMessageModal,
  onOpenInviteModal,
  totalStudents,
}) {
  return (
    <PanelShell className="relative overflow-hidden border-slate-800/80 bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(56,189,248,0.18),transparent_38%),radial-gradient(circle_at_88%_12%,rgba(16,185,129,0.18),transparent_36%),linear-gradient(145deg,#020617_0%,#0b1223_55%,#111827_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(148,163,184,0.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="pointer-events-none absolute inset-0 [background-image:radial-gradient(60%_90%_at_-12%_100%,rgba(148,163,184,0.26),transparent_62%),radial-gradient(54%_82%_at_112%_0%,rgba(56,189,248,0.2),transparent_60%),radial-gradient(42%_68%_at_68%_-18%,rgba(16,185,129,0.14),transparent_64%)]" />
      <div className="pointer-events-none absolute inset-0 border border-dashed border-white/10" />
      <div className="relative px-5 py-5 lg:px-6 lg:py-6">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                {classroom.name}
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              <RollingHeaderAction
                icon={ArrowUpRight}
                label="Analyses"
                onClick={onOpenAnalysisModal}
              />
              <RollingHeaderAction
                icon={Send}
                label="Message"
                onClick={onOpenMessageModal}
              />
              <RollingHeaderAction
                icon={PenSquare}
                label="Edit class"
                onClick={onOpenEditModal}
              />
              <button
                className="emerald-gradient-fill ml-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white"
                onClick={onOpenInviteModal}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add student
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-wrap gap-8">
              <SummaryChip icon={Clock3} label="Lesson time" value={classroom.startTime} />
              <SummaryChip icon={Users2} label="Total students" value={String(totalStudents)} />
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
        <div className="w-full max-w-xl overflow-hidden bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
          <div className="flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <div className="flex min-h-11 items-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                Edit class
              </p>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white transition-colors duration-200"
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
                <TimePickerField
                  className=""
                  name="startTime"
                  onChange={onChange}
                  value={form.startTime}
                />
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white"
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
        <div className="w-full max-w-5xl overflow-visible bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
          <div className="-mx-px flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                New student
              </p>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white transition-colors duration-200"
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
                className="inline-flex items-center gap-2 rounded-full border border-slate-950 bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-800"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-45"
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

function MessageClassModal({
  className,
  isOpen,
  isSending,
  messageText,
  errorText,
  onChangeMessage,
  onClose,
  onSend,
}) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl overflow-hidden bg-[#f8fafc] shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
          <div className="flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
              Message to class
            </p>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white transition-colors duration-200"
              onClick={onClose}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-600">
              Send to everyone in <span className="font-semibold text-slate-900">{className}</span>.
            </p>
            <textarea
              className="min-h-40 w-full resize-y border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
              onChange={(event) => onChangeMessage(event.target.value)}
              placeholder="Write your message to all students in this class..."
              value={messageText}
            />
            {errorText ? (
              <p className="text-sm text-rose-600">{errorText}</p>
            ) : null}
            <div className="flex justify-end">
              <button
                className="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSending || !messageText.trim()}
                onClick={onSend}
                type="button"
              >
                <Send className="h-4 w-4" />
                {isSending ? "Sending..." : "Send"}
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
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors duration-200"
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
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-100"
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

function formatDuration(seconds) {
  const safeSeconds = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
  const totalMinutes = Math.round(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatBand(value) {
  const band = Number(value);
  return Number.isFinite(band) ? band.toFixed(1) : "-";
}

function UnitHomeworkPanel({
  classId,
  classroomName,
  refreshKey,
  searchValue,
  onOpenStudent,
  onRemoveStudent,
  onSearchChange,
}) {
  const [payload, setPayload] = useState({ selectedUnitId: "", units: [], rows: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [sortBy, setSortBy] = useState("status");
  const [sortDirection, setSortDirection] = useState("asc");
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [isUnitMenuOpen, setIsUnitMenuOpen] = useState(false);
  const columnMenuRef = useRef(null);
  const unitMenuRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const raw = window.localStorage.getItem("teacher:unit-homework:visible-columns");
      return raw ? JSON.parse(raw) : {
        attempts: true,
        timeSpent: true,
        overallScore: true,
        listening: true,
        reading: true,
        writingTask1: true,
        writingTask2: true,
      };
    } catch {
      return {
        attempts: true,
        timeSpent: true,
        overallScore: true,
        listening: true,
        reading: true,
        writingTask1: true,
        writingTask2: true,
      };
    }
  });
  const [columnOrder, setColumnOrder] = useState(() => {
    try {
      const raw = window.localStorage.getItem("teacher:unit-homework:column-order");
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch {
      // ignore
    }
    return ["attempts", "timeSpent", "overallScore", "listening", "reading", "writingTask1", "writingTask2"];
  });

  useEffect(() => {
    window.localStorage.setItem("teacher:unit-homework:visible-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  useEffect(() => {
    window.localStorage.setItem("teacher:unit-homework:column-order", JSON.stringify(columnOrder));
  }, [columnOrder]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!columnMenuRef.current?.contains(event.target)) {
        setIsColumnMenuOpen(false);
      }
      if (!unitMenuRef.current?.contains(event.target)) {
        setIsUnitMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsColumnMenuOpen(false);
        setIsUnitMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setIsLoading(true);
      setErrorText("");
      try {
        const response = await getTeacherClassHomeworkUnits(classId);
        if (!isMounted) {
          return;
        }
        setPayload({
          selectedUnitId: String(response?.selectedUnitId || ""),
          units: Array.isArray(response?.units) ? response.units : [],
          rows: Array.isArray(response?.rows) ? response.rows : [],
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorText(error?.message || "Could not load unit homework data.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      isMounted = false;
    };
  }, [classId, refreshKey]);

  const activeUnitIndex = payload.units.findIndex((unit) => unit.unitId === payload.selectedUnitId);
  const selectedUnit = activeUnitIndex >= 0 ? payload.units[activeUnitIndex] : null;

  const handleUnitSelect = async (unitId) => {
    if (!unitId || unitId === payload.selectedUnitId) {
      return;
    }
    setIsLoading(true);
    setErrorText("");
    try {
      const response = await getTeacherClassUnitHomework(classId, unitId);
      setPayload({
        selectedUnitId: String(response?.selectedUnitId || unitId),
        units: Array.isArray(response?.units) ? response.units : [],
        rows: Array.isArray(response?.rows) ? response.rows : [],
      });
    } catch (error) {
      setErrorText(error?.message || "Could not load selected unit.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(columnKey);
    setSortDirection("asc");
  };

  const filteredRows = useMemo(() => {
    const query = String(searchValue || "").trim().toLowerCase();
    const base = Array.isArray(payload.rows) ? payload.rows : [];
    if (!query) {
      return base;
    }
    return base.filter((row) =>
      `${String(row.studentName || "")} ${String(row.email || "")}`.toLowerCase().includes(query));
  }, [payload.rows, searchValue]);

  const sortedRows = useMemo(() => {
    const rows = [...filteredRows];
    rows.sort((left, right) => {
      let cmp = 0;
      if (sortBy === "studentName") {
        cmp = String(left.studentName || "").localeCompare(String(right.studentName || ""));
      } else if (sortBy === "status") {
        const leftValue = left.status === "incomplete" ? 0 : 1;
        const rightValue = right.status === "incomplete" ? 0 : 1;
        cmp = leftValue - rightValue;
      } else if (sortBy === "attempts") {
        cmp = Number(left.attemptsCount || 0) - Number(right.attemptsCount || 0);
      } else if (sortBy === "timeSpent") {
        cmp = Number(left.timeSpentSeconds || 0) - Number(right.timeSpentSeconds || 0);
      } else if (sortBy === "overallScore") {
        cmp = Number(left.overallScore ?? -1) - Number(right.overallScore ?? -1);
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filteredRows, sortBy, sortDirection]);

  const optionalColumns = [
    { key: "attempts", label: "ATTEMPTS", sortable: true },
    { key: "timeSpent", label: "TIME SPENT", sortable: true },
    { key: "overallScore", label: "OVERALL SCORE", sortable: true },
    { key: "listening", label: "LISTENING", sortable: false },
    { key: "reading", label: "READING", sortable: false },
    { key: "writingTask1", label: "WRITING TASK 1", sortable: false },
    { key: "writingTask2", label: "WRITING TASK 2", sortable: false },
  ];
  const optionalColumnKeys = optionalColumns.map((column) => column.key);
  const normalizedColumnOrder = [
    ...columnOrder.filter((key) => optionalColumnKeys.includes(key)),
    ...optionalColumnKeys.filter((key) => !columnOrder.includes(key)),
  ];
  const orderedColumns = normalizedColumnOrder
    .map((columnKey) => optionalColumns.find((column) => column.key === columnKey))
    .filter(Boolean);
  const visibleOrderedColumns = orderedColumns.filter((column) => visibleColumns[column.key]);
  const getColumnMinWidth = (column) => {
    const baseFromLabel = Math.max(String(column?.label || "").length * 10 + 42, 120);
    if (column?.key === "overallScore") {
      return Math.max(baseFromLabel, 150);
    }
    return baseFromLabel;
  };
  const tableMinWidth = visibleOrderedColumns.reduce(
    (totalWidth, column) => totalWidth + getColumnMinWidth(column),
    384, // STUDENT + STATUS baseline width + sticky actions column
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Unit Homework Monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="relative"
            ref={columnMenuRef}
            onMouseEnter={() => setIsColumnMenuOpen(true)}
            onMouseLeave={(event) => {
              if (!columnMenuRef.current?.contains(event.relatedTarget)) {
                setIsColumnMenuOpen(false);
              }
            }}
          >
            <button
              aria-expanded={isColumnMenuOpen}
              aria-haspopup="menu"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:text-emerald-700"
              onClick={() => setIsColumnMenuOpen((current) => !current)}
              type="button"
            >
              <Settings2 className="h-4 w-4" />
              Columns
            </button>
            <div
              className={`absolute right-0 top-full z-20 mt-0 w-72 origin-top-right overflow-hidden border border-slate-200 bg-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.45)] transition ${
                isColumnMenuOpen
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-95 opacity-0"
              }`}
              role="menu"
            >
                <span className="absolute -top-2 left-0 h-2 w-full bg-transparent" />
                <div className="max-h-80 space-y-1 overflow-y-auto p-2">
                  {optionalColumns.map((column) => (
                    <label
                      className="flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm text-slate-700 transition-colors duration-150 hover:bg-emerald-50 hover:text-emerald-800"
                      key={column.key}
                    >
                      <span className="font-medium text-slate-700">{column.label}</span>
                      <input
                        className="h-4 w-4 border-slate-300 accent-emerald-600 focus:ring-2 focus:ring-emerald-300"
                        checked={Boolean(visibleColumns[column.key])}
                        onChange={(event) => setVisibleColumns((current) => ({
                          ...current,
                          [column.key]: event.target.checked,
                        }))}
                        type="checkbox"
                      />
                    </label>
                  ))}
                </div>
            </div>
          </div>
          <div
            className="relative"
            ref={unitMenuRef}
            onMouseEnter={() => setIsUnitMenuOpen(true)}
            onMouseLeave={(event) => {
              if (!unitMenuRef.current?.contains(event.relatedTarget)) {
                setIsUnitMenuOpen(false);
              }
            }}
          >
            <button
              aria-expanded={isUnitMenuOpen}
              aria-haspopup="menu"
              className="inline-flex min-w-[130px] items-center justify-between gap-3 border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-emerald-300 hover:text-emerald-700"
              onClick={() => setIsUnitMenuOpen((current) => !current)}
              type="button"
            >
              <span className="truncate">
                {selectedUnit?.title || (payload.units.length ? `Unit ${activeUnitIndex + 1}` : "No units")}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isUnitMenuOpen ? "rotate-180" : ""}`} />
            </button>
            <div
              className={`absolute right-0 top-full z-20 mt-0 w-56 origin-top-right overflow-hidden border border-slate-200 bg-white shadow-[0_24px_48px_-30px_rgba(15,23,42,0.45)] transition ${
                isUnitMenuOpen
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-95 opacity-0"
              }`}
              role="menu"
            >
              <span className="absolute -top-2 left-0 h-2 w-full bg-transparent" />
              <div className="max-h-80 overflow-y-auto p-2">
                {payload.units.length ? payload.units.map((unit, index) => {
                  const isActive = unit.unitId === payload.selectedUnitId;
                  return (
                    <button
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold transition-colors duration-150 ${
                        isActive
                          ? "emerald-gradient-fill text-white"
                          : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800"
                      }`}
                      key={unit.unitId}
                      onClick={() => {
                        setIsUnitMenuOpen(false);
                        void handleUnitSelect(unit.unitId);
                      }}
                      type="button"
                    >
                      <span className="truncate">{unit.title || `Unit ${index + 1}`}</span>
                    </button>
                  );
                }) : (
                  <div className="px-3 py-2 text-sm font-semibold text-slate-500">
                    No units
                  </div>
                )}
              </div>
            </div>
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
      </div>

      <PanelShell>
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full table-auto" style={{ minWidth: `${tableMinWidth}px` }}>
            <thead>
              <tr className="bg-slate-950 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                <th className="w-[320px] min-w-[320px] px-4 py-4 whitespace-nowrap">
                  <button className="inline-flex items-center gap-1" onClick={() => handleSort("studentName")} type="button">
                    STUDENT
                  </button>
                </th>
                <th className="w-[190px] min-w-[190px] px-4 py-4 whitespace-nowrap">
                  <button className="inline-flex items-center gap-1" onClick={() => handleSort("status")} type="button">
                    STATUS
                  </button>
                </th>
                {visibleOrderedColumns.map((column) => (
                  <th
                    className="px-4 py-4 whitespace-nowrap"
                    draggable
                    key={column.key}
                    style={{ minWidth: `${getColumnMinWidth(column)}px` }}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", column.key);
                    }}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sourceKey = event.dataTransfer.getData("text/plain");
                      if (!sourceKey || sourceKey === column.key) {
                        return;
                      }
                      const nextOrder = [...columnOrder];
                      const sourceIndex = nextOrder.indexOf(sourceKey);
                      const targetIndex = nextOrder.indexOf(column.key);
                      if (sourceIndex === -1 || targetIndex === -1) {
                        return;
                      }
                      nextOrder.splice(sourceIndex, 1);
                      nextOrder.splice(targetIndex, 0, sourceKey);
                      setColumnOrder(nextOrder);
                    }}
                  >
                    {column.sortable ? (
                      <button className="inline-flex items-center gap-1" onClick={() => handleSort(column.key)} type="button">
                        {column.label}
                      </button>
                    ) : column.label}
                  </th>
                ))}
                <th className="sticky right-0 z-20 w-16 min-w-[72px] bg-slate-950 px-4 py-4 whitespace-nowrap" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={9}>Loading unit homework...</td>
                </tr>
              ) : errorText ? (
                <tr>
                  <td className="px-4 py-8 text-sm text-rose-600" colSpan={9}>{errorText}</td>
                </tr>
              ) : sortedRows.length ? sortedRows.map((row) => (
                <tr
                  className="cursor-pointer transition-colors duration-200 hover:bg-slate-50"
                  key={row.studentId}
                  onClick={() => onOpenStudent({
                    id: row.studentId,
                    name: row.studentName,
                    email: row.email,
                    className: classroomName,
                    currentBand: row.overallScore,
                    weakArea: row.missingTasks?.length ? `Missing: ${row.missingTasks.join(", ")}` : "On track",
                  })}
                >
                  <td className="w-[280px] min-w-[280px] px-4 py-4">
                    <p className="text-sm font-semibold text-slate-950">{row.studentName}</p>
                    <p className="mt-1 break-all text-sm text-slate-500">{row.email}</p>
                  </td>
                  <td className="w-[150px] min-w-[150px] px-4 py-4">
                    <span
                      className={`inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        row.status === "complete" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  {visibleOrderedColumns.map((column) => {
                    if (column.key === "attempts") {
                      return <td className="px-4 py-4 text-sm text-slate-800" key={column.key} style={{ minWidth: `${getColumnMinWidth(column)}px` }}>{row.attemptsCount}</td>;
                    }
                    if (column.key === "timeSpent") {
                      return <td className="px-4 py-4 text-sm text-slate-800" key={column.key} style={{ minWidth: `${getColumnMinWidth(column)}px` }}>{formatDuration(row.timeSpentSeconds)}</td>;
                    }
                    if (column.key === "overallScore") {
                      const tooltip = row.attemptScores?.length > 1
                        ? row.attemptScores
                          .map((attempt) => `Attempt ${attempt.attemptNumber}: ${formatBand(attempt.score)}${attempt.submittedAt ? ` (${new Date(attempt.submittedAt).toLocaleString()})` : ""}`)
                          .join("\n")
                        : "No other attempts.";
                      return (
                        <td className="px-4 py-4 text-sm font-semibold text-slate-900" key={column.key} style={{ minWidth: `${getColumnMinWidth(column)}px` }} title={tooltip}>
                          {formatBand(row.overallScore)}
                        </td>
                      );
                    }
                    if (column.key === "listening") {
                      return <td className="px-4 py-4 text-sm text-slate-800" key={column.key} style={{ minWidth: `${getColumnMinWidth(column)}px` }}>{formatBand(row.sectionScores?.listening)}</td>;
                    }
                    if (column.key === "reading") {
                      return <td className="px-4 py-4 text-sm text-slate-800" key={column.key} style={{ minWidth: `${getColumnMinWidth(column)}px` }}>{formatBand(row.sectionScores?.reading)}</td>;
                    }
                    if (column.key === "writingTask1") {
                      return <td className="px-4 py-4 text-sm text-slate-800" key={column.key} style={{ minWidth: `${getColumnMinWidth(column)}px` }}>{formatBand(row.sectionScores?.writingTask1)}</td>;
                    }
                    if (column.key === "writingTask2") {
                      return <td className="px-4 py-4 text-sm text-slate-800" key={column.key} style={{ minWidth: `${getColumnMinWidth(column)}px` }}>{formatBand(row.sectionScores?.writingTask2)}</td>;
                    }
                    return null;
                  })}
                  <td className="sticky right-0 z-10 relative w-16 min-w-[72px] bg-white px-4 py-4 text-right">
                    <button
                      aria-label={`Remove ${row.studentName} from class`}
                      className="absolute right-4 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveStudent({ id: row.studentId, name: row.studentName });
                      }}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-8 text-sm text-slate-500" colSpan={9}>
                    {searchValue.trim() ? "No students match this search." : "No homework rows for this unit."}
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

function ClassStrengthPanel({ students }) {
  const metrics = CLASS_SKILL_AREAS.map((area) => ({
    ...area,
    strugglingCount: 0,
  }));

  const areaByKey = new Map(metrics.map((area) => [area.key, area]));
  const denominator = students.filter((student) => classifyClassSkillArea(student.weakArea)).length || 1;

  students.forEach((student) => {
    const area = areaByKey.get(classifyClassSkillArea(student.weakArea));
    if (area) {
      area.strugglingCount += 1;
    }
  });

  const rankedMetrics = metrics.map((area) => {
    const pressureShare = area.strugglingCount / denominator;
    return {
      ...area,
      pressureShare,
      strengthScore: Math.max(8, Math.round((1 - pressureShare) * 100)),
    };
  });

  const strongestArea = [...rankedMetrics].sort((left, right) => right.strengthScore - left.strengthScore)[0] ?? null;
  const weakestArea = [...rankedMetrics].sort((left, right) => left.strengthScore - right.strengthScore)[0] ?? null;

  return (
    <div>
        <div className="space-y-4">
          {rankedMetrics.map((area) => {
            const Icon = area.icon;
            const isStrongest = strongestArea?.key === area.key;
            const isWeakest = weakestArea?.key === area.key;

            return (
              <article key={area.key}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center border border-slate-900/20 bg-white text-slate-500/80">
                      <Icon className="h-4 w-4" />
                    </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">{area.label}</p>
                          {isStrongest ? <StatusBadge tone="emerald">Strongest</StatusBadge> : null}
                          {isWeakest ? <StatusBadge tone="rose">Weakest</StatusBadge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {area.strugglingCount} students flag this as a weak area
                        </p>
                      </div>
                    </div>

                  <div className="min-w-[7rem] text-left lg:text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Confidence
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                      {area.strengthScore}%
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full ${
                        isStrongest
                          ? "emerald-gradient-fill"
                          : isWeakest
                            ? "bg-rose-500"
                            : "bg-slate-900"
                      }`}
                      style={{ width: `${area.strengthScore}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
    </div>
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

function TeacherClassOverviewPage() {
  const navigate = useNavigate();
  const { classId } = useParams();
  const [classOverrides, setClassOverrides] = useState(() => readClassOverrides());
  const baseClassroom = useMemo(() => ({
    id: classId,
    name: "Classroom",
    startTime: "--:--",
  }), [classId]);
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
  const [teacherStudentCatalog, setTeacherStudentCatalog] = useState([]);
  const refreshStudentMemberships = async () => {
    try {
      const response = await searchTeacherClassStudents(classId, "");
      const inClass = Array.isArray(response?.inClass) ? response.inClass : [];
      const others = Array.isArray(response?.others) ? response.others : [];
      setTeacherStudentCatalog(
        [...inClass, ...others].map((student) => ({
          id: student.studentId,
          name: student.fullName,
          email: student.email,
          classId: student.inClass ? classId : student.assignedElsewhere ? student.assignedClassId : null,
          className: student.inClass
            ? classDetails.name
            : student.assignedElsewhere
              ? (student.assignedClassName || "Another group")
              : "Unassigned",
          assignedElsewhere: Boolean(student.assignedElsewhere),
          canInvite: student.canInvite !== false,
          targetBand: "TBD",
          currentBand: "TBD",
          status: student.pendingRequestStatus === "pending" ? "Invited" : "On track",
          weakArea: "Placement pending",
          completionRate: "--",
          lastSubmission: "No submissions yet",
          notes: student.pendingRequestStatus === "pending"
            ? "Invitation pending student response."
            : "No insights yet.",
        })),
      );
    } catch {
      setTeacherStudentCatalog([]);
    }
  };
  const matchedStudents = useMemo(
    () => teacherStudentCatalog.filter((student) => student.classId === classId),
    [classId, teacherStudentCatalog],
  );
  const [rosterStudents, setRosterStudents] = useState(() => matchedStudents);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [classMessageText, setClassMessageText] = useState("");
  const [classMessageError, setClassMessageError] = useState("");
  const [isSendingClassMessage, setIsSendingClassMessage] = useState(false);
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
        .filter((student) =>
          student.canInvite !== false &&
          !rosterStudents.some((rosterStudent) => rosterStudent.id === student.id))
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
  const displayClassroom = {
    ...classroom,
    ...classDetails,
  };
  const totalStudentsCount = rosterStudents.length;

  useEffect(() => {
    setRosterStudents(matchedStudents);
  }, [matchedStudents]);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const response = await getTeacherClassOverview(classId);
        const loadedClass = response?.class || {};
        const loadedStudents = Array.isArray(response?.students) ? response.students : [];
        setClassDetails({
          name: String(loadedClass?.name || "Classroom"),
          startTime: String(loadedClass?.startTime || "--:--"),
        });
        setClassEditForm({
          name: String(loadedClass?.name || "Classroom"),
          startTime: String(loadedClass?.startTime || "--:--"),
        });
        setTeacherStudentCatalog(
          loadedStudents.map((student) => ({
            id: student.studentId,
            name: student.fullName,
            email: student.email,
            classId,
            className: String(loadedClass?.name || "Classroom"),
            targetBand: Number.isFinite(Number(student?.latestBand)) ? String(Number(student.latestBand).toFixed(1)) : "TBD",
            currentBand: Number.isFinite(Number(student?.latestBand)) ? String(Number(student.latestBand).toFixed(1)) : "TBD",
            status: "On track",
            weakArea: "Needs analysis",
            completionRate: student.attemptsCount > 0 ? "100%" : "--",
            lastSubmission: student.latestSubmittedAt ? "Recently active" : "No submissions yet",
            notes: "Live progress is now connected to backend attempt data.",
          })),
        );
      } catch {
        setTeacherStudentCatalog([]);
      }
    };
    void loadOverview();
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
    if (!isAddStudentModalOpen && !isInviteModalOpen && !isEditClassModalOpen && !isAnalysisModalOpen && !isMessageModalOpen && !studentPendingRemoval) {
      setStudentSearch("");
      document.body.style.overflow = "";
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAddStudentModalOpen, isEditClassModalOpen, isInviteModalOpen, isAnalysisModalOpen, isMessageModalOpen, studentPendingRemoval]);

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

  const handleOpenEditClassModal = () => {
    setClassEditForm(classDetails);
    setIsEditClassModalOpen(true);
  };

  const handleCloseEditClassModal = () => {
    setClassEditForm(classDetails);
    setIsEditClassModalOpen(false);
  };

  const handleOpenMessageModal = () => {
    setClassMessageText("");
    setClassMessageError("");
    setIsMessageModalOpen(true);
  };

  const handleCloseMessageModal = () => {
    if (isSendingClassMessage) {
      return;
    }
    setIsMessageModalOpen(false);
    setClassMessageError("");
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
    void updateTeacherClass(classroom.id, {
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
    void inviteStudentToTeacherClass(classId, student.id).then(() => {
      setIsAddStudentModalOpen(false);
      void refreshStudentMemberships();
    }).catch(() => {});
  };

  const handleRemoveStudentFromClass = (studentId) => {
    void removeStudentFromTeacherClass(classId, studentId).then(() => {
      setRosterStudents((current) => current.filter((student) => student.id !== studentId));
      void refreshStudentMemberships();
    }).catch(() => {});
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

    const found = teacherStudentCatalog.find((student) => String(student.email || "").toLowerCase() === trimmedEmail.toLowerCase());
    if (!found?.id) {
      return;
    }
    void inviteStudentToTeacherClass(classId, found.id).then(() => {
      resetInviteForm();
      setIsInviteModalOpen(false);
      void refreshStudentMemberships();
    }).catch(() => {});
  };

  const handleSendClassMessage = () => {
    const trimmedMessage = classMessageText.trim();
    if (!trimmedMessage) {
      setClassMessageError("Please write a message.");
      return;
    }

    setClassMessageError("");
    setIsSendingClassMessage(true);
    void sendTeacherClassMessage(classId, trimmedMessage)
      .then(() => {
        setIsMessageModalOpen(false);
        setClassMessageText("");
      })
      .catch((error) => {
        setClassMessageError(String(error?.message || "Could not send message."));
      })
      .finally(() => {
        setIsSendingClassMessage(false);
      });
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

      <MessageClassModal
        className={displayClassroom.name}
        errorText={classMessageError}
        isOpen={isMessageModalOpen}
        isSending={isSendingClassMessage}
        messageText={classMessageText}
        onChangeMessage={(value) => {
          setClassMessageText(value);
          if (classMessageError) {
            setClassMessageError("");
          }
        }}
        onClose={handleCloseMessageModal}
        onSend={handleSendClassMessage}
      />

      {isAnalysisModalOpen ? createPortal(
        <div className="fixed inset-0 z-[9999] min-h-screen bg-slate-950/42 backdrop-blur-[3px]">
          <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
            <div className="w-full max-w-4xl overflow-hidden bg-white shadow-[0_28px_90px_-42px_rgba(15,23,42,0.38)]">
              <div className="flex items-center justify-between border-b border-slate-950 bg-slate-950 px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
                  Analyses
                </p>
                <button
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-white transition-colors duration-200"
                  onClick={() => setIsAnalysisModalOpen(false)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-10">
                <ClassStrengthPanel students={students} />
              </div>
            </div>
          </div>
        </div>,
        document.body,
      ) : null}

      <HeaderPanel
        classroom={displayClassroom}
        onOpenAnalysisModal={() => setIsAnalysisModalOpen(true)}
        onOpenEditModal={handleOpenEditClassModal}
        onOpenMessageModal={handleOpenMessageModal}
        onOpenInviteModal={() => setIsInviteModalOpen(true)}
        totalStudents={totalStudentsCount}
      />

      <section>
        <UnitHomeworkPanel
          classId={classId}
          classroomName={displayClassroom.name}
          onOpenStudent={(student) =>
            navigate(`/teacher/students/${student.id}`, {
              state: { studentData: student },
            })}
          onRemoveStudent={setStudentPendingRemoval}
          onSearchChange={setStudentRosterSearch}
          refreshKey={rosterStudents.length}
          searchValue={studentRosterSearch}
        />
      </section>

    </div>
  );
}

export default TeacherClassOverviewPage;


