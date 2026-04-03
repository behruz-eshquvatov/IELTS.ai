import { useParams } from "react-router-dom";
import {
  PanelShell,
  SectionTitle,
  StatCard,
  StatusBadge,
} from "../../components/teacher/TeacherPanelPrimitives";
import { teacherClasses, teacherStudents } from "../../data/teacherPanel";

function TeacherClassOverviewPage() {
  const { classId } = useParams();
  const classroom = teacherClasses.find((item) => item.id === classId) ?? teacherClasses[0];
  const classStudents = teacherStudents.filter((student) => student.className === classroom.name);

  return (
    <div className="space-y-6">
      <section className="border border-slate-200/80 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
          Class overview
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">
          {classroom.name}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Class ID: {classId}. This overview keeps cohort performance, weak-area pattern,
          and member-level follow-up in one place.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Average band" value={classroom.averageBand} helper="Most recent class average" tone="blue" />
        <StatCard label="Completion rate" value={classroom.completionRate} helper="Latest assignment cycle" tone="emerald" />
        <StatCard label="Main weak area" value={classroom.weakArea} helper="Shared pattern in recent work" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PanelShell>
          <SectionTitle
            eyebrow="Class notes"
            title="Instruction snapshot"
            copy={classroom.notes}
          />
          <div className="space-y-4 p-5 text-sm text-slate-600">
            <div className="flex items-center justify-between border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <span>Schedule</span>
              <span className="font-semibold text-slate-900">{classroom.schedule}</span>
            </div>
            <div className="flex items-center justify-between border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <span>Students</span>
              <span className="font-semibold text-slate-900">{classroom.students}</span>
            </div>
            <div className="flex items-center justify-between border border-slate-200/80 bg-slate-50/70 px-4 py-4">
              <span>Class focus</span>
              <span className="font-semibold text-slate-900">{classroom.weakArea}</span>
            </div>
          </div>
        </PanelShell>

        <PanelShell>
          <SectionTitle
            eyebrow="Members"
            title="Students in this class"
            copy="A quick view of current progress and support needs."
          />
          <div className="divide-y divide-slate-200/70">
            {classStudents.map((student) => (
              <div
                className="flex flex-col gap-3 px-5 py-4 transition-colors duration-200 hover:bg-slate-50 md:flex-row md:items-center md:justify-between"
                key={student.id}
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{student.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{student.notes}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge tone={student.status === "On track" ? "emerald" : "amber"}>
                    {student.status}
                  </StatusBadge>
                  <span className="text-sm text-slate-500">{student.currentBand}</span>
                </div>
              </div>
            ))}
          </div>
        </PanelShell>
      </section>
    </div>
  );
}

export default TeacherClassOverviewPage;
