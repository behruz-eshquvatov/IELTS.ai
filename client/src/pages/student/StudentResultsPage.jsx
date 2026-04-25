import { useEffect, useMemo, useState } from "react";
import { Clock3, FileCheck2, History } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ResultsFilterTabs from "../../components/student/results/ResultsFilterTabs";
import ResultGroupCard from "../../components/student/results/ResultGroupCard";

const FILTER_ORDER = [
  "all",
  "writing_task1",
  "writing_task2",
  "reading_full_test",
  "listening_full_test",
  "question_type_task",
  "reading_question_task",
  "listening_question_task",
];

function StudentResultsPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [filters, setFilters] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadResultsGroups() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await apiRequest(
          `/students/me/results?category=${encodeURIComponent(activeFilter)}`,
        );
        if (!isMounted) {
          return;
        }

        setFilters(Array.isArray(response?.filters) ? response.filters : []);
        setGroups(Array.isArray(response?.groups) ? response.groups : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(error?.message || "Could not load task history.");
        setGroups([]);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadResultsGroups();

    return () => {
      isMounted = false;
    };
  }, [activeFilter]);

  const orderedFilters = useMemo(() => {
    const mapByKey = new Map(
      (Array.isArray(filters) ? filters : []).map((item) => [String(item?.key || ""), item]),
    );

    const prioritized = FILTER_ORDER.map((key) => (
      mapByKey.get(key) || { key, label: key.toUpperCase(), count: 0 }
    ));
    const extras = (Array.isArray(filters) ? filters : []).filter(
      (item) => !FILTER_ORDER.includes(String(item?.key || "")),
    );
    return [...prioritized, ...extras];
  }, [filters]);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Results Center
        </p>
        <h1 className="text-3xl font-semibold text-slate-900">Completed Tasks History</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Review previous attempts, reopen detailed reports, and compare your most recent performance by task type.
        </p>
      </header>

      <ResultsFilterTabs
        activeKey={activeFilter}
        filters={orderedFilters}
        onChange={setActiveFilter}
      />

      {isLoading ? (
        <div className="flex items-center gap-2 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Clock3 className="h-4 w-4" />
          Loading completed task history...
        </div>
      ) : null}

      {errorMessage ? (
        <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {!isLoading && !errorMessage && groups.length === 0 ? (
        <div className="space-y-3 border border-slate-200 bg-white px-5 py-8 text-center">
          <History className="mx-auto h-8 w-8 text-slate-400" />
          <p className="text-base font-semibold text-slate-900">No completed tasks yet</p>
          <p className="text-sm text-slate-600">
            Complete a task to see scores, timing, and attempt history here.
          </p>
        </div>
      ) : null}

      {!isLoading && !errorMessage && groups.length > 0 ? (
        <section className="space-y-4">
          {groups.map((group) => (
            <ResultGroupCard
              group={group}
              key={group?.taskGroupId || `${group?.taskType || "task"}-${group?.taskRefId || "item"}`}
            />
          ))}
        </section>
      ) : null}

      <section className="rounded-none border border-slate-200/80 bg-white/95 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <FileCheck2 className="h-4 w-4 text-slate-500" />
          Writing attempts open their analysis pages. Reading and Listening attempts open result history views with
          attempt switching and active-attempt highlighting.
        </div>
      </section>
    </div>
  );
}

export default StudentResultsPage;
