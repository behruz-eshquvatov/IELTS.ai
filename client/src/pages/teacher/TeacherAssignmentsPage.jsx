import { ArrowRight } from "lucide-react";
import { PanelShell, SectionTitle, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import { teacherAssignments } from "../../data/teacherPanel";

function TeacherAssignmentsPage() {
  return (
    <div className="space-y-6">
      <PanelShell>
        <SectionTitle
          eyebrow="Assignments management"
          title="Plan, monitor, and adjust teacher tasks"
          copy="This queue helps you see what is active now, what is due soon, and which classes need a tighter follow-up rhythm."
          action={
            <button
              className="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-transform duration-200 hover:-translate-y-0.5"
              type="button"
            >
              Create assignment
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {teacherAssignments.map((assignment) => (
            <article
              className="border border-slate-200/80 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300"
              key={assignment.title}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{assignment.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{assignment.target}</p>
                </div>
                <StatusBadge tone={assignment.status === "Due soon" ? "amber" : "blue"}>
                  {assignment.status}
                </StatusBadge>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Section</span>
                  <span className="font-semibold text-slate-900">{assignment.section}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Due</span>
                  <span className="font-semibold text-slate-900">{assignment.due}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Submitted</span>
                  <span className="font-semibold text-slate-900">{assignment.submissions}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherAssignmentsPage;
