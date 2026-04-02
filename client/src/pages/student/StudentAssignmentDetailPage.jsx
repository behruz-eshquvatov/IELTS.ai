import { useParams } from "react-router-dom";

function StudentAssignmentDetailPage() {
  const { assignmentId } = useParams();

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Assignment Detail
        </p>
        <h1 className="text-3xl font-semibold">Assignment {assignmentId}</h1>
        <p className="text-slate-600">Instructions, due dates, and linked tasks.</p>
      </header>

      <div className="rounded-none border border-slate-200/80 bg-white/90 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Instructions</p>
        <p className="mt-3 text-sm text-slate-600">
          Complete the attached tasks and submit before the due date. Follow the
          time limits as if in exam conditions.
        </p>
      </div>
    </div>
  );
}

export default StudentAssignmentDetailPage;


