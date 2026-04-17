import { useEffect, useRef } from "react";
import { ChevronRight, LayoutGrid, List } from "lucide-react";
import MagneticButton from "../../components/ui/MagneticButton";
import { motion } from "framer-motion";
import useLocalStorageState from "../../hooks/useLocalStorageState";

const sections = [
  {
    title: "Full Reading Passages",
    description:
      "Read all three passages in one continuous run with mixed question types and full timing practice.",
    to: "/student/tests/reading/full",
    cta: "Open resources",
  },
  {
    title: "Passage-by-Passage Reading",
    description:
      "Work through Passage 1, Passage 2, and Passage 3 separately with focused pacing and review.",
    to: "/student/tests/reading/by-passage",
    cta: "Open resources",
  },
  {
    title: "Multiple Choice",
    description:
      "Practice single- and multiple-answer tasks under one question-family flow.",
    to: "/student/tests/reading/multiple_choice",
    cta: "Open resources",
  },
  {
    title: "Binary Judgement",
    description:
      "Train True/False/Not Given and Yes/No/Not Given together as one family.",
    to: "/student/tests/reading/binary_judgement",
    cta: "Open resources",
  },
  {
    title: "Matching",
    description:
      "Cover headings, information, features, sentence endings, and multiple matching in one family.",
    to: "/student/tests/reading/matching",
    cta: "Open resources",
  },
  {
    title: "Gap Fill",
    description:
      "Practice summary, note, table, flow-chart, and sentence completion as one family.",
    to: "/student/tests/reading/gap_fill",
    cta: "Open resources",
  },
  {
    title: "Short Answer Questions",
    description:
      "Provide concise answers with correct spelling, numbers, and limits.",
    to: "/student/tests/reading/short_answer",
    cta: "Open resources",
  },
  {
    title: "Diagram Label Completion",
    description:
      "Label diagrams and visuals using exact terms from the passage within word limits.",
    to: "/student/tests/reading/diagram_labeling",
    cta: "Open resources",
  },
];

function ResourceCard({ section, viewMode }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      cardRef.current.style.setProperty("--card-x", `${x}px`);
      cardRef.current.style.setProperty("--card-y", `${y}px`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div
      ref={cardRef}
      className="group/resource-card relative z-0 overflow-visible bg-slate-200 p-[1.5px] transition-colors duration-600 cursor-default"
      style={{
        backgroundImage:
          "radial-gradient(480px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,1), transparent 68%), radial-gradient(760px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.14), transparent 62%)",
      }}
    >
      <div
        className={`relative flex justify-center h-full flex-col overflow-hidden bg-[#f7f4ef] ${
          viewMode === "grid" ? "aspect-square p-6" : "min-h-[140px] px-6 py-4"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent opacity-0 transition-opacity duration-500 group-hover/resource-card:opacity-100" />

        {viewMode === "grid" ? (
          <div className="relative z-10 flex-1">
            <h3 className="text-[1.4rem] font-medium leading-[1.25] tracking-[-0.03em] text-slate-900">
              {section.title}
            </h3>
            <p className="mt-4 text-[1rem] font-medium leading-relaxed tracking-[-0.02em] text-slate-700 transition-colors duration-300 group-hover/resource-card:text-slate-900">
              {section.description}
            </p>
          </div>
        ) : (
          <div className="relative z-10 flex w-full items-center gap-6">
            <div className="w-full max-w-[75%]">
              <h3 className="text-[1.4rem] font-medium leading-[1.25] tracking-[-0.03em] text-slate-900">
                {section.title}
              </h3>
              <p className="mt-4 text-[1rem] font-medium leading-relaxed tracking-[-0.02em] text-slate-700 transition-colors duration-300 group-hover/resource-card:text-slate-900">
                {section.description}
              </p>
            </div>
            <div className="ml-auto flex w-full max-w-[25%] items-center justify-end">
              <MagneticButton
                to={section.to}
                disableGlow
                className="rounded-full"
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-shadow duration-300 group-hover/resource-card:shadow-[0_22px_55px_-30px_rgba(16,185,129,0.82)]"
              >
                {section.cta}
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/resource-card:translate-x-1" />
              </MagneticButton>
            </div>
          </div>
        )}

        {viewMode === "grid" ? (
          <div className="relative z-10 mt-8 border-t border-slate-200/80 pt-4">
            <div className="flex justify-end">
              <MagneticButton
                to={section.to}
                disableGlow
                className="rounded-full"
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-shadow duration-300 group-hover/resource-card:shadow-[0_22px_55px_-30px_rgba(16,185,129,0.82)]"
              >
                {section.cta}
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/resource-card:translate-x-1" />
              </MagneticButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Page() {
  const [viewMode, setViewMode] = useLocalStorageState("student:reading:view-mode", "grid");
  const viewButtons = [
    { key: "list", icon: List },
    { key: "grid", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Reading Library
        </p>
        <motion.div
          layout
          className="relative hidden items-center rounded-full border border-slate-200 bg-white p-1 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.25)] lg:flex"
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
        >
          {viewButtons.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.key;

            return (
              <motion.button
                layout
                className={`relative z-10 inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 ${
                  isActive ? "text-white" : "text-slate-500 hover:text-slate-900"
                }`}
                key={item.key}
                onClick={() => setViewMode(item.key)}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                type="button"
              >
                {isActive ? (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-slate-900"
                    layoutId="resource-view-switch"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <Icon className="relative z-10 h-4 w-4" />
              </motion.button>
            );
          })}
        </motion.div>
      </header>

      <div
        className={`grid gap-4 ${
          viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {sections.map((section) => (
          <ResourceCard key={section.title} section={section} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
}

export default Page;
