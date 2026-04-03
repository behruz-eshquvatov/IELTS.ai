import { FileBarChart2 } from "lucide-react";
import { PanelShell, SectionTitle } from "../../components/teacher/TeacherPanelPrimitives";
import { teacherReports } from "../../data/teacherPanel";

function TeacherReportsPage() {
  return (
    <div className="space-y-6">
      <PanelShell className="bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eff6ff_100%)]">
        <SectionTitle
          eyebrow="Reports"
          title="Teacher-facing summaries and institutional snapshots"
          copy="Use reports to explain class performance, student progress, and review capacity in a clear operational format."
        />
        <div className="grid gap-4 p-5 md:grid-cols-3">
          {teacherReports.map((report) => (
            <article
              className="border border-slate-200/80 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300"
              key={report.title}
            >
              <FileBarChart2 className="h-5 w-5 text-blue-600" />
              <p className="mt-4 text-lg font-semibold text-slate-950">{report.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{report.summary}</p>
            </article>
          ))}
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherReportsPage;
