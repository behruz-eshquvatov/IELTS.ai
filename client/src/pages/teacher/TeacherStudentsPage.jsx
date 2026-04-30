import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PanelShell, StatusBadge } from "../../components/teacher/TeacherPanelPrimitives";
import { listTeacherStudents } from "../../services/teacherService";

function formatScore(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "No data";
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.valueOf())) {
    return "No recent activity";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatClassNames(classes = []) {
  if (!classes.length) {
    return "Unassigned";
  }

  return classes.map((item) => item.name).filter(Boolean).join(", ");
}

function statusTone(status) {
  return status === "active" ? "emerald" : "amber";
}

function buildIndicators(summary = {}) {
  const statusCount = summary.statusCount || {};
  const noRecentCount = Number(statusCount.noRecentActivity || statusCount.norecentactivity || 0);

  return [
    {
      label: "All students",
      value: String(summary.totalStudents || 0),
      helper: "Accessible active class members",
    },
    {
      label: "Most common weakness",
      value: summary.mostCommonWeakness?.label || "Not enough data",
      helper: summary.mostCommonWeakness?.count
        ? `${summary.mostCommonWeakness.count} ${summary.mostCommonWeakness.count === 1 ? "student" : "students"}`
        : "No weak areas yet",
    },
    {
      label: "No recent activity",
      value: String(noRecentCount),
      helper: "No scored activity in the last 14 days",
    },
    {
      label: "Lowest score",
      value: formatScore(summary.lowestScore?.value),
      helper: summary.lowestScore?.studentCount
        ? `${summary.lowestScore.studentCount} ${summary.lowestScore.studentCount === 1 ? "student has" : "students have"} this score`
        : "No scores yet",
    },
    {
      label: "Average score",
      value: formatScore(summary.averageScore),
      helper: "Average band of scored students",
    },
    {
      label: "Highest score",
      value: formatScore(summary.highestScore?.value),
      helper: summary.highestScore?.studentCount
        ? `${summary.highestScore.studentCount} ${summary.highestScore.studentCount === 1 ? "student has" : "students have"} this score`
        : "No scores yet",
    },
  ];
}

function TeacherStudentsPage() {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [directory, setDirectory] = useState({
    summary: {},
    students: [],
    pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchValue]);

  useEffect(() => {
    let isCurrent = true;

    async function loadStudents() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await listTeacherStudents({
          search: debouncedSearch,
          page,
          limit: 25,
          sortBy: "name",
          sortDirection: "asc",
        });

        if (!isCurrent) {
          return;
        }

        setDirectory({
          summary: response?.summary || {},
          students: Array.isArray(response?.students) ? response.students : [],
          pagination: response?.pagination || { page, limit: 25, total: 0, totalPages: 0 },
        });
      } catch (error) {
        if (isCurrent) {
          setErrorMessage(error?.message || "Failed to load students.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => {
      isCurrent = false;
    };
  }, [debouncedSearch, page]);

  const indicators = useMemo(() => buildIndicators(directory.summary), [directory.summary]);
  const pagination = directory.pagination || {};
  const canGoPrevious = Number(pagination.page || 1) > 1;
  const canGoNext = Number(pagination.page || 1) < Number(pagination.totalPages || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
          Student directory
        </p>
        <label className="flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <Search className="h-4 w-4" />
          <input
            className="w-48 bg-transparent text-slate-700 outline-none placeholder:text-slate-500"
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search students"
            type="text"
            value={searchValue}
          />
        </label>
      </div>

      {errorMessage ? (
        <PanelShell>
          <div className="px-5 py-4 text-sm text-rose-600">{errorMessage}</div>
        </PanelShell>
      ) : null}

      <PanelShell>
        <table className="min-w-full table-fixed divide-y divide-slate-200/80 text-left">
          <tbody className="divide-y divide-slate-200/70 bg-white">
            {[0, 3].map((startIndex) => (
              <tr key={startIndex} className="divide-x divide-slate-200/70">
                {indicators.slice(startIndex, startIndex + 3).map((indicator) => (
                  <td className="px-5 py-5 align-top" key={indicator.label}>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {indicator.label}
                    </p>
                    <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {isLoading ? "..." : indicator.value}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{indicator.helper}</p>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </PanelShell>

      <PanelShell>
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed divide-y divide-slate-200/80 text-left">
            <colgroup>
              <col className="w-[31%]" />
              <col className="w-[17%]" />
              <col className="w-[12%]" />
              <col className="w-[24%]" />
              <col className="w-[16%]" />
            </colgroup>
            <thead className="bg-slate-950">
              <tr className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
                <th className="px-5 py-4">Student</th>
                <th className="px-5 py-4">Class</th>
                <th className="px-5 py-4">Score</th>
                <th className="px-5 py-4">Weak area</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white">
              {isLoading ? (
                [0, 1, 2, 3].map((row) => (
                  <tr className="animate-pulse" key={row}>
                    <td className="px-5 py-4"><div className="h-4 w-40 bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-28 bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-12 bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-36 bg-slate-100" /></td>
                    <td className="px-5 py-4"><div className="h-4 w-24 bg-slate-100" /></td>
                  </tr>
                ))
              ) : directory.students.length ? (
                directory.students.map((student) => (
                  <tr className="transition-colors duration-200 hover:bg-slate-50" key={student.studentId}>
                    <td className="px-5 py-4 align-top">
                      <p className="text-sm font-semibold text-slate-950">{student.fullName || "Student"}</p>
                      <p className="mt-1 text-sm text-slate-600">{student.email}</p>
                    </td>
                    <td className="px-5 py-4 align-middle text-sm text-slate-600">
                      {formatClassNames(student.classes)}
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <p className="text-lg font-semibold tracking-[-0.04em] text-slate-950">
                        {formatScore(student.averageScore)}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-middle text-sm text-slate-600">
                      <p>{student.weakestArea || "Not enough data"}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {student.attemptsCount || 0} attempts - {formatDate(student.lastActivityAt)}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-middle">
                      <StatusBadge tone={statusTone(student.status)}>
                        {student.status || "active"}
                      </StatusBadge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-5 py-8 text-sm text-slate-500" colSpan={5}>
                    No students match this search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200/70 px-5 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {Number(pagination.total || 0)} students - Page {Number(pagination.page || 1)} of {Number(pagination.totalPages || 0) || 1}
          </p>
          <div className="flex items-center gap-2">
            <button
              className="border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canGoPrevious || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Previous
            </button>
            <button
              className="border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canGoNext || isLoading}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </PanelShell>
    </div>
  );
}

export default TeacherStudentsPage;
