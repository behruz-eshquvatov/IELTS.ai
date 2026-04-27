import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../lib/apiClient";
import { AdminListSkeleton } from "../components/ui/Skeleton";
import { buildSuperAdminApiPath, buildSuperAdminPagePath, isValidSuperAdminPassword } from "../lib/superAdmin";

const TASK_TYPE_OPTIONS = [
  { value: "reading", label: "Reading (full tests)" },
  { value: "listening", label: "Listening (full tests)" },
  { value: "writing_task1", label: "Writing Task 1" },
  { value: "writing_task2", label: "Writing Task 2" },
];
const TASK_TYPE_LABEL_BY_VALUE = TASK_TYPE_OPTIONS.reduce((accumulator, option) => {
  accumulator[option.value] = option.label;
  return accumulator;
}, {});

function createDefaultTaskRow(order = 1) {
  return {
    taskType: "reading",
    taskRefId: "",
    order,
  };
}

function buildEmptyForm() {
  return {
    title: "",
    order: 1,
    status: "draft",
    tasks: [createDefaultTaskRow(1)],
  };
}

function normalizeTaskRows(rows = []) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({
      taskType: String(row?.taskType || "").trim().toLowerCase(),
      taskRefId: String(row?.taskRefId || "").trim(),
      order: index + 1,
    }))
    .filter((row) => row.taskType && row.taskRefId)
    .map((row, index) => ({
      ...row,
      order: index + 1,
    }));
}

function buildSourceOptionLabel(taskType, source) {
  const id = String(source?._id || "");
  if (taskType === "reading" || taskType === "listening") {
    const title = String(source?.title || "").trim();
    return title ? `${title} (${id})` : id;
  }

  if (taskType === "writing_task1") {
    const topic = String(source?.questionTopic || "").trim();
    return topic ? `${topic} (${id})` : id;
  }

  const topic = String(source?.questionTopic || "").trim();
  return topic ? `${topic} (${id})` : id;
}

function truncateWithEllipsis(value, maxLength = 92) {
  const safeValue = String(value || "").trim();
  if (!safeValue || safeValue.length <= maxLength) {
    return safeValue;
  }

  return `${safeValue.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function resolveStatusBadgeClass(status) {
  const normalized = String(status || "").trim().toLowerCase();
  return normalized === "published"
    ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
    : "border-amber-300/60 bg-amber-50 text-amber-700";
}

function SuperAdminDailyUnitsPage() {
  const { password = "" } = useParams();
  const isPasswordValid = isValidSuperAdminPassword(password);
  const [form, setForm] = useState(buildEmptyForm());
  const [units, setUnits] = useState([]);
  const [sourcesByType, setSourcesByType] = useState({
    reading: [],
    listening: [],
    writing_task1: [],
    writing_task2: [],
  });
  const [editingUnitId, setEditingUnitId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [sourcesResponse, unitsResponse] = await Promise.all([
        apiRequest(buildSuperAdminApiPath(password, "/daily-units/sources"), { auth: false }),
        apiRequest(buildSuperAdminApiPath(password, "/daily-units"), { auth: false }),
      ]);

      setSourcesByType({
        reading: Array.isArray(sourcesResponse?.sources?.reading) ? sourcesResponse.sources.reading : [],
        listening: Array.isArray(sourcesResponse?.sources?.listening) ? sourcesResponse.sources.listening : [],
        writing_task1: Array.isArray(sourcesResponse?.sources?.writing_task1)
          ? sourcesResponse.sources.writing_task1
          : [],
        writing_task2: Array.isArray(sourcesResponse?.sources?.writing_task2)
          ? sourcesResponse.sources.writing_task2
          : [],
      });
      setUnits(Array.isArray(unitsResponse?.units) ? unitsResponse.units : []);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to load daily units.");
    } finally {
      setIsLoading(false);
    }
  }, [password]);

  useEffect(() => {
    if (!isPasswordValid) {
      return;
    }

    void loadData();
  }, [isPasswordValid, loadData]);

  const isEditing = Boolean(editingUnitId);
  const sortedUnits = useMemo(
    () =>
      [...units].sort((left, right) => {
        const leftOrder = Number(left?.order || 0);
        const rightOrder = Number(right?.order || 0);
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return String(left?._id || "").localeCompare(String(right?._id || ""));
      }),
    [units],
  );
  const unitsSummary = useMemo(() => {
    const publishedCount = sortedUnits.filter((unit) => String(unit?.status || "").toLowerCase() === "published").length;
    return {
      total: sortedUnits.length,
      published: publishedCount,
      draft: sortedUnits.length - publishedCount,
    };
  }, [sortedUnits]);

  function resetForm() {
    setEditingUnitId("");
    setForm(buildEmptyForm());
  }

  function setTaskRowAt(index, patch) {
    setForm((current) => {
      const nextRows = [...current.tasks];
      if (!nextRows[index]) {
        return current;
      }

      nextRows[index] = {
        ...nextRows[index],
        ...patch,
      };

      return {
        ...current,
        tasks: nextRows.map((row, rowIndex) => ({ ...row, order: rowIndex + 1 })),
      };
    });
  }

  function removeTaskRow(index) {
    setForm((current) => {
      if (current.tasks.length <= 1) {
        return current;
      }

      const nextRows = current.tasks.filter((_, rowIndex) => rowIndex !== index);
      return {
        ...current,
        tasks: nextRows.map((row, rowIndex) => ({ ...row, order: rowIndex + 1 })),
      };
    });
  }

  function moveTaskRow(index, direction) {
    setForm((current) => {
      const nextRows = [...current.tasks];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (!nextRows[index] || !nextRows[targetIndex]) {
        return current;
      }

      const currentRow = nextRows[index];
      nextRows[index] = nextRows[targetIndex];
      nextRows[targetIndex] = currentRow;

      return {
        ...current,
        tasks: nextRows.map((row, rowIndex) => ({ ...row, order: rowIndex + 1 })),
      };
    });
  }

  function startEditing(unit) {
    const safeTasks = Array.isArray(unit?.tasks) && unit.tasks.length > 0
      ? unit.tasks.map((task, index) => ({
        taskType: String(task?.taskType || "").trim().toLowerCase(),
        taskRefId: String(task?.taskRefId || "").trim(),
        order: index + 1,
      }))
      : [createDefaultTaskRow(1)];

    setEditingUnitId(String(unit?._id || ""));
    setForm({
      title: String(unit?.title || ""),
      order: Number(unit?.order || 1),
      status: String(unit?.status || "draft"),
      tasks: safeTasks,
    });
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const normalizedTasks = normalizeTaskRows(form.tasks);
    if (!form.title.trim()) {
      setErrorMessage("Unit title is required.");
      return;
    }
    if (normalizedTasks.length === 0) {
      setErrorMessage("Add at least one valid task.");
      return;
    }

    const payload = {
      unit: {
        title: form.title.trim(),
        order: Number.parseInt(String(form.order || 1), 10) || 1,
        status: form.status === "published" ? "published" : "draft",
        tasks: normalizedTasks,
      },
    };

    setIsSaving(true);
    try {
      if (isEditing) {
        await apiRequest(
          `${buildSuperAdminApiPath(password, "/daily-units")}/${encodeURIComponent(editingUnitId)}`,
          {
            method: "PUT",
            body: payload,
            auth: false,
          },
        );
      } else {
        await apiRequest(buildSuperAdminApiPath(password, "/daily-units"), {
          method: "POST",
          body: payload,
          auth: false,
        });
      }

      setSuccessMessage(isEditing ? "Daily unit updated." : "Daily unit created.");
      resetForm();
      await loadData();
    } catch (error) {
      const validationErrors = Array.isArray(error?.body?.validation?.errors)
        ? error.body.validation.errors.join(" ")
        : "";
      setErrorMessage(validationErrors || error?.message || "Failed to save daily unit.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(unitId) {
    const safeUnitId = String(unitId || "").trim();
    if (!safeUnitId) {
      return;
    }

    const hasConfirmed = window.confirm("Delete this daily unit?");
    if (!hasConfirmed) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(`${buildSuperAdminApiPath(password, "/daily-units")}/${encodeURIComponent(safeUnitId)}`, {
        method: "DELETE",
        auth: false,
      });
      if (editingUnitId === safeUnitId) {
        resetForm();
      }
      setSuccessMessage("Daily unit deleted.");
      await loadData();
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete daily unit.");
    }
  }

  if (!isPasswordValid) {
    return (
      <section className="min-h-screen bg-[#f5f1ea] px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_30px_90px_-52px_rgba(15,23,42,0.34)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
            Super Admin
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            Access denied
          </h1>
          <p className="mt-4 text-slate-600">The password in this URL is not valid.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top_right,#ecfdf5_0%,#f5f1ea_36%)] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            to={buildSuperAdminPagePath(password)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <button
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
            onClick={resetForm}
            type="button"
          >
            <Plus className="h-4 w-4" />
            Create Unit
          </button>
        </div>

        <article className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-7">
          <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-emerald-100/70 blur-2xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-24 w-24 rounded-full bg-sky-100/60 blur-2xl" />
          <div className="relative">
            <p className="inline-flex rounded-full border border-emerald-300/40 bg-emerald-50/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Super Admin
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
              Daily Units Manager
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Build ordered units from Reading full tests, Listening full tests, and Writing items.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total Units</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-900">{unitsSummary.total}</p>
              </div>
              <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Published</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-emerald-800">{unitsSummary.published}</p>
              </div>
              <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Draft</p>
                <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-amber-800">{unitsSummary.draft}</p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                {isEditing ? "Edit Daily Unit" : "Create Daily Unit"}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Use ordered tasks and publish only when the unit is ready.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${isEditing ? "border-sky-300/70 bg-sky-50 text-sky-700" : "border-emerald-300/70 bg-emerald-50 text-emerald-700"}`}>
              {isEditing ? "Editing" : "New Unit"}
            </span>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
          {successMessage ? (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700">Title</span>
                <input
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Unit 1"
                  type="text"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700">Order</span>
                <input
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  value={form.order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      order: Number.parseInt(String(event.target.value || "1"), 10) || 1,
                    }))}
                  min={1}
                  type="number"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-slate-700">Status</span>
                <select
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                </select>
              </label>
            </div>

            <div className="space-y-3">
              {(Array.isArray(form.tasks) ? form.tasks : []).map((task, index) => {
                const options = Array.isArray(sourcesByType[task.taskType]) ? sourcesByType[task.taskType] : [];
                const selectedSource = options.find((source) => String(source?._id || "") === String(task.taskRefId || ""));
                const selectedSourceLabel = selectedSource ? buildSourceOptionLabel(task.taskType, selectedSource) : "";

                return (
                  <div
                    key={`task-row-${index + 1}`}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 sm:p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Task {index + 1}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
                          onClick={() => moveTaskRow(index, "up")}
                          type="button"
                        >
                          Up
                        </button>
                        <button
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
                          onClick={() => moveTaskRow(index, "down")}
                          type="button"
                        >
                          Down
                        </button>
                        <button
                          className="rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          onClick={() => removeTaskRow(index)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 grid min-w-0 gap-2 md:grid-cols-[240px_minmax(0,1fr)]">
                      <select
                        className="w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        value={task.taskType}
                        onChange={(event) =>
                          setTaskRowAt(index, {
                            taskType: event.target.value,
                            taskRefId: "",
                          })}
                      >
                        {TASK_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <select
                        className="w-full min-w-0 max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                        value={task.taskRefId}
                        onChange={(event) => setTaskRowAt(index, { taskRefId: event.target.value })}
                        title={selectedSourceLabel || "Select task"}
                      >
                        <option value="">Select task</option>
                        {options.map((source) => (
                          <option key={source._id} value={source._id}>
                            {truncateWithEllipsis(buildSourceOptionLabel(task.taskType, source))}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:text-emerald-700"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    tasks: [...current.tasks, createDefaultTaskRow(current.tasks.length + 1)],
                  }))}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </button>

              <button
                className="emerald-gradient-fill inline-flex items-center gap-2 rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
                disabled={isSaving}
                type="submit"
              >
                <Save className="h-4 w-4" />
                {isSaving ? "Saving..." : isEditing ? "Update Unit" : "Create Unit"}
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-slate-900">Existing Units</h2>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              {unitsSummary.total} total
            </span>
          </div>
          {isLoading ? (
            <div className="mt-4">
              <AdminListSkeleton rows={4} />
            </div>
          ) : sortedUnits.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No units yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {sortedUnits.map((unit) => (
                <div
                  key={unit._id}
                  className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">
                        #{unit.order} {unit.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${resolveStatusBadgeClass(unit.status)}`}>
                          {unit.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {Array.isArray(unit.tasks) ? unit.tasks.length : 0} tasks
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                        onClick={() => startEditing(unit)}
                        type="button"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-rose-600 transition hover:bg-rose-50"
                        onClick={() => handleDelete(unit._id)}
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {(Array.isArray(unit.tasks) ? unit.tasks : []).map((task) => (
                      <div
                        key={`${unit._id}-${task.taskType}-${task.taskRefId}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1.5"
                      >
                        <span className="font-semibold text-slate-500">{task.order}.</span>
                        <span className="font-medium text-slate-700">
                          {TASK_TYPE_LABEL_BY_VALUE[task.taskType] || task.taskType}
                        </span>
                        <span className="truncate text-slate-500">{task.taskRefId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

export default SuperAdminDailyUnitsPage;
