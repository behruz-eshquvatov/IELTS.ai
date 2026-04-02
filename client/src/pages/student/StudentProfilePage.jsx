function StudentProfilePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Profile & Settings
        </p>
        <h1 className="text-3xl font-semibold">Manage your account</h1>
        <p className="text-slate-600">
          Update identity information, preferences, and subscription details.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Identity</p>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>Name: Amina Jurayeva</p>
            <p>Email: amina@example.com</p>
          </div>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Subscription</p>
          <p className="mt-3 text-lg font-semibold">Pro · Monthly</p>
          <p className="mt-2 text-sm text-slate-600">Renews in 12 days</p>
        </div>
      </div>
    </div>
  );
}

export default StudentProfilePage;


