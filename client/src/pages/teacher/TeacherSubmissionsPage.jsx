import { PanelShell, SectionTitle, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import { teacherSubmissions } from "../../data/teacherPanel";

function TeacherSubmissionsPage() {
  return (
    <div className="space-y-6">
      <PanelShell>
        <SectionTitle
          eyebrow="Submissions review"
          title="Pending work waiting for teacher action"
          copy="Writing tasks, anomaly checks, and any work that needs a human override should stay visible here."
        />
        <div className="grid gap-4 p-5">
          {teacherSubmissions.map((submission) => (
            <article
              className="border border-slate-200/80 bg-white p-5 transition-colors duration-200 hover:bg-slate-50"
              key={`${submission.student}-${submission.work}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{submission.work}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {submission.student} / {submission.className}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">{submission.issue}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusBadge tone={submission.priority === "Critical" ? "rose" : submission.priority === "High" ? "amber" : "blue"}>
                    {submission.priority}
                  </StatusBadge>
                  <span className="text-sm text-slate-500">{submission.submittedAt}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherSubmissionsPage;
