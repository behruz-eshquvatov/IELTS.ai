const assignments = [
  { id: "HW-201", title: "Reading Passage Set 03", due: "Due in 2 days" },
  { id: "HW-202", title: "Writing Task 2 Essay", due: "Due in 5 days" },
];

function StudentAssignmentsPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Assignments
        </p>
        <h1 className="text-3xl font-semibold">Teacher assigned work</h1>
        <p className="text-slate-600">
          Keep track of tasks assigned by your instructor.
        </p>
      </header>

      <div className="grid gap-4">
        {assignments.map((assignment) => (
          <div className="rounded-none border border-slate-200/80 bg-white/90 p-5" key={assignment.id}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">{assignment.title}</p>
                <p className="text-sm text-slate-600">Assignment ID: {assignment.id}</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {assignment.due}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StudentAssignmentsPage;


