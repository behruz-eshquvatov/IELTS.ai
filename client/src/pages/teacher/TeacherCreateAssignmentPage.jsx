import { PanelShell, SectionTitle, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";

const deliveryOptions = [
  "Selected class only",
  "Individual students",
  "All active students",
];

const reviewRules = [
  "Require manual review for writing tasks",
  "Escalate suspicious completion patterns",
  "Allow late submission with teacher note",
];

function TeacherCreateAssignmentPage() {
  return (
    <div className="space-y-6">
      <PanelShell>
        <SectionTitle
          eyebrow="Create assignment"
          title="Build a teacher task with clear review rules"
          copy="Choose the learning section, set a due date, assign a target cohort, and define how the work should be reviewed."
        />
        <div className="grid gap-6 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Assignment title</span>
                <div className="border border-slate-200 bg-white px-4 py-3">Task 2 - Opinion essay</div>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Section</span>
                <div className="border border-slate-200 bg-white px-4 py-3">Writing</div>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Due date</span>
                <div className="border border-slate-200 bg-white px-4 py-3">Friday, 20:00</div>
              </label>
              <label className="space-y-2 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">Review mode</span>
                <div className="border border-slate-200 bg-white px-4 py-3">Teacher review required</div>
              </label>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-900">Instructions</span>
              <div className="min-h-40 border border-slate-200 bg-white px-4 py-3 leading-7">
                Write a clear opinion essay with a direct thesis, two fully developed body paragraphs,
                and explicit cohesion between ideas. Keep the tone academic and avoid memorized templates.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Delivery target
              </p>
              <div className="mt-4 space-y-3">
                {deliveryOptions.map((option, index) => (
                  <div
                    className={`border px-4 py-3 text-sm font-medium ${
                      index === 0
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                    key={option}
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Review conditions
                </p>
                <StatusBadge tone="amber">Manual checks on</StatusBadge>
              </div>
              <div className="mt-4 space-y-3">
                {reviewRules.map((rule) => (
                  <div className="border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700" key={rule}>
                    {rule}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherCreateAssignmentPage;
