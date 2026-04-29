import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../lib/apiClient";
import { AdminListSkeleton } from "../components/ui/Skeleton";
import { buildSuperAdminApiPath, buildSuperAdminPagePath, isValidSuperAdminPassword } from "../lib/superAdmin";

function buildEmptyForm() {
  return {
    name: "",
    status: "active",
  };
}

export default function SuperAdminOrganizationsPage() {
  const { password = "" } = useParams();
  const isPasswordValid = isValidSuperAdminPassword(password);
  const [organizations, setOrganizations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingOrganizationId, setEditingOrganizationId] = useState("");
  const [form, setForm] = useState(buildEmptyForm());
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isEditing = Boolean(editingOrganizationId);
  const summary = useMemo(() => {
    const active = organizations.filter((item) => item.status === "active").length;
    return { total: organizations.length, active, inactive: organizations.length - active };
  }, [organizations]);

  const loadOrganizations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await apiRequest(buildSuperAdminApiPath(password, "/organizations"), { auth: false });
      setOrganizations(Array.isArray(response?.organizations) ? response.organizations : []);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to load organizations.");
    } finally {
      setIsLoading(false);
    }
  }, [password]);

  useEffect(() => {
    if (!isPasswordValid) {
      return;
    }
    void loadOrganizations();
  }, [isPasswordValid, loadOrganizations]);

  function resetForm() {
    setEditingOrganizationId("");
    setForm(buildEmptyForm());
  }

  function startEditing(organization) {
    setEditingOrganizationId(String(organization?._id || ""));
    setForm({
      name: String(organization?.name || ""),
      status: String(organization?.status || "active"),
    });
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const name = String(form.name || "").trim();
    if (!name) {
      setErrorMessage("Organization name is required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const payload = { name, status: form.status === "inactive" ? "inactive" : "active" };
      if (isEditing) {
        await apiRequest(
          `${buildSuperAdminApiPath(password, "/organizations")}/${encodeURIComponent(editingOrganizationId)}`,
          { method: "PUT", body: payload, auth: false },
        );
      } else {
        await apiRequest(buildSuperAdminApiPath(password, "/organizations"), {
          method: "POST",
          body: payload,
          auth: false,
        });
      }
      setSuccessMessage(isEditing ? "Organization updated." : "Organization created.");
      resetForm();
      await loadOrganizations();
    } catch (error) {
      setErrorMessage(error?.message || "Failed to save organization.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(organizationId) {
    if (!window.confirm("Delete this organization?")) {
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(
        `${buildSuperAdminApiPath(password, "/organizations")}/${encodeURIComponent(String(organizationId || ""))}`,
        { method: "DELETE", auth: false },
      );
      if (editingOrganizationId === organizationId) {
        resetForm();
      }
      setSuccessMessage("Organization deleted.");
      await loadOrganizations();
    } catch (error) {
      setErrorMessage(error?.message || "Failed to delete organization.");
    }
  }

  async function handleToggleStatus(organization) {
    const nextStatus = organization?.status === "active" ? "inactive" : "active";
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await apiRequest(
        `${buildSuperAdminApiPath(password, "/organizations")}/${encodeURIComponent(String(organization?._id || ""))}`,
        { method: "PUT", body: { status: nextStatus }, auth: false },
      );
      setSuccessMessage(`Organization ${nextStatus === "active" ? "activated" : "deactivated"}.`);
      await loadOrganizations();
    } catch (error) {
      setErrorMessage(error?.message || "Failed to update organization status.");
    }
  }

  if (!isPasswordValid) {
    return (
      <section className="min-h-screen bg-[#f5f1ea] px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_30px_90px_-52px_rgba(15,23,42,0.34)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Super Admin</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Access denied</h1>
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
            Create Organization
          </button>
        </div>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-7">
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Organizations</h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white/90 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Total</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Active</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-800">{summary.active}</p>
            </div>
            <div className="rounded-xl border border-amber-200/90 bg-amber-50/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Inactive</p>
              <p className="mt-1 text-2xl font-semibold text-amber-800">{summary.inactive}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-7">
          {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div> : null}
          {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</div> : null}
          <form className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_auto]" onSubmit={handleSubmit}>
            <input
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Organization name"
              type="text"
              value={form.name}
            />
            <select
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
              value={form.status}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
            <button
              className="emerald-gradient-fill inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/20 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-70"
              disabled={isSaving}
              type="submit"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : isEditing ? "Update" : "Create"}
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)] sm:p-7">
          <h2 className="text-xl font-semibold text-slate-900">Existing Organizations</h2>
          {isLoading ? (
            <div className="mt-4"><AdminListSkeleton rows={4} /></div>
          ) : organizations.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No organizations yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {organizations.map((organization) => (
                <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-4" key={organization._id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{organization.name}</p>
                      <span className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] ${organization.status === "active" ? "border-emerald-300/60 bg-emerald-50 text-emerald-700" : "border-amber-300/60 bg-amber-50 text-amber-700"}`}>
                        {organization.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700" onClick={() => startEditing(organization)} type="button">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-slate-600 transition hover:border-amber-300 hover:text-amber-700" onClick={() => handleToggleStatus(organization)} type="button">
                        {organization.status === "active" ? "Deactivate" : "Activate"}
                      </button>
                      <button className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.13em] text-rose-600 transition hover:bg-rose-50" onClick={() => handleDelete(organization._id)} type="button">
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
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
