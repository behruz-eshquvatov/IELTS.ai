import { useEffect, useMemo, useState } from "react";
import { History } from "lucide-react";
import { apiRequest } from "../../lib/apiClient";
import ResultsFilterTabs from "../../components/student/results/ResultsFilterTabs";
import ResultGroupCard from "../../components/student/results/ResultGroupCard";
import { ResultsSkeleton } from "../../components/ui/Skeleton";
import {
  formatCompletionDateGroup,
  getCompletionDateKey,
} from "../../components/student/results/resultsUtils";

const FILTER_ORDER = [
  "all",
  "writing_task1",
  "writing_task2",
  "reading_full_test",
  "listening_full_test",
  "question_type_task",
];

const HIDDEN_FILTER_KEYS = new Set([
  "reading_question_task",
  "listening_question_task",
]);

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
    const visibleFilters = (Array.isArray(filters) ? filters : []).filter(
      (item) => !HIDDEN_FILTER_KEYS.has(String(item?.key || "")),
    );

    const mapByKey = new Map(
      visibleFilters.map((item) => [String(item?.key || ""), item]),
    );

    const prioritized = FILTER_ORDER.map((key) => (
      mapByKey.get(key) || { key, label: key.toUpperCase(), count: 0 }
    ));
    const extras = visibleFilters.filter(
      (item) => !FILTER_ORDER.includes(String(item?.key || "")),
    );
    return [...prioritized, ...extras];
  }, [filters]);

  const groupedResults = useMemo(() => {
    const sortedGroups = [...groups].sort((first, second) => {
      const firstTime = new Date(first?.latestSubmittedAt || 0).valueOf();
      const secondTime = new Date(second?.latestSubmittedAt || 0).valueOf();
      return (Number.isFinite(secondTime) ? secondTime : 0) - (Number.isFinite(firstTime) ? firstTime : 0);
    });

    return sortedGroups.reduce((collection, group) => {
      const dateKey = getCompletionDateKey(group?.latestSubmittedAt);
      const existing = collection.find((item) => item.dateKey === dateKey);

      if (existing) {
        existing.groups.push(group);
        return collection;
      }

      collection.push({
        dateKey,
        label: formatCompletionDateGroup(group?.latestSubmittedAt),
        groups: [group],
      });
      return collection;
    }, []);
  }, [groups]);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Completed Tasks
        </p>
      </header>

      <ResultsFilterTabs
        activeKey={activeFilter}
        filters={orderedFilters}
        onChange={setActiveFilter}
      />

      {isLoading ? (
        <ResultsSkeleton />
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

      {!isLoading && !errorMessage && groupedResults.length > 0 ? (
        <section className="space-y-6">
          {groupedResults.map((resultGroup) => (
            <div className="space-y-3" key={resultGroup.dateKey}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {resultGroup.label}
              </h2>
              <div className="space-y-4">
                {resultGroup.groups.map((group) => (
                  <ResultGroupCard
                    group={group}
                    key={group?.taskGroupId || `${group?.taskType || "task"}-${group?.taskRefId || "item"}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export default StudentResultsPage;
