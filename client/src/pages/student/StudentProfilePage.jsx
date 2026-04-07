import { useEffect, useRef, useState } from "react";
import { Check, CreditCard, GraduationCap, KeyRound, Mail } from "lucide-react";
import MagneticButton from "../../components/ui/MagneticButton";
import { apiRequest } from "../../lib/apiClient";

const defaultProfile = {
  fullName: "Student",
  email: "student@example.com",
  memberSince: "January 2026",
  subscription: {
    planName: "Student subscription",
    monthlyPrice: 19,
    status: "Active subscription",
    benefits: [
      "Skill-based Listening, Reading, and Writing practice",
      "Structured feedback with weak-pattern visibility",
      "Progress tracking, timing behavior, and retry history",
    ],
  },
  paymentMethod: {
    cardMasked: "**** **** **** 4821",
    label: "Primary payment method",
  },
  security: {
    passwordMasked: "************",
    lastUpdatedLabel: "Recently updated",
  },
  billingHistory: [],
};

function SubscriptionCard({ subscription }) {
  const cardRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const updatePointerPosition = (event) => {
      if (!cardRef.current || !isActive) return;
      const rect = cardRef.current.getBoundingClientRect();
      cardRef.current.style.setProperty("--card-x", `${event.clientX - rect.left}px`);
      cardRef.current.style.setProperty("--card-y", `${event.clientY - rect.top}px`);
    };

    window.addEventListener("pointermove", updatePointerPosition, { passive: true });
    return () => window.removeEventListener("pointermove", updatePointerPosition);
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (leaveTimeoutRef.current) {
        window.clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  const handlePointerEnter = () => {
    if (leaveTimeoutRef.current) {
      window.clearTimeout(leaveTimeoutRef.current);
    }
    setIsActive(true);
  };

  const handlePointerLeave = () => {
    if (leaveTimeoutRef.current) {
      window.clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = window.setTimeout(() => setIsActive(false), 220);
  };

  return (
    <article
      ref={cardRef}
      className="group relative overflow-hidden bg-white/10 p-[1.5px] shadow-[0_35px_100px_-60px_rgba(0,0,0,1)] transition duration-300"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div
        className={`pointer-events-none absolute inset-0 transition duration-300 ${
          isActive ? "opacity-100" : "opacity-0"
        }`}
        style={{
          backgroundImage:
            "radial-gradient(320px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,1), transparent 42%), radial-gradient(620px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.16), transparent 60%)",
        }}
      />

      <div className="relative overflow-hidden bg-[#0b0b0b] p-7">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_40%)]" />

        <div
          className={`pointer-events-none absolute inset-0 transition duration-300 ${
            isActive ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--card-x,_50%)_var(--card-y,_50%),rgba(16,185,129,0.18),transparent_44%)]" />
        </div>

        <div className="relative z-10">
          <span
            className={`inline-flex h-12 w-12 items-center justify-center border bg-white/[0.06] text-white transition duration-300 ${
              isActive ? "border-emerald-300/20 bg-white/[0.08]" : "border-white/10"
            }`}
          >
            <GraduationCap className="h-5 w-5" />
          </span>

          <p className="mt-5 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/42">
            {subscription?.planName || "Student subscription"}
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-[-0.08em] text-white">
              ${subscription?.monthlyPrice ?? 19}
            </span>
            <span className="pb-2 text-sm text-white/52">per month</span>
          </div>

          <p className="mt-5 max-w-xl text-[1rem] leading-8 text-white/68">
            Fixed student pricing model: ${subscription?.monthlyPrice ?? 19} per month.
          </p>

          <div className="mt-7 space-y-4 border-t border-white/8 pt-6">
            {(subscription?.benefits || []).map((feature) => (
              <div className="flex items-start gap-3" key={feature}>
                <span
                  className={`mt-1 inline-flex h-6 w-6 flex-none items-center justify-center border bg-white/[0.05] text-emerald-300 transition duration-300 ${
                    isActive ? "border-emerald-300/20 bg-emerald-500/10" : "border-white/10"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <p className="text-[0.96rem] leading-7 text-white/72">{feature}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
            {subscription?.status || "Active subscription"}
          </div>
        </div>
      </div>
    </article>
  );
}

function AccountOwnerCard({ fullName, memberSince }) {
  return (
    <article className="relative overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:26px_26px] opacity-20" />
      <div className="relative z-10 text-right">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/45">
          Account owner
        </p>
        <p className="mt-3 text-2xl font-semibold text-white">{fullName}</p>
        <p className="mt-2 text-sm text-white/60">Member since {memberSince}</p>
      </div>
    </article>
  );
}

function SettingsCard({ icon: Icon, title, value, subtitle, actionLabel }) {
  return (
    <article className="rounded-none border border-slate-200/80 bg-white/90 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200/80 bg-slate-50 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <MagneticButton
          className="rounded-full"
          innerClassName="emerald-gradient-fill rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_14px_36px_-28px_rgba(16,185,129,0.8)] transition hover:shadow-[0_18px_44px_-28px_rgba(16,185,129,0.9)]"
          type="button"
        >
          {actionLabel}
        </MagneticButton>
      </div>
    </article>
  );
}

function StudentProfilePage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await apiRequest("/students/me/profile");
        if (isMounted && response?.profile) {
          setProfile({ ...defaultProfile, ...response.profile });
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error.message || "Failed to load profile.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-8 pb-16 pt-4">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Profile
        </p>
      </header>

      <section>
        <div className="relative overflow-hidden border border-slate-900/80 bg-[#050505] p-3">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px] opacity-30" />
          <div className="relative grid gap-3 lg:grid-cols-2">
            <SubscriptionCard subscription={profile.subscription} />
            <AccountOwnerCard fullName={profile.fullName} memberSince={profile.memberSince} />
          </div>
        </div>
        {isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading profile...</p>
        ) : null}
        {errorMessage ? (
          <p className="mt-3 text-sm text-rose-600">{errorMessage}</p>
        ) : null}
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Security & Billing
        </p>
        <div className="grid gap-4">
          <SettingsCard
            actionLabel="Change"
            icon={Mail}
            subtitle="Used for login and notifications"
            title="Email"
            value={profile.email}
          />
          <SettingsCard
            actionLabel="Change"
            icon={CreditCard}
            subtitle={profile.paymentMethod?.label || "Primary payment method"}
            title="Card number"
            value={profile.paymentMethod?.cardMasked || "**** **** **** 4821"}
          />
          <SettingsCard
            actionLabel="Change"
            icon={KeyRound}
            subtitle={profile.security?.lastUpdatedLabel || "Recently updated"}
            title="Password"
            value={profile.security?.passwordMasked || "************"}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Billing history
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Recent invoices</h2>
        </div>
        <div className="rounded-none border border-slate-200/80 bg-white/90">
          {(profile.billingHistory || []).length === 0 ? (
            <p className="px-6 py-5 text-sm text-slate-500">No invoices yet.</p>
          ) : (profile.billingHistory || []).map((invoice, index) => (
            <div
              key={invoice.invoiceId}
              className={`flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm ${
                index !== (profile.billingHistory || []).length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <div>
                <p className="font-semibold text-slate-900">{invoice.invoiceId}</p>
                <p className="text-slate-500">{invoice.date}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-900">{invoice.amount}</p>
                <p className="text-emerald-600">{invoice.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default StudentProfilePage;
