import { Bell, ShieldCheck, SlidersHorizontal, UserCircle2 } from "lucide-react";
import { PanelShell, SectionTitle, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import { settingsSections } from "../../data/teacherPanel";

const sectionIcons = [UserCircle2, Bell, SlidersHorizontal];

function TeacherSettingsPage() {
  return (
    <div className="space-y-6">
      <PanelShell>
        <SectionTitle
          eyebrow="Settings"
          title="Teacher preferences and review controls"
          copy="Keep the same protected teacher layout here, with a clean settings surface and the same sidebar shell."
          action={<StatusBadge tone="emerald">Protected layout active</StatusBadge>}
        />
        <div className="grid gap-4 p-5 lg:grid-cols-3">
          {settingsSections.map((section, index) => {
            const Icon = sectionIcons[index];

            return (
              <article
                className="border border-slate-200/80 bg-white p-5 transition-colors duration-200 hover:bg-slate-50"
                key={section.title}
              >
                <Icon className="h-5 w-5 text-slate-700" />
                <p className="mt-4 text-lg font-semibold text-slate-950">{section.title}</p>
                <div className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <div className="border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-sm text-slate-700" key={item}>
                      {item}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </PanelShell>

      <PanelShell className="border-emerald-200/70 bg-emerald-50/60">
        <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-emerald-700" />
            <div>
              <p className="text-sm font-semibold text-slate-950">Teacher settings live inside the same sidebar layout.</p>
              <p className="mt-2 text-sm text-slate-600">
                The header now stays minimal and shows only the page name, just as requested.
              </p>
            </div>
          </div>
          <button
            className="emerald-gradient-fill rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-transform duration-200 hover:-translate-y-0.5"
            type="button"
          >
            Save preferences
          </button>
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherSettingsPage;
