import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenText,
  CalendarClock,
  ClipboardList,
  Dice5,
  FileText,
  Headphones,
  PenLine,
  Plus,
  RefreshCw,
  Trash2,
  Users,
} from "lucide-react";
import { PanelShell, SectionTitle, StatCard, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import { DatePickerField, SelectControl, TimePickerField } from "../../components/ui/StyledFormControls";
import { apiRequest } from "../../lib/apiClient";
import { getAllTeacherClasses, resolveTeacherStudentsWithClassIds } from "../../lib/teacherClassStore";
import {
  buildTeacherAssignmentId,
  readTeacherAssignments,
  writeTeacherAssignments,
} from "../../lib/teacherAssignmentStore";

const RESOURCE_KEYS = ["reading", "listening", "writingTask1", "writingTask2"];

const RESOURCE_SECTIONS = [
  {
    key: "reading",
    label: "Reading",
    detail: "Full Reading test",
    icon: BookOpenText,
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "listening",
    label: "Listening",
    detail: "Full Listening test",
    icon: Headphones,
    accent: "bg-blue-50 text-blue-700",
  },
  {
    key: "writingTask1",
    label: "Writing Task 1",
    detail: "Academic report prompt",
    icon: FileText,
    accent: "bg-amber-50 text-amber-700",
  },
  {
    key: "writingTask2",
    label: "Writing Task 2",
    detail: "Essay prompt",
    icon: PenLine,
    accent: "bg-rose-50 text-rose-700",
  },
];

const FALLBACK_RESOURCE_BANK = {
  reading: [
    {
      id: "reading-full-template-1",
      title: "Full Reading Set - Academic Simulation A",
      section: "Reading",
      route: "/student/tests/reading/full",
      source: "Starter resource bank",
      meta: ["Academic", "60 minutes", "40 questions"],
    },
    {
      id: "reading-full-template-2",
      title: "Full Reading Set - Passage Timing Control",
      section: "Reading",
      route: "/student/tests/reading/full",
      source: "Starter resource bank",
      meta: ["Academic", "3 passages", "Full test"],
    },
    {
      id: "reading-full-template-3",
      title: "Full Reading Set - Mixed Question Families",
      section: "Reading",
      route: "/student/tests/reading/full",
      source: "Starter resource bank",
      meta: ["Academic", "Mixed skills", "Full test"],
    },
  ],
  listening: [
    {
      id: "listening-full-template-1",
      title: "Full Listening Set - Four Part Simulation",
      section: "Listening",
      route: "/student/tests/listening/full",
      source: "Starter resource bank",
      meta: ["Academic", "30 minutes", "40 questions"],
    },
    {
      id: "listening-full-template-2",
      title: "Full Listening Set - Detail and Distractor Focus",
      section: "Listening",
      route: "/student/tests/listening/full",
      source: "Starter resource bank",
      meta: ["Academic", "4 parts", "Audio required"],
    },
    {
      id: "listening-full-template-3",
      title: "Full Listening Set - Gap Fill and Matching Mix",
      section: "Listening",
      route: "/student/tests/listening/full",
      source: "Starter resource bank",
      meta: ["Academic", "Mixed tasks", "Full test"],
    },
  ],
  writingTask1: [
    {
      id: "writing-task1-line-graph-1",
      title: "Line Graph - International Student Enrolment",
      section: "Writing Task 1",
      route: "/student/tests/writingTask1",
      source: "Starter resource bank",
      meta: ["Line graph", "20 minutes", "150+ words"],
    },
    {
      id: "writing-task1-process-1",
      title: "Process Diagram - Recycling Plastic Bottles",
      section: "Writing Task 1",
      route: "/student/tests/writingTask1",
      source: "Starter resource bank",
      meta: ["Process diagram", "20 minutes", "150+ words"],
    },
    {
      id: "writing-task1-map-1",
      title: "Map Comparison - Town Centre Redevelopment",
      section: "Writing Task 1",
      route: "/student/tests/writingTask1",
      source: "Starter resource bank",
      meta: ["Maps", "20 minutes", "150+ words"],
    },
    {
      id: "writing-task1-table-1",
      title: "Table - Household Spending by Category",
      section: "Writing Task 1",
      route: "/student/tests/writingTask1",
      source: "Starter resource bank",
      meta: ["Table", "20 minutes", "150+ words"],
    },
  ],
  writingTask2: [
    {
      id: "writing-task2-opinion-template-1",
      title: "Opinion Essay - Public Transport Investment",
      section: "Writing Task 2",
      route: "/student/tests/writingTask2",
      source: "Starter resource bank",
      meta: ["Opinion essay", "40 minutes", "250+ words"],
    },
    {
      id: "writing-task2-discussion-template-1",
      title: "Discussion Essay - Online Learning at University",
      section: "Writing Task 2",
      route: "/student/tests/writingTask2",
      source: "Starter resource bank",
      meta: ["Discussion essay", "40 minutes", "250+ words"],
    },
    {
      id: "writing-task2-problem-template-1",
      title: "Problem/Solution Essay - Urban Traffic",
      section: "Writing Task 2",
      route: "/student/tests/writingTask2",
      source: "Starter resource bank",
      meta: ["Problem and solution", "40 minutes", "250+ words"],
    },
  ],
};

const INITIAL_RESOURCE_STATE = RESOURCE_KEYS.reduce((state, key) => {
  state[key] = {
    items: FALLBACK_RESOURCE_BANK[key],
    isLoading: key !== "writingTask1",
    error: "",
  };
  return state;
}, {});

function toReadableLabel(value) {
  const safe = String(value || "").trim();
  if (!safe) {
    return "Unknown";
  }

  return safe
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function uniqueResourceList(resources) {
  const seenIds = new Set();
  return resources.filter((resource) => {
    const safeId = String(resource?.id || "").trim();
    if (!safeId || seenIds.has(safeId)) {
      return false;
    }

    seenIds.add(safeId);
    return true;
  });
}

function pickRandomResource(items, currentId = "") {
  const candidates = Array.isArray(items) ? items.filter(Boolean) : [];
  if (candidates.length === 0) {
    return null;
  }

  const alternateCandidates = candidates.filter((item) => item.id !== currentId);
  const pool = alternateCandidates.length ? alternateCandidates : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildRandomResourceSelection(resourceState) {
  return RESOURCE_KEYS.reduce((selection, key) => {
    selection[key] = pickRandomResource(resourceState[key]?.items || []);
    return selection;
  }, {});
}

function countReadingQuestions(test) {
  const passages = Array.isArray(test?.passages) ? test.passages : [];
  const questionsFromRanges = passages.reduce((sum, passage) => {
    const start = Number(passage?.questionRange?.start);
    const end = Number(passage?.questionRange?.end);
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return sum + (end - start + 1);
    }

    return sum;
  }, 0);

  if (questionsFromRanges > 0) {
    return questionsFromRanges;
  }

  return passages.reduce(
    (sum, passage) =>
      sum + (Array.isArray(passage?.blocks)
        ? passage.blocks.reduce((blockSum, block) => blockSum + (Array.isArray(block?.questions) ? block.questions.length : 0), 0)
        : 0),
    0,
  );
}

function normalizeReadingResources(response) {
  const tests = Array.isArray(response?.tests) ? response.tests : [];

  return uniqueResourceList(
    tests.map((test) => {
      const id = String(test?._id || "").trim();
      const passages = Array.isArray(test?.passages) ? test.passages : [];
      const questionCount = Number(test?.totalQuestions) || countReadingQuestions(test);

      return {
        id,
        title: String(test?.title || id || "Full reading test").trim(),
        section: "Reading",
        route: `/student/tests/reading/full/${encodeURIComponent(id)}`,
        source: "Published reading tests",
        meta: [
          toReadableLabel(test?.module || "academic"),
          `${questionCount || 40} questions`,
          `${passages.length || 3} passages`,
        ],
      };
    }),
  );
}

function normalizeListeningResources(response) {
  const tests = Array.isArray(response?.tests) ? response.tests : [];

  return uniqueResourceList(
    tests.map((test) => {
      const id = String(test?._id || "").trim();

      return {
        id,
        title: String(test?.title || id || "Full listening test").trim(),
        section: "Listening",
        route: `/student/tests/listening/full/${encodeURIComponent(id)}`,
        source: "Published listening tests",
        meta: [
          toReadableLabel(test?.module || "academic"),
          `${Number(test?.totalQuestions) || 40} questions`,
          `${Number(test?.partsCount) || 4} parts`,
        ],
      };
    }),
  );
}

function normalizeWritingTask2Resources(response) {
  const prompts = Array.isArray(response?.prompts) ? response.prompts : [];

  return uniqueResourceList(
    prompts.map((prompt) => {
      const id = String(prompt?.essayId || "").trim();
      const subText = Array.isArray(prompt?.subText) ? prompt.subText : [];

      return {
        id,
        title: String(prompt?.prompt || id || "Writing Task 2 prompt").trim(),
        section: "Writing Task 2",
        route: `/student/tests/writingTask2-opinion/start?set=${encodeURIComponent(id)}`,
        source: "Published Task 2 prompts",
        meta: subText.length ? subText.map((item) => String(item || "").trim()).filter(Boolean) : ["Essay prompt", "40 minutes"],
      };
    }),
  );
}

function resolveLoadedResourceState(result, fallbackItems, normalize, fallbackMessage) {
  if (result.status !== "fulfilled") {
    return {
      items: fallbackItems,
      isLoading: false,
      error: fallbackMessage,
    };
  }

  const loadedItems = normalize(result.value);
  if (!loadedItems.length) {
    return {
      items: fallbackItems,
      isLoading: false,
      error: "No published resources were found. Starter resources are available.",
    };
  }

  return {
    items: loadedItems,
    isLoading: false,
    error: "",
  };
}

function getDefaultTargetId(targetType, classes, students) {
  if (targetType === "class") {
    return classes[0]?.id || "";
  }

  if (targetType === "student") {
    return students[0]?.id || "";
  }

  return "all";
}

function resolveAssignmentTarget(form, classes, students) {
  if (form.targetType === "all") {
    return {
      label: "All active students",
      recipientCount: students.length,
    };
  }

  if (form.targetType === "student") {
    const student = students.find((item) => item.id === form.targetId);
    return {
      label: student?.name || "Selected student",
      recipientCount: student ? 1 : 0,
    };
  }

  const classroom = classes.find((item) => item.id === form.targetId);
  const studentCount = students.filter((student) => student.classId === form.targetId).length;

  return {
    label: classroom?.name || "Selected class",
    recipientCount: studentCount,
  };
}

function getAssignmentDueDate(assignment) {
  if (!assignment?.dueDate) {
    return null;
  }

  const dueDate = new Date(`${assignment.dueDate}T${assignment.dueTime || "23:59"}`);
  return Number.isNaN(dueDate.getTime()) ? null : dueDate;
}

function getAssignmentStatus(assignment) {
  const dueDate = getAssignmentDueDate(assignment);
  if (!dueDate) {
    return { label: "Scheduled", tone: "blue" };
  }

  const now = new Date();
  if (dueDate.getTime() < now.getTime()) {
    return { label: "Overdue", tone: "rose" };
  }

  const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue <= 36) {
    return { label: "Due soon", tone: "amber" };
  }

  return { label: "Active", tone: "emerald" };
}

function formatDueLabel(assignment) {
  const dueDate = getAssignmentDueDate(assignment);
  if (!dueDate) {
    return "No due date";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dueDate);
}

function ResourcePicker({
  config,
  error,
  isLoading,
  onRandomize,
  onSelect,
  resources,
  selectedResource,
}) {
  const Icon = config.icon;

  return (
    <article className="border border-slate-200/80 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${config.accent}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">{config.label}</p>
          <p className="mt-1 text-xs text-slate-500">{config.detail}</p>
        </div>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition-colors duration-200 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!resources.length}
          onClick={onRandomize}
          title={`Choose random ${config.label}`}
          type="button"
        >
          <Dice5 className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-4 block space-y-2 text-sm text-slate-600">
        <span className="mb-1 block font-medium text-slate-900">Selected resource</span>
        <SelectControl
          className="px-3 py-2.5 pr-12 text-sm"
          disabled={!resources.length}
          onChange={(event) => onSelect(event.target.value)}
          value={selectedResource?.id || ""}
        >
          <option value="">No resource available</option>
          {resources.map((resource) => (
            <option key={resource.id} value={resource.id}>
              {resource.title}
            </option>
          ))}
        </SelectControl>
      </label>

      {isLoading ? <p className="mt-3 text-xs text-slate-500">Loading published resources...</p> : null}
      {error ? <p className="mt-3 text-xs leading-5 text-amber-700">{error}</p> : null}
    </article>
  );
}

function TeacherAssignmentsPage() {
  const [classes] = useState(() => getAllTeacherClasses());
  const [students] = useState(() => resolveTeacherStudentsWithClassIds());
  const managedStudents = useMemo(() => students.filter((student) => student.classId), [students]);
  const [assignments, setAssignments] = useState(() => readTeacherAssignments());
  const [resourceState, setResourceState] = useState(() => ({ ...INITIAL_RESOURCE_STATE }));
  const [selectedResources, setSelectedResources] = useState(() => buildRandomResourceSelection(INITIAL_RESOURCE_STATE));
  const [notice, setNotice] = useState("");
  const noticeTimerRef = useRef(null);
  const [form, setForm] = useState(() => ({
    title: "Full IELTS assignment",
    targetType: "class",
    targetId: getDefaultTargetId("class", getAllTeacherClasses(), resolveTeacherStudentsWithClassIds().filter((student) => student.classId)),
    dueDate: "",
    dueTime: "20:00",
    instructions:
      "Complete Reading, Listening, Writing Task 1, and Writing Task 2. Keep exam timing and submit writing for teacher review.",
    reviewMode: "Manual writing review",
  }));

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadResources() {
      setResourceState((current) => ({
        ...current,
        reading: { ...current.reading, isLoading: true, error: "" },
        listening: { ...current.listening, isLoading: true, error: "" },
        writingTask2: { ...current.writingTask2, isLoading: true, error: "" },
      }));

      const [readingResult, listeningResult, writingTask2Result] = await Promise.allSettled([
        apiRequest("/reading/full-tests?status=published", { auth: false }),
        apiRequest("/listening-tests?status=published&limit=100", { auth: false }),
        apiRequest("/writing-task2-opinion?page=1&limit=50", { auth: false }),
      ]);

      if (!isMounted) {
        return;
      }

      setResourceState({
        reading: resolveLoadedResourceState(
          readingResult,
          FALLBACK_RESOURCE_BANK.reading,
          normalizeReadingResources,
          "Could not load published reading tests. Starter resources are available.",
        ),
        listening: resolveLoadedResourceState(
          listeningResult,
          FALLBACK_RESOURCE_BANK.listening,
          normalizeListeningResources,
          "Could not load published listening tests. Starter resources are available.",
        ),
        writingTask1: {
          items: FALLBACK_RESOURCE_BANK.writingTask1,
          isLoading: false,
          error: "",
        },
        writingTask2: resolveLoadedResourceState(
          writingTask2Result,
          FALLBACK_RESOURCE_BANK.writingTask2,
          normalizeWritingTask2Resources,
          "Could not load published Task 2 prompts. Starter resources are available.",
        ),
      });
    }

    loadResources();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedResources((current) => {
        let hasChanged = false;
        const nextSelection = { ...current };

        RESOURCE_KEYS.forEach((key) => {
          const resources = resourceState[key]?.items || [];
          const selectedId = current[key]?.id;
          const freshSelectedResource = resources.find((resource) => resource.id === selectedId);

          if (freshSelectedResource) {
            if (freshSelectedResource !== current[key]) {
              nextSelection[key] = freshSelectedResource;
              hasChanged = true;
            }
            return;
          }

          nextSelection[key] = pickRandomResource(resources);
          hasChanged = true;
        });

        return hasChanged ? nextSelection : current;
      });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [resourceState]);

  const target = useMemo(
    () => resolveAssignmentTarget(form, classes, managedStudents),
    [classes, form, managedStudents],
  );

  const selectedResourceCount = RESOURCE_KEYS.filter((key) => selectedResources[key]).length;
  const canCreateAssignment =
    form.title.trim() &&
    form.dueDate &&
    form.dueTime &&
    target.recipientCount > 0 &&
    selectedResourceCount === RESOURCE_KEYS.length;
  const dueSoonCount = assignments.filter((assignment) => getAssignmentStatus(assignment).label === "Due soon").length;
  const totalRecipientsAssigned = assignments.reduce((sum, assignment) => sum + Number(assignment.recipientCount || 0), 0);

  const showNotice = (message) => {
    setNotice(message);

    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
    }, 2200);
  };

  const updateFormValue = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleTargetTypeChange = (targetType) => {
    setForm((current) => ({
      ...current,
      targetType,
      targetId: getDefaultTargetId(targetType, classes, managedStudents),
    }));
  };

  const handleSelectResource = (key, resourceId) => {
    const resource = (resourceState[key]?.items || []).find((item) => item.id === resourceId) || null;
    setSelectedResources((current) => ({
      ...current,
      [key]: resource,
    }));
  };

  const handleRandomizeResource = (key) => {
    setSelectedResources((current) => ({
      ...current,
      [key]: pickRandomResource(resourceState[key]?.items || [], current[key]?.id),
    }));
  };

  const handleRandomizeAllResources = () => {
    setSelectedResources((current) =>
      RESOURCE_KEYS.reduce((selection, key) => {
        selection[key] = pickRandomResource(resourceState[key]?.items || [], current[key]?.id);
        return selection;
      }, {}),
    );
    showNotice("Resources randomized");
  };

  const handleCreateAssignment = (event) => {
    event.preventDefault();

    if (!canCreateAssignment) {
      return;
    }

    const newAssignment = {
      id: buildTeacherAssignmentId(),
      title: form.title.trim(),
      targetType: form.targetType,
      targetId: form.targetId,
      targetLabel: target.label,
      dueDate: form.dueDate,
      dueTime: form.dueTime,
      instructions: form.instructions.trim(),
      reviewMode: form.reviewMode,
      recipientCount: target.recipientCount,
      createdAt: new Date().toISOString(),
      resources: {
        reading: selectedResources.reading,
        listening: selectedResources.listening,
        writingTask1: selectedResources.writingTask1,
        writingTask2: selectedResources.writingTask2,
      },
    };

    setAssignments((current) => {
      const nextAssignments = [newAssignment, ...current];
      writeTeacherAssignments(nextAssignments);
      return nextAssignments;
    });
    setForm((current) => ({
      ...current,
      title: "Full IELTS assignment",
      dueDate: "",
    }));
    handleRandomizeAllResources();
    showNotice("Assignment created");
  };

  const handleDeleteAssignment = (assignmentId) => {
    setAssignments((current) => {
      const nextAssignments = current.filter((assignment) => assignment.id !== assignmentId);
      writeTeacherAssignments(nextAssignments);
      return nextAssignments;
    });
    showNotice("Assignment removed");
  };

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="fixed right-6 top-24 z-[60] rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.35)]">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Active assignments" value={String(assignments.length)} helper="Created by this teacher" tone="emerald" />
        <StatCard label="Due soon" value={String(dueSoonCount)} helper="Deadline inside 36 hours" tone="amber" />
        <StatCard label="Student deliveries" value={String(totalRecipientsAssigned)} helper="Total assigned seats" tone="blue" />
      </div>

      <form className="space-y-6" onSubmit={handleCreateAssignment}>
        <div className="px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Assignment setup
          </p>
        </div>
        <PanelShell className="overflow-visible">
          <SectionTitle
            action={
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-emerald-300 hover:text-emerald-700"
                onClick={handleRandomizeAllResources}
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
                Randomize all
              </button>
            }
            title="Build a full IELTS Test"
          />

          <div className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
                <span className="mb-1 block font-semibold text-slate-900">Assignment title</span>
                <input
                  className="w-full border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                  onChange={(event) => updateFormValue("title", event.target.value)}
                  placeholder="Full IELTS assignment"
                  type="text"
                  value={form.title}
                />
              </label>

              <label className="space-y-2 text-sm text-slate-600">
                <span className="mb-1 block font-semibold text-slate-900">Delivery target</span>
                <SelectControl
                  className="px-4 py-3 pr-12"
                  onChange={(event) => handleTargetTypeChange(event.target.value)}
                  value={form.targetType}
                >
                  <option value="class">Selected class</option>
                  <option value="student">Individual student</option>
                  <option value="all">All active students</option>
                </SelectControl>
              </label>

              {form.targetType === "class" ? (
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="mb-1 block font-semibold text-slate-900">Class</span>
                  <SelectControl
                    className="px-4 py-3 pr-12"
                    onChange={(event) => updateFormValue("targetId", event.target.value)}
                    value={form.targetId}
                  >
                    {classes.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </SelectControl>
                </label>
              ) : null}

              {form.targetType === "student" ? (
                <label className="space-y-2 text-sm text-slate-600">
                  <span className="mb-1 block font-semibold text-slate-900">Student</span>
                  <SelectControl
                    className="px-4 py-3 pr-12"
                    onChange={(event) => updateFormValue("targetId", event.target.value)}
                    value={form.targetId}
                  >
                    {managedStudents.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </SelectControl>
                </label>
              ) : null}

              {form.targetType === "all" ? (
                <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Target</span>
                  <p className="mt-1">All students assigned to this teacher</p>
                </div>
              ) : null}

              <label className="space-y-2 text-sm text-slate-600">
                <span className="mb-1 block font-semibold text-slate-900">Due date</span>
                <DatePickerField
                  className=""
                  onChange={(event) => updateFormValue("dueDate", event.target.value)}
                  value={form.dueDate}
                />
              </label>

              <label className="space-y-2 text-sm text-slate-600">
                <span className="mb-1 block font-semibold text-slate-900">Due time</span>
                <TimePickerField
                  className=""
                  onChange={(event) => updateFormValue("dueTime", event.target.value)}
                  value={form.dueTime}
                />
              </label>
            </div>

            <label className="block space-y-2 text-sm text-slate-600">
              <span className="mb-1 block font-semibold text-slate-900">Student instructions</span>
              <textarea
                className="min-h-32 w-full resize-none border border-slate-200 bg-white px-4 py-3 leading-7 text-slate-900 outline-none transition-colors duration-200 placeholder:text-slate-400 focus:border-emerald-300"
                onChange={(event) => updateFormValue("instructions", event.target.value)}
                value={form.instructions}
              />
            </label>
          </div>
        </PanelShell>

        <div className="px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Resource selection
          </p>
        </div>
        <PanelShell className="overflow-visible">
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {RESOURCE_SECTIONS.map((config) => (
              <ResourcePicker
                config={config}
                error={resourceState[config.key]?.error || ""}
                isLoading={Boolean(resourceState[config.key]?.isLoading)}
                key={config.key}
                onRandomize={() => handleRandomizeResource(config.key)}
                onSelect={(resourceId) => handleSelectResource(config.key, resourceId)}
                resources={resourceState[config.key]?.items || []}
                selectedResource={selectedResources[config.key]}
              />
            ))}
          </div>
        </PanelShell>

        <div className="px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Review and publish
          </p>
        </div>
        <PanelShell className="overflow-visible">
          <div className="space-y-4 p-5">
            <label className="block space-y-2 text-sm text-slate-600">
              <span className="mb-1 block font-semibold text-slate-900">Review mode</span>
              <SelectControl
                className="px-4 py-3 pr-12"
                onChange={(event) => updateFormValue("reviewMode", event.target.value)}
                value={form.reviewMode}
              >
                <option value="Manual writing review">Manual writing review</option>
                <option value="Auto score objective sections, manual writing">Auto score objective sections, manual writing</option>
                <option value="Practice only">Practice only</option>
              </SelectControl>
            </label>

            <div className="border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Assignment summary
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {target.label} / {target.recipientCount} {target.recipientCount === 1 ? "student" : "students"}
                  </p>
                </div>
                <StatusBadge tone={canCreateAssignment ? "emerald" : "amber"}>
                  {selectedResourceCount}/4 resources
                </StatusBadge>
              </div>

              <button
                className="emerald-gradient-fill mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!canCreateAssignment}
                type="submit"
              >
                <Plus className="h-4 w-4" />
                Create full assignment
              </button>
            </div>
          </div>
        </PanelShell>
      </form>

      <PanelShell>
        <SectionTitle
          copy="Assignments created here stay visible for the teacher and can be used as the operational queue for follow-up."
          eyebrow="Assignments management"
          title="Created full assignments"
        />
        <div className="grid gap-4 p-5">
          {assignments.map((assignment) => {
            const status = getAssignmentStatus(assignment);
            const assignmentResources = RESOURCE_SECTIONS.map((config) => ({
              config,
              resource: assignment.resources?.[config.key],
            }));

            return (
              <article
                className="border border-slate-200/80 bg-white p-5 transition-colors duration-200 hover:bg-slate-50"
                key={assignment.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-slate-950">{assignment.title}</p>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        {assignment.targetLabel} / {assignment.recipientCount} students
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        Due {formatDueLabel(assignment)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-slate-400" />
                        {assignment.reviewMode}
                      </span>
                    </div>
                    {assignment.instructions ? (
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{assignment.instructions}</p>
                    ) : null}
                  </div>

                  <button
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => handleDeleteAssignment(assignment.id)}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {assignmentResources.map(({ config, resource }) => {
                    const Icon = config.icon;

                    return (
                      <div className="border border-slate-200 bg-white p-4" key={`${assignment.id}-${config.key}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-slate-500" />
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {config.label}
                          </p>
                        </div>
                        <p className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950">
                          {resource?.title || "Missing resource"}
                        </p>
                        {resource?.route ? (
                          <Link
                            className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 hover:text-emerald-900"
                            to={resource.route}
                          >
                            Open resource
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}

          {assignments.length === 0 ? (
            <div className="border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-slate-900">No full assignments created yet.</p>
              <p className="mt-2 text-sm text-slate-600">
                Randomize the resources above, set a due date, and create the first assignment.
              </p>
            </div>
          ) : null}
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherAssignmentsPage;
