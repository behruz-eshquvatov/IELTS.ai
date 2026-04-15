import { Headphones, LockKeyhole } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { buildSuperAdminPagePath, isValidSuperAdminPassword } from "../lib/superAdmin";

function SuperAdminPage() {
  const { password = "" } = useParams();
  const isValidPassword = isValidSuperAdminPassword(password);

  if (!isValidPassword) {
    return (
      <section className="min-h-screen bg-[#f5f1ea] px-4 py-20 sm:px-8">
        <div className="mx-auto max-w-3xl border border-slate-200/80 bg-white p-10 text-center shadow-[0_30px_90px_-52px_rgba(15,23,42,0.34)]">
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
    <section className="min-h-screen bg-[#f5f1ea] px-4 py-14 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="border border-emerald-200/80 bg-emerald-50/70 p-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            <LockKeyhole className="h-3.5 w-3.5" />
            Super admin zone
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
            Base management
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            Use this area to add and manage data in your base. The listening section is ready for
            audio uploads with filename-based IDs.
          </p>
        </div>

        <article className="border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-emerald-700">
                <Headphones className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Listening</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                Listening tests control
              </h2>
              <p className="mt-2 text-slate-600">
                Upload audio files and manage the `listening_audios` collection.
              </p>
            </div>

            <Link
              className="emerald-gradient-fill inline-flex items-center justify-center rounded-full border border-emerald-300/20 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)] transition-transform duration-200 hover:-translate-y-0.5"
              to={buildSuperAdminPagePath(password, "/listening")}
            >
              Open listening manager
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

export default SuperAdminPage;
