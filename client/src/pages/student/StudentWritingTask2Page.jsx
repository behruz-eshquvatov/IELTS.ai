import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";
import MagneticButton from "../../components/ui/MagneticButton";
import { LibraryGridSkeleton } from "../../components/ui/Skeleton";
import useLocalStorageState from "../../hooks/useLocalStorageState";
import { apiRequest } from "../../lib/apiClient";

const ESSAY_SECTIONS = [
  {
    key: "opinion",
    title: "Opinion Essays",
    description: "Build a clear position and support it with focused reasons and examples.",
  },
  {
    key: "discussion",
    title: "Discussion Essays",
    description: "Present both views fairly, then state and justify your own opinion.",
  },
  {
    key: "advantages_disadvantages",
    title: "Advantages & Disadvantages",
    description: "Balance benefits and drawbacks with strong comparative structure.",
  },
  {
    key: "problem_solution",
    title: "Problem & Solution",
    description: "Explain causes clearly and propose realistic, well-developed solutions.",
  },
  {
    key: "direct_question",
    title: "Direct Questions",
    description: "Answer the exact question directly while maintaining strong essay cohesion.",
  },
  {
    key: "two_part_question",
    title: "Two-Part Questions",
    description: "Respond to both parts fully with balanced paragraph coverage.",
  },
  {
    key: "unknown",
    title: "Other Task 2",
    description: "Practice prompts that need manual type review or mixed structure handling.",
  },
];

function normalizeText(value) {
  return String(value || "").trim();
}

function WritingResourceCard({ section, viewMode }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!cardRef.current) {
        return;
      }

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
      className="group/writing2-card relative z-0 cursor-default overflow-visible bg-slate-200 p-[1.5px] transition-colors duration-600"
      style={{
        backgroundImage:
          "radial-gradient(480px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,1), transparent 68%), radial-gradient(760px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.14), transparent 62%)",
      }}
    >
      <div
        className={`relative flex h-full flex-col justify-center overflow-hidden bg-[#f7f4ef] ${
          viewMode === "grid" ? "aspect-square p-6" : "min-h-[140px] px-6 py-4"
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/45 to-transparent opacity-0 transition-opacity duration-500 group-hover/writing2-card:opacity-100" />

        {viewMode === "grid" ? (
          <div className="relative z-10 flex-1">
            <h3 className="text-[1.4rem] font-medium leading-[1.25] tracking-[-0.03em] text-slate-900">
              {section.title}
            </h3>
            <p className="mt-4 text-[1rem] font-medium leading-relaxed tracking-[-0.02em] text-slate-700 transition-colors duration-300 group-hover/writing2-card:text-slate-900">
              {section.description}
            </p>
          </div>
        ) : (
          <div className="relative z-10 flex w-full items-center gap-6">
            <div className="w-full max-w-[75%]">
              <h3 className="text-[1.4rem] font-medium leading-[1.25] tracking-[-0.03em] text-slate-900">
                {section.title}
              </h3>
              <p className="mt-4 text-[1rem] font-medium leading-relaxed tracking-[-0.02em] text-slate-700 transition-colors duration-300 group-hover/writing2-card:text-slate-900">
                {section.description}
              </p>
            </div>
            <div className="ml-auto flex w-full max-w-[25%] items-center justify-end">
              <MagneticButton
                to={section.to}
                disableGlow
                className="rounded-full"
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-shadow duration-300 group-hover/writing2-card:shadow-[0_22px_55px_-30px_rgba(16,185,129,0.82)]"
              >
                {section.cta}
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/writing2-card:translate-x-1" />
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
                innerClassName="emerald-gradient-fill inline-flex min-w-32 items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-shadow duration-300 group-hover/writing2-card:shadow-[0_22px_55px_-30px_rgba(16,185,129,0.82)]"
              >
                {section.cta}
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover/writing2-card:translate-x-1" />
              </MagneticButton>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StudentWritingTask2Page() {
  const [viewMode, setViewMode] = useLocalStorageState("student:writing-task2:view-mode", "grid");
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiRequest("/writing-task2/items?status=published&limit=100", {
        });

        if (!isMounted) {
          return;
        }

        setItems(Array.isArray(response?.items) ? response.items : []);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }

        setError(nextError.message || "Failed to load Writing Task 2 sections.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, []);

  const itemsCountByType = useMemo(() => {
    const counter = new Map();
    items.forEach((item) => {
      const key = normalizeText(item?.essayType).toLowerCase();
      if (!key) {
        return;
      }

      counter.set(key, (counter.get(key) || 0) + 1);
    });

    return counter;
  }, [items]);

  const sections = useMemo(
    () =>
      ESSAY_SECTIONS.map((section) => {
        const count = Number(itemsCountByType.get(section.key) || 0);
        const suffix = count === 1 ? "task" : "tasks";

        return {
          title: section.title,
          description:
            count > 0
              ? `${section.description} ${count} published ${suffix} available.`
              : `${section.description} No published tasks yet.`,
          to: `/student/tests/writingTask2/type/${encodeURIComponent(section.key)}`,
          cta: "Open resources",
        };
      }),
    [itemsCountByType],
  );

  const viewButtons = [
    { key: "list", icon: List },
    { key: "grid", icon: LayoutGrid },
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">Writing Task 2</p>
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
                    layoutId="writing-task2-view-switch"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  />
                ) : null}
                <Icon className="relative z-10 h-4 w-4" />
              </motion.button>
            );
          })}
        </motion.div>
      </header>

      {isLoading ? <LibraryGridSkeleton /> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {!isLoading ? <div
        className={`grid gap-4 ${
          viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {sections.map((section) => (
          <WritingResourceCard key={section.title} section={section} viewMode={viewMode} />
        ))}
      </div> : null}
    </div>
  );
}

export default StudentWritingTask2Page;
