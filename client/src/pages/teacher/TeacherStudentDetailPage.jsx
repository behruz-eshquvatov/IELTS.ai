import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronDown } from "lucide-react";
import { PanelShell, SectionTitle } from "../../components/teacher/TeacherPanelPrimitives";
import { teacherStudents } from "../../data/teacherPanel";

const performanceFilterOptions = ["Listening", "Reading", "Writing Task 1", "Writing Task 2"];
const blueCohortProfileScoreMap = {
  "amina-n": { score: 7.0, previousWeekScore: 6.5 },
  "diyor-r": { score: 5.5, previousWeekScore: 6.0 },
  "kamola-y": { score: 6.5, previousWeekScore: 6.0 },
  "behruz-t": { score: 7.5, previousWeekScore: 8.0 },
  "nilufar-m": { score: 7.0, previousWeekScore: 7.0 },
  "shahzod-u": { score: 6.0, previousWeekScore: 6.0 },
};

function getClassStudentIndex(student) {
  return teacherStudents
    .filter((item) => item.className === student.className)
    .findIndex((item) => item.id === student.id);
}

function snapBandScore(value) {
  return Math.round(value * 2) / 2;
}

function getStudentScoreMetrics(student) {
  const routedScore = Number.isFinite(student.score) ? snapBandScore(student.score) : null;
  const routedPreviousWeekScore = Number.isFinite(student.previousWeekScore)
    ? snapBandScore(student.previousWeekScore)
    : null;

  if (routedScore !== null && routedPreviousWeekScore !== null) {
    const trendDelta = snapBandScore(routedScore - routedPreviousWeekScore);

    return {
      averageScore: routedScore,
      previousAverageScore: routedPreviousWeekScore,
      direction: trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat",
    };
  }

  const blueCohortScore = blueCohortProfileScoreMap[student.id];

  if (blueCohortScore) {
    const averageScore = snapBandScore(blueCohortScore.score);
    const previousAverageScore = snapBandScore(blueCohortScore.previousWeekScore);
    const trendDelta = snapBandScore(averageScore - previousAverageScore);

    return {
      averageScore,
      previousAverageScore,
      direction: trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat",
    };
  }

  const parsedAverageScore = Number.parseFloat(
    student.currentBand ?? student.band ?? student.score,
  );
  const averageScore = Number.isFinite(parsedAverageScore) ? snapBandScore(parsedAverageScore) : null;
  const classStudentIndex = Math.max(0, getClassStudentIndex(student));
  const seededPreviousWeekDelta = [0.5, -0.5, 0.5, -0.5, 0.0][classStudentIndex % 5];
  const previousAverageScore = averageScore !== null
    ? snapBandScore(averageScore - seededPreviousWeekDelta)
    : null;
  const trendDelta = averageScore !== null && previousAverageScore !== null
    ? snapBandScore(averageScore - previousAverageScore)
    : 0;

  return {
    averageScore,
    previousAverageScore,
    direction: trendDelta > 0 ? "up" : trendDelta < 0 ? "down" : "flat",
  };
}

function getStudentSeed(student) {
  return Array.from(student.id).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function isListeningRelated(content) {
  return (
    content.includes("listening") ||
    content.includes("multiple choice") ||
    content.includes("map") ||
    content.includes("note") ||
    content.includes("distractor") ||
    content.includes("form")
  );
}

function isReadingRelated(content) {
  return (
    content.includes("reading") ||
    content.includes("inference") ||
    content.includes("headings") ||
    content.includes("detail") ||
    content.includes("true-false") ||
    content.includes("timing") ||
    content.includes("pacing")
  );
}

function isWritingTask1Related(content) {
  return (
    content.includes("task 1") ||
    content.includes("overview") ||
    content.includes("report") ||
    content.includes("graph") ||
    content.includes("chart")
  );
}

function isWritingTask2Related(content) {
  return (
    content.includes("task 2") ||
    content.includes("essay") ||
    content.includes("cohesion") ||
    content.includes("conclusion") ||
    content.includes("argument")
  );
}

function toTitleCase(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildStudentEmail(student) {
  if (student.email) {
    return student.email;
  }

  return `${student.name.toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z.]/g, "")}@ieltsai.app`;
}

function getPerformanceTaskLabels(student) {
  const weakArea = (student.weakArea ?? "").toLowerCase();

  if (
    weakArea.includes("listening") ||
    weakArea.includes("map") ||
    weakArea.includes("note") ||
    weakArea.includes("form") ||
    weakArea.includes("sentence")
  ) {
    return ["Listening practice set", "Listening correction drill"];
  }

  if (
    weakArea.includes("reading") ||
    weakArea.includes("headings") ||
    weakArea.includes("detail") ||
    weakArea.includes("inference") ||
    weakArea.includes("true-false")
  ) {
    return ["Reading practice set", "Reading question drill"];
  }

  if (
    weakArea.includes("writing") ||
    weakArea.includes("essay") ||
    weakArea.includes("task") ||
    weakArea.includes("cohesion") ||
    weakArea.includes("coherence")
  ) {
    return ["Grammar accuracy drill", "Sentence structure set"];
  }

  return ["Skill practice set", "Progress check"];
}

function getRelativeSubmissionTime(student) {
  const match = student.lastSubmission?.match(/-\s*(.+)$/);
  return match?.[1] ?? "recently";
}

const aminaTestTypeProfiles = {
  Listening: {
    snapshotItems: [
      { label: "Weak Area", value: "Multiple Choice" },
      { label: "Accuracy", value: "52%" },
      { label: "Common Errors", value: "numbers, fast listening" },
      { label: "Last Review", value: "Listening section 2" },
    ],
    recommendations: [
      "AI suggests more listening work on distractor recognition before the final option is selected.",
      "The next priority is catching numbers and dates accurately when the audio speed increases.",
      "The student should delay answer commitment and listen through the full option set first.",
    ],
  },
  Reading: {
    snapshotItems: [
      { label: "Weak Area", value: "Inference Questions" },
      { label: "Accuracy", value: "61%" },
      { label: "Common Errors", value: "trap options, rushed scanning" },
      { label: "Last Review", value: "Passage 3 timed set" },
    ],
    recommendations: [
      "AI suggests targeted reading work on inference questions backed by exact line evidence.",
      "The student should improve pace control so accuracy stays stable in the final passage.",
      "The next focus is rejecting answer choices that sound logical but are not fully supported by the text.",
    ],
  },
  "Writing Task 1": {
    snapshotItems: [
      { label: "Weak Area", value: "Overview Control" },
      { label: "Estimated Band", value: "6.0" },
      { label: "Common Errors", value: "missed comparisons, unclear overview" },
      { label: "Last Review", value: "Line graph report" },
    ],
    recommendations: [
      "AI suggests improving overview sentences so the main trends are clear before supporting details appear.",
      "The next priority is selecting and grouping key features instead of listing data mechanically.",
      "The student should practice comparison language to make score movement and contrast more precise.",
    ],
  },
  "Writing Task 2": {
    snapshotItems: [
      { label: "Weak Area", value: "Cohesion" },
      { label: "Estimated Band", value: "6.5" },
      { label: "Common Errors", value: "thin support, repetitive linking" },
      { label: "Last Review", value: "Opinion essay draft" },
    ],
    recommendations: [
      "AI suggests improving paragraph cohesion so each idea develops more clearly from claim to support.",
      "The next priority is deeper explanation after each main point instead of moving on too quickly.",
      "The student should review linking and referencing so transitions feel natural rather than repeated.",
    ],
  },
};

function getDefaultTestType(student) {
  const content = `${student.weakArea ?? ""} ${student.notes ?? ""}`.toLowerCase();

  if (isListeningRelated(content)) {
    return "Listening";
  }

  if (isReadingRelated(content)) {
    return "Reading";
  }

  if (isWritingTask1Related(content)) {
    return "Writing Task 1";
  }

  if (isWritingTask2Related(content)) {
    return "Writing Task 2";
  }

  return "Listening";
}

function getStudentTestTypeProfile(student, selectedTestType) {
  if (student.id === "amina-n" && aminaTestTypeProfiles[selectedTestType]) {
    return aminaTestTypeProfiles[selectedTestType];
  }

  const seed = getStudentSeed(student);
  const weakArea = student.weakArea ?? "priority review";
  const weakAreaLower = weakArea.toLowerCase();
  const currentBand = Number.parseFloat(student.currentBand ?? student.band ?? student.score);
  const safeBand = Number.isFinite(currentBand) ? snapBandScore(currentBand) : null;

  if (selectedTestType === "Listening") {
    const focusArea = isListeningRelated(weakAreaLower)
      ? toTitleCase(weakArea)
      : ["Distractor control", "Note completion", "Section 3 detail", "Map labeling"][seed % 4];
    const accuracy = 50 + (seed % 18);

    return {
      snapshotItems: [
        { label: "Weak Area", value: focusArea },
        { label: "Accuracy", value: `${accuracy}%` },
        { label: "Common Errors", value: "fast audio, distractors" },
        { label: "Last Review", value: "Listening timed drill" },
      ],
      recommendations: [
        `AI suggests focused listening work on ${focusArea.toLowerCase()} before answer selection is locked.`,
        "The next priority is catching key details accurately when the speaker pace increases.",
        "The student should repeat short listening sets with immediate correction after every mistake cluster.",
      ],
    };
  }

  if (selectedTestType === "Reading") {
    const focusArea = isReadingRelated(weakAreaLower)
      ? toTitleCase(weakArea)
      : ["Inference questions", "Matching headings", "Pace control", "Detail matching"][seed % 4];
    const accuracy = 56 + (seed % 16);

    return {
      snapshotItems: [
        { label: "Weak Area", value: focusArea },
        { label: "Accuracy", value: `${accuracy}%` },
        { label: "Common Errors", value: "trap options, rushed scanning" },
        { label: "Last Review", value: "Passage timing review" },
      ],
      recommendations: [
        `AI suggests improving reading control on ${focusArea.toLowerCase()} with exact text evidence.`,
        "The next priority is keeping accuracy stable in the final passage under time pressure.",
        "The student should review why near-correct answers fail so elimination gets sharper.",
      ],
    };
  }

  if (selectedTestType === "Writing Task 1") {
    const focusArea = isWritingTask1Related(weakAreaLower)
      ? toTitleCase(weakArea)
      : ["Overview control", "Key feature selection", "Comparison language", "Trend grouping"][seed % 4];
    const estimatedBand = safeBand !== null ? snapBandScore(Math.max(5.0, safeBand - 0.5)) : null;

    return {
      snapshotItems: [
        { label: "Weak Area", value: focusArea },
        { label: "Estimated Band", value: estimatedBand?.toFixed(1) ?? "TBD" },
        { label: "Common Errors", value: "weak overview, missed comparisons" },
        { label: "Last Review", value: "Academic report draft" },
      ],
      recommendations: [
        "AI suggests stronger overview writing before supporting data points are introduced.",
        "The next priority is choosing and grouping the most important features instead of listing everything.",
        "The student should practice comparison phrases so trend changes sound precise and controlled.",
      ],
    };
  }

  const focusArea = isWritingTask2Related(weakAreaLower)
    ? toTitleCase(weakArea)
    : ["Cohesion", "Idea support", "Conclusion strength", "Argument balance"][seed % 4];
  const estimatedBand = safeBand !== null ? safeBand.toFixed(1) : "TBD";

  return {
    snapshotItems: [
      { label: "Weak Area", value: focusArea },
      { label: "Estimated Band", value: estimatedBand },
      { label: "Common Errors", value: "thin support, repetitive linking" },
      { label: "Last Review", value: "Essay structure review" },
    ],
    recommendations: [
      `AI suggests improving ${focusArea.toLowerCase()} so arguments develop more clearly from point to support.`,
      "The next priority is adding deeper explanation after each main claim instead of moving on too early.",
      "The student should review model essays to strengthen flow and reduce repeated linking language.",
    ],
  };
}

function getGeneratedPerformanceHistory(student) {
  const seed = Array.from(student.id).reduce((total, char) => total + char.charCodeAt(0), 0);
  const [primaryTask, secondaryTask] = getPerformanceTaskLabels(student);
  const historyTemplates = [
    { label: "Full mock test", total: null, detail: "Completed this week" },
    { label: primaryTask, total: 15, detail: `Completed ${getRelativeSubmissionTime(student)}` },
    { label: secondaryTask, total: 12, detail: "Completed 1d ago" },
    { label: "Section speed drill", total: 10, detail: "Completed 2d ago" },
    { label: "Mistake review set", total: 14, detail: "Completed 3d ago" },
    { label: "Target score checkpoint", total: 20, detail: "Completed 4d ago" },
    { label: `${primaryTask} retake`, total: 15, detail: "Completed 5d ago" },
    { label: "Vocabulary reinforcement", total: 18, detail: "Completed 6d ago" },
    { label: "Teacher assigned quiz", total: 12, detail: "Completed 1w ago" },
    { label: "Weekly progress review", total: 16, detail: "Completed 8d ago" },
  ];

  return historyTemplates.map((item, index) => {
    if (item.total === null) {
      return {
        label: item.label,
        value: `${student.currentBand ?? student.band ?? student.score ?? "TBD"} overall`,
        detail: item.detail,
      };
    }

    const minCorrect = Math.max(4, Math.floor(item.total * 0.45));
    const maxCorrect = Math.max(minCorrect, item.total - 1);
    const correct = minCorrect + ((seed + index * 3) % (maxCorrect - minCorrect + 1));

    return {
      label: item.label,
      value: `${correct}/${item.total}`,
      detail: item.detail,
    };
  });
}

const performanceHistoryOverrides = {
  "amina-n": [
    {
      label: "Full mock test",
      value: "6.5 overall",
      detail: "Completed this week",
    },
    {
      label: "Listening multiple choice set",
      value: "8/15",
      detail: "Completed 8h ago",
    },
    {
      label: "Fast listening numbers drill",
      value: "6/12",
      detail: "Completed 1d ago",
    },
    {
      label: "Section 2 note completion",
      value: "9/14",
      detail: "Completed 2d ago",
    },
    {
      label: "Map labeling sprint",
      value: "7/10",
      detail: "Completed 3d ago",
    },
    {
      label: "Distractor recognition set",
      value: "11/16",
      detail: "Completed 4d ago",
    },
    {
      label: "Fast speaker shadow drill",
      value: "8/12",
      detail: "Completed 5d ago",
    },
    {
      label: "Section 3 multiple choice retake",
      value: "10/15",
      detail: "Completed 6d ago",
    },
    {
      label: "Number trap correction set",
      value: "9/13",
      detail: "Completed 1w ago",
    },
    {
      label: "Teacher assigned listening quiz",
      value: "8/12",
      detail: "Completed 8d ago",
    },
  ],
};

function TeacherStudentDetailPage() {
  const location = useLocation();
  const { studentId } = useParams();
  const routedStudent = location.state?.studentData;
  const student = routedStudent ?? teacherStudents.find((item) => item.id === studentId) ?? teacherStudents[0];
  const [selectedTestType, setSelectedTestType] = useState(() => getDefaultTestType(student));
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);
  const studentEmail = buildStudentEmail(student);
  const scoreMetrics = getStudentScoreMetrics(student);
  const studentPerformanceHistory = performanceHistoryOverrides[student.id] ?? getGeneratedPerformanceHistory(student);
  const studentTestTypeProfile = getStudentTestTypeProfile(student, selectedTestType);
  const studentRecommendations = studentTestTypeProfile.recommendations;
  const studentInfoPanel = {
    eyebrow: "Info",
    title: "Performance snapshot",
    items: studentTestTypeProfile.snapshotItems,
  };

  useEffect(() => {
    if (!isFilterOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isFilterOpen]);

  useEffect(() => {
    setSelectedTestType(getDefaultTestType(student));
    setIsFilterOpen(false);
  }, [student.id]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
          Student detail
        </p>
      </div>

      <section className="border border-slate-200/80 bg-white p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {student.name}
            </h2>
            <p className="text-sm font-medium text-slate-500">
              {studentEmail}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <div className="border border-slate-200/80 bg-white px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Previous week avg
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {scoreMetrics.previousAverageScore?.toFixed(1) ?? "TBD"}
              </p>
            </div>

            <div className="flex items-center justify-center px-2">
              <div className="flex items-center justify-center">
                {scoreMetrics.direction === "up" ? (
                  <ArrowUpRight className="h-8 w-8 text-emerald-400" />
                ) : scoreMetrics.direction === "down" ? (
                  <ArrowDownRight className="h-8 w-8 text-rose-700" />
                ) : (
                  <ArrowRight className="h-8 w-8 text-slate-700" />
                )}
              </div>
            </div>

            <div className="border border-slate-200/80 bg-white px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Current score
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                {scoreMetrics.averageScore?.toFixed(1) ?? "TBD"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="flex h-full flex-col gap-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Performance history
          </p>
          <PanelShell className="flex h-[30rem] flex-col">
            <SectionTitle
              title="Task history"
              className="h-[5rem] !py-0 border-b-slate-950 bg-slate-950 sm:!items-center sm:!justify-between"
              titleClassName="text-white"
            />
            <div className="max-h-[30rem] flex-1 space-y-3 overflow-y-auto px-5 pt-5">
              {studentPerformanceHistory.map((item) => (
                <div
                  className="min-h-[5rem] border border-slate-200/80 bg-white p-4 transition-colors duration-200 hover:bg-slate-50"
                  key={item.label}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </PanelShell>
        </div>

        <div className="flex h-full flex-col gap-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {studentInfoPanel.eyebrow}
          </p>
          <PanelShell className="flex h-[30rem] flex-col">
            <SectionTitle
              title={studentInfoPanel.title}
              copy={studentInfoPanel.copy}
              className="h-[5rem] !py-0 border-b-slate-950 bg-slate-950 sm:!items-center sm:!justify-between"
              titleClassName="text-white"
              copyClassName="text-slate-300"
              action={(
                <div className="relative" ref={filterRef}>
                  <button
                    className="inline-flex min-w-[13rem] items-center justify-between gap-4 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-950 transition-colors"
                    onClick={() => setIsFilterOpen((open) => !open)}
                    type="button"
                  >
                    <span>{selectedTestType}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ease-out ${
                        isFilterOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>
                  {isFilterOpen ? (
                    <div className="absolute right-0 top-full z-20 mt-2 min-w-full bg-slate-950 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                      {performanceFilterOptions.map((option) => (
                        <button
                          className="flex w-full items-center justify-between bg-slate-950 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-slate-950"
                          key={option}
                          onClick={() => {
                            setSelectedTestType(option);
                            setIsFilterOpen(false);
                          }}
                          type="button"
                        >
                          <span>{option}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            />
            <div className="max-h-[30rem] space-y-3 overflow-y-auto px-5 pt-5">
              {studentInfoPanel.items.map((item) => (
                <div className="min-h-[5rem] border border-slate-200/80 bg-slate-50/70 p-4" key={item.label}>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </PanelShell>
        </div>
      </section>

      <div className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Recommendations
        </p>
        <PanelShell>
          <SectionTitle
            title="AI improvement suggestions"
            className="border-b-slate-950 bg-slate-950"
            titleClassName="text-white"
          />
          <div className="grid gap-4 p-5 md:grid-cols-3">
            {studentRecommendations.map((recommendation) => (
              <div className="border border-slate-200/80 bg-slate-50/70 p-4" key={recommendation}>
                <p className="text-sm leading-7 text-slate-700">{recommendation}</p>
              </div>
            ))}
          </div>
        </PanelShell>
      </div>
    </div>
  );
}

export default TeacherStudentDetailPage;
