import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";
import MagneticButton from "../../components/ui/MagneticButton";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import { apiRequest } from "../../lib/apiClient";

function ListeningCard({ section, viewMode }) {
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
      className="group/listen-card relative z-0 overflow-visible bg-slate-200 p-[1.5px] transition-colors duration-600 cursor-default"
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
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent opacity-0 transition-opacity duration-500 group-hover/listen-card:opacity-100" />

        {viewMode === "grid" ? (
          <div className="relative z-10 flex-1">
            <h3 className="text-[1.4rem] font-semibold leading-[1.25] tracking-[-0.03em] text-slate-900">
              {section.title}
            </h3>
            <p className="mt-4 text-[1rem] font-normal leading-relaxed tracking-[-0.02em] text-slate-700 transition-colors duration-300 group-hover/listen-card:text-slate-900">
              {section.description}
            </p>
          </div>
        ) : (
          <div className="relative z-10 flex w-full items-center gap-6">
            <div className="w-full max-w-[75%]">
              <h3 className="text-[1.4rem] font-semibold leading-[1.25] tracking-[-0.03em] text-slate-900">
                {section.title}
              </h3>
              <p className="mt-4 text-[1rem] font-normal leading-relaxed tracking-[-0.02em] text-slate-700 transition-colors duration-300 group-hover/listen-card:text-slate-900">
                {section.description}
              </p>
            </div>
            <div className="ml-auto flex w-full max-w-[25%] items-center justify-end">
              <MagneticButton
                to={section.to}
                disableGlow
                className="rounded-full"
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-shadow duration-300 group-hover/listen-card:shadow-[0_22px_55px_-30px_rgba(16,185,129,0.82)]"
              >
                {section.cta}
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/listen-card:translate-x-1" />
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
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-shadow duration-300 group-hover/listen-card:shadow-[0_22px_55px_-30px_rgba(16,185,129,0.82)]"
              >
                {section.cta}
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/listen-card:translate-x-1" />
              </MagneticButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StudentListeningPage() {
  const [viewMode, setViewMode] = useLocalStorageState("student:listening:view-mode", "grid");
  const [testsCount, setTestsCount] = useState(null);
  const [partGroupsCount, setPartGroupsCount] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadLibraryStats() {
      setLoadError("");

      try {
        const [testsResponse, partGroupsResponse] = await Promise.all([
          apiRequest("/listening-tests?status=published&limit=1"),
          apiRequest("/listening-tests/part-groups?status=published"),
        ]);

        if (!isMounted) {
          return;
        }

        setTestsCount(Number(testsResponse?.pagination?.total) || 0);
        setPartGroupsCount(Number(partGroupsResponse?.count) || 0);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setLoadError(nextError.message || "Failed to load listening library overview.");
      }
    }

    loadLibraryStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const sections = useMemo(
    () => [
      {
        title: "Full Listening Tests",
        description:
          testsCount === null
            ? "Run complete IELTS listening tests with all parts in one continuous flow."
            : `${testsCount} published full test(s) ready for complete exam-style practice.`,
        to: "/student/tests/listening/full",
        cta: "Open resources",
      },
      {
        title: "Part-by-Part Listening",
        description:
          partGroupsCount === null
            ? "Practice listening by Part 1, Part 2, Part 3, and Part 4 with linked block order."
            : `${partGroupsCount} published part task(s) grouped by test part and ordered blocks.`,
        to: "/student/tests/listening/by-part",
        cta: "Open resources",
      },
      {
        title: "Multiple Choice",
        description:
          "Practice single-answer and multi-answer listening multiple-choice tasks as one family.",
        to: "/student/tests/listening/multiple_choice",
        cta: "Open resources",
      },
      {
        title: "Matching",
        description:
          "Practice listening matching tasks with option-to-detail alignment and evidence tracking.",
        to: "/student/tests/listening/matching",
        cta: "Open resources",
      },
      {
        title: "Gap Fill",
        description:
          "Practice form, note, table, and sentence completion under one gap-fill category.",
        to: "/student/tests/listening/gap_fill",
        cta: "Open resources",
      },
      {
        title: "Map / Diagram Labeling",
        description:
          "Practice map labeling and diagram labeling together as one visual listening family.",
        to: "/student/tests/listening/map_diagram_labeling",
        cta: "Open resources",
      },
    ],
    [partGroupsCount, testsCount],
  );

  const viewButtons = [
    { key: "list", icon: List },
    { key: "grid", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Listening Library
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
                    layoutId="listening-view-switch"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <Icon className="relative z-10 h-4 w-4" />
              </motion.button>
            );
          })}
        </motion.div>
      </header>

      {loadError ? <p className="text-sm text-rose-600">{loadError}</p> : null}

      <div
        className={`grid gap-4 ${
          viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {sections.map((section) => (
          <ListeningCard key={section.title} section={section} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
}

export default StudentListeningPage;
