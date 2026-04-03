import { AlertTriangle, ArrowRight, BookOpenCheck, BrainCircuit, ShieldAlert } from "lucide-react";
import {
  PanelShell,
  SectionTitle,
  StatCard,
  StatusBadge,
} from "../../components/teacher/TeacherPanelPrimitives";
import {
  teacherAlerts,
  teacherAssignments,
  teacherClasses,
  teacherSkillDistribution,
  teacherSummaryStats,
} from "../../data/teacherPanel";

const statTones = ["slate", "blue", "emerald", "amber"];
const alertToneMap = {
  amber: { badge: "amber", icon: AlertTriangle },
  blue: { badge: "blue", icon: BrainCircuit },
  rose: { badge: "rose", icon: ShieldAlert },
};

function TeacherDashboardPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden border border-slate-200/80 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_48%,#f8fafc_100%)] p-6 lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Teacher Workspace
            </p>
            <div className="space-y-3">
              <h2 className="max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-slate-950">
                See class momentum, weak-skill patterns, and review risk before the next lesson starts.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                This teacher dashboard keeps the panel analytical and practical: what is late,
                what is slipping, and where your feedback has the highest leverage.
              </p>
            </div>
          </div>
          <PanelShell className="border-blue-200/70 bg-white/80">
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">Today&apos;s focus</p>
                <StatusBadge tone="blue">Priority queue</StatusBadge>
              </div>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3">
                  <BookOpenCheck className="mt-0.5 h-4 w-4 text-blue-600" />
                  <p>Finish manual review for pending writing tasks before the evening class.</p>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-600" />
                  <p>Check anomaly flags and confirm whether recent score spikes look credible.</p>
                </div>
              </div>
            </div>
          </PanelShell>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teacherSummaryStats.map((stat, index) => (
          <StatCard
            helper={stat.helper}
            key={stat.label}
            label={stat.label}
            tone={statTones[index]}
            value={stat.value}
          />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PanelShell>
          <SectionTitle
            eyebrow="Watch list"
            title="Alerts that need teacher judgment"
            copy="These are the items most likely to affect trust, pacing, or student outcomes if ignored."
          />
          <div className="grid gap-px bg-slate-200/70">
            {teacherAlerts.map((alert) => {
              const toneConfig = alertToneMap[alert.tone];
              const Icon = toneConfig.icon;

              return (
                <div
                  className="flex flex-col gap-4 bg-white px-5 py-5 transition-colors duration-200 hover:bg-slate-50 md:flex-row md:items-start md:justify-between"
                  key={alert.title}
                >
                  <div className="flex gap-3">
                    <span className="mt-1 flex h-10 w-10 items-center justify-center border border-slate-200 bg-slate-50 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{alert.title}</p>
                      <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
                        {alert.detail}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone={toneConfig.badge}>Requires review</StatusBadge>
                </div>
              );
            })}
          </div>
        </PanelShell>

        <PanelShell>
          <SectionTitle
            eyebrow="Skill balance"
            title="Weak-area distribution"
            copy="A quick scan of where your current cohorts need the most support."
          />
          <div className="space-y-3 p-5">
            {teacherSkillDistribution.map((item) => (
              <div
                className="border border-slate-200/80 bg-slate-50/70 p-4 transition-colors duration-200 hover:bg-slate-100/80"
                key={item.skill}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{item.skill}</p>
                  <StatusBadge tone={item.level === "Needs review" ? "amber" : "slate"}>
                    {item.level}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </PanelShell>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelShell>
          <SectionTitle
            eyebrow="Classes"
            title="Current class pulse"
            copy="A compact summary of band averages, weak areas, and completion rhythm."
          />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200/80 text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <th className="px-5 py-4">Class</th>
                  <th className="px-5 py-4">Avg band</th>
                  <th className="px-5 py-4">Completion</th>
                  <th className="px-5 py-4">Weak area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 bg-white">
                {teacherClasses.map((classroom) => (
                  <tr className="transition-colors duration-200 hover:bg-slate-50" key={classroom.id}>
                    <td className="px-5 py-4 align-top">
                      <p className="text-sm font-semibold text-slate-950">{classroom.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{classroom.schedule}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">{classroom.averageBand}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{classroom.completionRate}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{classroom.weakArea}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PanelShell>

        <PanelShell>
          <SectionTitle
            eyebrow="Assignments"
            title="Upcoming deadlines"
            copy="What students are currently working on and where review pressure is forming."
          />
          <div className="space-y-3 p-5">
            {teacherAssignments.map((assignment) => (
              <div
                className="border border-slate-200/80 bg-white p-4 transition-transform duration-200 hover:-translate-y-0.5"
                key={assignment.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{assignment.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {assignment.section} / {assignment.target}
                    </p>
                  </div>
                  <StatusBadge
                    tone={assignment.status === "Due soon" ? "amber" : assignment.status === "In progress" ? "blue" : "slate"}
                  >
                    {assignment.status}
                  </StatusBadge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                  <span>{assignment.due}</span>
                  <span>{assignment.submissions}</span>
                </div>
              </div>
            ))}
          </div>
        </PanelShell>
      </section>

      <div className="flex items-center justify-end">
        <button
          className="inline-flex items-center gap-2 border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-slate-900 hover:text-white"
          type="button"
        >
          Open detailed reports
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default TeacherDashboardPage;
