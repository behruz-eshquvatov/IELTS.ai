import { useMemo } from "react";
import {
  BookOpenText,
  FileBarChart2,
  FileText,
  Headphones,
  PenLine,
  Target,
  TriangleAlert,
} from "lucide-react";
import { PanelShell, SectionTitle, StatCard, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import { resolveTeacherStudentsWithClassIds } from "../../lib/teacherClassStore";

const SKILL_AREAS = [
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
    icon: FileText,
    accent: "bg-amber-50 text-amber-700",
  },
  {
    key: "writingTask2",
    label: "Writing Task 2",
    icon: PenLine,
    accent: "bg-rose-50 text-rose-700",
  },
];

function classifySkillArea(weakArea) {
  const normalizedValue = String(weakArea || "").toLowerCase();

  if (
    normalizedValue.includes("reading")
    || normalizedValue.includes("headings")
    || normalizedValue.includes("true-false")
    || normalizedValue.includes("true / false")
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
    || normalizedValue.includes("coherence")
    || normalizedValue.includes("cohesion")
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

  return "writingTask2";
}

function normalizeMistakeLabel(weakArea) {
  const normalizedValue = String(weakArea || "").toLowerCase();

  if (normalizedValue.includes("map")) {
    return "Map Labeling";
  }
  if (normalizedValue.includes("true-false-not given") || normalizedValue.includes("true / false")) {
    return "True / False / Not Given";
  }
  if (normalizedValue.includes("matching headings") || normalizedValue.includes("headings")) {
    return "Matching Headings";
  }
  if (normalizedValue.includes("multiple choice")) {
    return "Multiple Choice";
  }
  if (normalizedValue.includes("note completion") || normalizedValue.includes("form completion") || normalizedValue.includes("sentence completion")) {
    return "Completion Tasks";
  }
  if (normalizedValue.includes("overview")) {
    return "Task 1 Overview";
  }
  if (normalizedValue.includes("cohesion") || normalizedValue.includes("coherence")) {
    return "Cohesion and Coherence";
  }
  if (normalizedValue.includes("task response")) {
    return "Task Response";
  }
  if (normalizedValue.includes("inference")) {
    return "Inference Questions";
  }
  if (normalizedValue.includes("detail")) {
    return "Detail Trap Questions";
  }
  if (normalizedValue.includes("timing") || normalizedValue.includes("pacing")) {
    return "Timing Control";
  }

  return weakArea || "General accuracy";
}

function getHeatToneClass(ratio) {
  if (ratio >= 0.85) {
    return "bg-rose-600";
  }
  if (ratio >= 0.65) {
    return "bg-rose-500";
  }
  if (ratio >= 0.45) {
    return "bg-amber-500";
  }
  if (ratio >= 0.25) {
    return "bg-amber-300";
  }
  return "bg-emerald-300";
}

function TeacherReportsPage() {
  const managedStudents = useMemo(
    () => resolveTeacherStudentsWithClassIds().filter((student) => student.classId),
    [],
  );

  const {
    strongestArea,
    weakestArea,
    topMistakes,
    skillAreaMetrics,
  } = useMemo(() => {
    const totalStudents = managedStudents.length || 1;
    const areaCounts = SKILL_AREAS.reduce((counts, area) => {
      counts[area.key] = 0;
      return counts;
    }, {});
    const mistakeCounts = {};

    managedStudents.forEach((student) => {
      const areaKey = classifySkillArea(student.weakArea);
      areaCounts[areaKey] += 1;

      const mistakeLabel = normalizeMistakeLabel(student.weakArea);
      mistakeCounts[mistakeLabel] = (mistakeCounts[mistakeLabel] ?? 0) + 1;
    });

    const nextSkillAreaMetrics = SKILL_AREAS.map((area) => {
      const strugglingCount = areaCounts[area.key] ?? 0;
      const pressureShare = strugglingCount / totalStudents;
      const strengthScore = Math.max(8, Math.round((1 - pressureShare) * 100));

      return {
        ...area,
        strugglingCount,
        pressureShare,
        strengthScore,
      };
    }).sort((left, right) => right.strengthScore - left.strengthScore);

    const nextTopMistakes = Object.entries(mistakeCounts)
      .map(([label, count]) => ({
        label,
        count,
        ratio: count / totalStudents,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    return {
      strongestArea: nextSkillAreaMetrics[0] ?? null,
      weakestArea: nextSkillAreaMetrics[nextSkillAreaMetrics.length - 1] ?? null,
      topMistakes: nextTopMistakes,
      skillAreaMetrics: nextSkillAreaMetrics,
    };
  }, [managedStudents]);

  const statCards = [
    {
      label: "Managed students",
      value: String(managedStudents.length),
      helper: "Students currently assigned to teacher-managed classes",
      tone: "blue",
    },
    {
      label: "Strongest area",
      value: strongestArea?.label ?? "No data",
      helper: strongestArea ? `${strongestArea.strengthScore}% class confidence` : "Waiting for class data",
      tone: "emerald",
    },
    {
      label: "Weakest area",
      value: weakestArea?.label ?? "No data",
      helper: weakestArea ? `${weakestArea.strugglingCount} students are struggling here` : "Waiting for class data",
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      <PanelShell className="bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_54%,#eef7ff_100%)]">
        <SectionTitle
          eyebrow="Reports"
          title="Class analytics, pressure points, and mistake patterns"
          copy="This view focuses on where the whole class is strongest, where it is leaking marks, and which question types are failing most often."
          action={(
            <StatusBadge tone="blue">
              Live class snapshot
            </StatusBadge>
          )}
        />

        <div className="grid gap-4 p-5 md:grid-cols-3">
          {statCards.map((card) => (
            <StatCard
              helper={card.helper}
              key={card.label}
              label={card.label}
              tone={card.tone}
              value={card.value}
            />
          ))}
        </div>
      </PanelShell>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <PanelShell>
          <SectionTitle
            eyebrow="Strength chart"
            title="Where the whole class is strongest and weakest"
            copy="Higher confidence means fewer students are currently showing that area as their main weakness."
          />

          <div className="space-y-4 p-5">
            {skillAreaMetrics.map((area, index) => {
              const Icon = area.icon;
              const isStrongest = strongestArea?.key === area.key;
              const isWeakest = weakestArea?.key === area.key;

              return (
                <article className="border border-slate-200/80 bg-white p-4" key={area.key}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${area.accent}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-950">{area.label}</p>
                          {isStrongest ? <StatusBadge tone="emerald">Strongest</StatusBadge> : null}
                          {isWeakest ? <StatusBadge tone="rose">Weakest</StatusBadge> : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {area.strugglingCount} of {managedStudents.length} students currently flag this area as their main issue
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
                          index === 0
                            ? "emerald-gradient-fill"
                            : index === skillAreaMetrics.length - 1
                              ? "bg-rose-500"
                              : "bg-slate-900"
                        }`}
                        style={{ width: `${area.strengthScore}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>Higher is stronger</span>
                      <span>{Math.round(area.pressureShare * 100)}% weakness share</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </PanelShell>

        <PanelShell>
          <SectionTitle
            eyebrow="Mistake heatmap"
            title="Top 5 question types the class is failing"
            copy="This ranks the failure hotspots teachers should attack first in drills, review, and assignment design."
          />

          <div className="space-y-3 p-5">
            {topMistakes.map((mistake, index) => (
              <article className="border border-slate-200/80 bg-white p-4" key={mistake.label}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-950">{mistake.label}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {mistake.count} students are repeatedly losing marks on this type
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Heat
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {Math.round(mistake.ratio * 100)}%
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-10 gap-1">
                  {Array.from({ length: 10 }, (_, stepIndex) => {
                    const fillThreshold = (stepIndex + 1) / 10;
                    const isFilled = fillThreshold <= mistake.ratio;

                    return (
                      <span
                        className={`h-4 ${isFilled ? getHeatToneClass(mistake.ratio) : "bg-slate-100"}`}
                        key={`${mistake.label}-${stepIndex}`}
                      />
                    );
                  })}
                </div>
              </article>
            ))}

            {!topMistakes.length ? (
              <div className="border border-dashed border-slate-200 bg-slate-50/70 p-6 text-sm text-slate-500">
                No class mistake data is available yet.
              </div>
            ) : null}
          </div>
        </PanelShell>
      </div>

      <PanelShell>
        <SectionTitle
          eyebrow="Action focus"
          title="Teacher takeaway"
          copy="Use this section to decide which drill types should dominate the next assignment cycle."
        />

        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          <article className="border border-emerald-200/80 bg-emerald-50/60 p-5">
            <div className="flex items-center gap-3">
              <Target className="h-5 w-5 text-emerald-700" />
              <p className="text-sm font-semibold text-slate-950">Build on the strongest area</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {strongestArea
                ? `${strongestArea.label} is currently the healthiest area. Keep one lighter reinforcement task here while shifting most class energy elsewhere.`
                : "No strong area can be identified yet."}
            </p>
          </article>

          <article className="border border-amber-200/80 bg-amber-50/60 p-5">
            <div className="flex items-center gap-3">
              <TriangleAlert className="h-5 w-5 text-amber-700" />
              <p className="text-sm font-semibold text-slate-950">Immediate intervention</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {weakestArea
                ? `${weakestArea.label} is the current drag area. The next lesson should explicitly target this weakness before another full mock is assigned.`
                : "No weak area can be identified yet."}
            </p>
          </article>

          <article className="border border-slate-200/80 bg-white p-5 md:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-3">
              <FileBarChart2 className="h-5 w-5 text-slate-700" />
              <p className="text-sm font-semibold text-slate-950">Most urgent drill type</p>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              {topMistakes[0]
                ? `${topMistakes[0].label} is the top failure pattern across the class. It should appear first in correction loops, homework, and live review.`
                : "No urgent drill type can be identified yet."}
            </p>
          </article>
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherReportsPage;
