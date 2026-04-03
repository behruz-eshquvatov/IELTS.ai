import { Search } from "lucide-react";
import { PanelShell, SectionTitle, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import { teacherStudents } from "../../data/teacherPanel";

function TeacherStudentsPage() {
  return (
    <div className="space-y-6">
      <PanelShell>
        <SectionTitle
          eyebrow="Student directory"
          title="Students under teacher supervision"
          copy="Use this page to scan performance, identify weak areas, and decide who needs direct intervention."
          action={
            <div className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              Search students
            </div>
          }
        />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200/80 text-left">
            <thead className="bg-slate-50/80">
              <tr className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Class</th>
                <th className="px-5 py-4">Bands</th>
                <th className="px-5 py-4">Weak area</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white">
              {teacherStudents.map((student) => (
                <tr className="transition-colors duration-200 hover:bg-slate-50" key={student.id}>
                  <td className="px-5 py-4 align-top">
                    <p className="text-sm font-semibold text-slate-950">{student.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{student.notes}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{student.className}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">
                    {student.currentBand} now / {student.targetBand} target
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{student.weakArea}</td>
                  <td className="px-5 py-4">
                    <StatusBadge
                      tone={
                        student.status === "On track"
                          ? "emerald"
                          : student.status === "Flagged"
                            ? "rose"
                            : "amber"
                      }
                    >
                      {student.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherStudentsPage;
