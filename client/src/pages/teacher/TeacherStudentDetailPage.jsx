import { useParams } from "react-router-dom";
import { PanelShell, SectionTitle, StatCard, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import {
  studentRecommendations,
  studentTimeline,
  teacherStudents,
} from "../../data/teacherPanel";

function TeacherStudentDetailPage() {
  const { studentId } = useParams();
  const student = teacherStudents.find((item) => item.id === studentId) ?? teacherStudents[0];

  return (
    <div className="space-y-6">
      <section className="border border-slate-200/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_60%,#eff6ff_100%)] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Student detail
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
              {student.name}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              This profile combines score trend, weak areas, behavior notes, and recommendations
              for the next intervention step.
            </p>
          </div>
          <StatusBadge tone={student.status === "On track" ? "emerald" : "amber"}>
            {student.status}
          </StatusBadge>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Current band" value={student.currentBand} helper="Most recent estimate" tone="blue" />
        <StatCard label="Target band" value={student.targetBand} helper="Declared student goal" tone="emerald" />
        <StatCard label="Completion rate" value={student.completionRate} helper="Assignment follow-through" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PanelShell>
          <SectionTitle
            eyebrow="Behavior and notes"
            title="Teacher reading"
            copy={student.notes}
          />
          <div className="space-y-3 p-5">
            <div className="border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Weak area</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.weakArea}</p>
            </div>
            <div className="border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last submission</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.lastSubmission}</p>
            </div>
            <div className="border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Current class</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{student.className}</p>
            </div>
          </div>
        </PanelShell>

        <PanelShell>
          <SectionTitle
            eyebrow="Results history"
            title="Recent learning signals"
            copy="Short-form events that help a teacher explain current performance."
          />
          <div className="space-y-3 p-5">
            {studentTimeline.map((item) => (
              <div
                className="border border-slate-200/80 bg-white p-4 transition-colors duration-200 hover:bg-slate-50"
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
      </section>

      <PanelShell>
        <SectionTitle
          eyebrow="Recommendations"
          title="Suggested teacher actions"
          copy="A practical next-step list for this student's upcoming review cycle."
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
  );
}

export default TeacherStudentDetailPage;
