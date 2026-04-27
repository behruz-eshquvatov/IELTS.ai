import { LayoutGroup } from "framer-motion";
import { useEffect, useState } from "react";
import StudentTodayTasks from "../../components/student/StudentTodayTasks";

const filters = ["All", "Today", "Completed", "Locked"];

function RollingLabel({ label, active }) {
  return (
    <span className="relative block h-[1.2rem] overflow-hidden">
      <span
        className={`flex flex-col transition-transform duration-300 ease-out group-hover/filter:-translate-y-1/2 ${
          active ? "-translate-y-1/2" : "translate-y-0"
        }`}
      >
        <span className="h-[1.2rem]">{label}</span>
        <span className="h-[1.2rem] text-slate-950">{label}</span>
      </span>
    </span>
  );
}


function StudentDailyTasksPage() {
  const [activeFilter, setActiveFilter] = useState(filters[0]);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsCompact(window.scrollY > 0);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div className="space-y-4 pt-16">
      <LayoutGroup>
        <div
          className={`fixed left-20 right-0 top-16 z-20 px-6 transition-all duration-200 ease-out lg:px-10 ${
            isCompact
              ? "py-3 border-b border-slate-200 bg-[#fbf8f2]"
              : "py-5 border-b border-transparent bg-transparent"
          }`}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                className={`group/filter relative rounded-none border border-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition-colors ${
                  isActive ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                }`}
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
              >
                <RollingLabel active={isActive} label={filter} />
                {isActive ? (
                  <span className="absolute inset-x-3 bottom-0 h-px rounded-full bg-slate-950" />
                ) : null}
              </button>
            );
          })}
          </div>
        </div>
      </LayoutGroup>

      <StudentTodayTasks
        showHeader={false}
        showAllLink={false}
        activeFilter={activeFilter}
      />
    </div>
  );
}

export default StudentDailyTasksPage;
