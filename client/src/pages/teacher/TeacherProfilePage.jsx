import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Mail, ShieldCheck, UserCircle } from "lucide-react";
import ExamPopup from "../../components/student/exam/ExamPopup";
import { getStoredUser, saveAuthSession } from "../../lib/authSession";
import { getTeacherProfile, updateTeacherPassword, updateTeacherProfile } from "../../services/teacherService";

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getInitials(name, email) {
  const nameParts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (nameParts.length) {
    return nameParts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
  }
  return String(email || "TH").slice(0, 2).toUpperCase();
}

function AccountOverviewCard({ fullName, email, initials }) {
  return (
    <section className="relative grid overflow-hidden rounded-none border border-dashed border-slate-700/90 bg-gradient-to-br from-[#062316] via-[#050505] to-[#061421] lg:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:28px_28px]" />

      <article className="relative p-7 lg:border-r lg:border-dashed lg:border-white/10">
        <span className="inline-flex h-14 w-14 items-center justify-center border border-white/10 bg-white/[0.08] text-lg font-semibold text-white">
          {initials}
        </span>
        <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/45">
          Account Overview
        </p>
        <p className="mt-2 text-2xl font-semibold text-white">{fullName}</p>
        <p className="mt-2 text-sm text-white/70">{email}</p>
      </article>

      <article className="relative p-7">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/45">
          Teacher Workspace
        </p>
        <p className="mt-2 text-xl font-semibold text-white">Protected teacher account</p>
        <div className="mt-4 inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
          <ShieldCheck className="h-4 w-4" />
          Active
        </div>
        <p className="mt-4 text-sm leading-7 text-white/65">
          Profile details are used inside Teacher Hub for classroom management, student visibility, and account identity.
        </p>
      </article>
    </section>
  );
}

function ActionButton({ children, onClick, disabled = false, tone = "emerald" }) {
  const toneClass = tone === "rose"
    ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
    : "emerald-gradient-fill border-emerald-300/20 text-white shadow-[0_14px_36px_-28px_rgba(16,185,129,0.8)]";

  return (
    <button
      className={`inline-flex w-[106px] items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function SettingsDisplayCard({ icon, title, value, subtitle, actionLabel, onAction }) {
  const Icon = icon;

  return (
    <article className="rounded-none border border-slate-200/80 bg-white/90 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200/80 bg-slate-50 text-slate-600">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-base font-semibold text-slate-900">
              {value}
            </p>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {actionLabel ? <ActionButton onClick={onAction}>{actionLabel}</ActionButton> : null}
      </div>
    </article>
  );
}

function ModalActions({ isSaving = false, onCancel, saveLabel = "Save" }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <button
        className="bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        onClick={onCancel}
        type="button"
      >
        Cancel
      </button>
      <button
        className="emerald-gradient-fill rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSaving}
        type="submit"
      >
        {isSaving ? "Saving..." : saveLabel}
      </button>
    </div>
  );
}

function TeacherProfilePage() {
  const storedUser = getStoredUser();
  const [profile, setProfile] = useState(() => ({
    fullName: storedUser?.fullName || storedUser?.name || "Teacher",
    email: storedUser?.email || "teacher@example.com",
    passwordMasked: "************",
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeModal, setActiveModal] = useState("");
  const [nameInput, setNameInput] = useState(profile.fullName);
  const [emailInput, setEmailInput] = useState(profile.email);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [modalError, setModalError] = useState("");
  const [savingField, setSavingField] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const initials = useMemo(() => getInitials(profile.fullName, profile.email), [profile.email, profile.fullName]);

  const syncStoredUser = useCallback((nextProfile) => {
    const currentStoredUser = getStoredUser();
    if (!currentStoredUser) {
      return;
    }

    saveAuthSession({
      user: {
        ...currentStoredUser,
        fullName: nextProfile?.fullName || currentStoredUser.fullName,
        email: nextProfile?.email || currentStoredUser.email,
      },
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getTeacherProfile();
      const nextProfile = {
        fullName: response?.profile?.fullName || storedUser?.fullName || storedUser?.name || "Teacher",
        email: response?.profile?.email || storedUser?.email || "teacher@example.com",
        passwordMasked: response?.profile?.passwordMasked || "************",
      };
      setProfile(nextProfile);
      setNameInput(nextProfile.fullName);
      setEmailInput(nextProfile.email);
      syncStoredUser(nextProfile);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, [storedUser?.email, storedUser?.fullName, storedUser?.name, syncStoredUser]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const closeModal = () => {
    if (savingField) {
      return;
    }
    setActiveModal("");
    setModalError("");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    });
  };

  const openModal = (field) => {
    setSuccessMessage("");
    setModalError("");
    setActiveModal(field);
    if (field === "fullName") {
      setNameInput(profile.fullName);
    }
    if (field === "email") {
      setEmailInput(profile.email);
    }
    if (field === "password") {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    }
  };

  const saveProfile = async (fieldKey) => {
    setModalError("");
    setSuccessMessage("");
    setErrorMessage("");

    const payload = {};
    if (fieldKey === "fullName") {
      const trimmedName = String(nameInput || "").trim();
      if (trimmedName.length < 2) {
        setModalError("Name must be at least 2 characters.");
        return;
      }
      payload.fullName = trimmedName;
    } else if (fieldKey === "email") {
      const trimmedEmail = String(emailInput || "").trim().toLowerCase();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        setModalError("Please provide a valid email address.");
        return;
      }
      payload.email = trimmedEmail;
    } else {
      return;
    }

    setSavingField(fieldKey);
    try {
      const response = await updateTeacherProfile(payload);
      const nextProfile = {
        ...profile,
        ...(response?.profile || payload),
        passwordMasked: response?.profile?.passwordMasked || profile.passwordMasked,
      };
      setProfile(nextProfile);
      syncStoredUser(nextProfile);
      setSuccessMessage("Profile updated successfully.");
      setActiveModal("");
    } catch (error) {
      setModalError(error?.message || "Profile update failed.");
    } finally {
      setSavingField("");
    }
  };

  const savePassword = async () => {
    setModalError("");
    setSuccessMessage("");

    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmNewPassword = String(passwordForm.confirmNewPassword || "");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setModalError("Fill in current password, new password, and confirmation.");
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      setModalError("Password must be at least 8 characters with at least one letter and one number.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setModalError("New password confirmation does not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setModalError("New password must be different from current password.");
      return;
    }

    setSavingField("password");
    try {
      await updateTeacherPassword({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setSuccessMessage("Password updated successfully.");
      setActiveModal("");
    } catch (error) {
      setModalError(error?.message || "Password update failed.");
    } finally {
      setSavingField("");
    }
  };

  return (
    <div className="space-y-8 pb-16 pt-4">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Account Settings
        </p>
      </header>

      {isLoading ? <p className="text-sm text-slate-500">Loading profile...</p> : null}
      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}

      <AccountOverviewCard email={profile.email} fullName={profile.fullName} initials={initials} />

      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Personal Info
        </p>
        <div className="grid gap-4">
          <SettingsDisplayCard
            actionLabel="Change"
            icon={UserCircle}
            subtitle="Displayed in your teacher account"
            title="Name"
            value={profile.fullName}
            onAction={() => openModal("fullName")}
          />
          <SettingsDisplayCard
            actionLabel="Change"
            icon={Mail}
            subtitle="Used for login and notifications"
            title="Email"
            value={profile.email}
            onAction={() => openModal("email")}
          />
        </div>
      </section>

      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Security
        </p>
        <div className="grid gap-4">
          <SettingsDisplayCard
            actionLabel="Change"
            icon={KeyRound}
            subtitle="Use your current password to set a new one"
            title="Password"
            value={profile.passwordMasked}
            onAction={() => openModal("password")}
          />
          <article className="rounded-none border border-slate-200/80 bg-white/90 p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200/80 bg-slate-50 text-slate-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Teacher Access
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  This account can manage classes and student progress.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Notifications, invitations, and classroom controls remain inside Teacher Hub.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <ExamPopup isOpen={activeModal === "fullName"} maxWidthClass="max-w-lg" onClose={closeModal}>
        <form
          className="space-y-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile("fullName");
          }}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Change Name</p>
            <p className="text-sm leading-6 text-slate-600">Update how your name appears across Teacher Hub.</p>
          </div>
          <input
            autoFocus
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            maxLength={80}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="Full name"
            value={nameInput}
          />
          {modalError ? <p className="text-sm text-rose-600">{modalError}</p> : null}
          <ModalActions
            isSaving={savingField === "fullName"}
            onCancel={closeModal}
          />
        </form>
      </ExamPopup>

      <ExamPopup isOpen={activeModal === "email"} maxWidthClass="max-w-lg" onClose={closeModal}>
        <form
          className="space-y-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfile("email");
          }}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Change Email</p>
            <p className="text-sm leading-6 text-slate-600">Use a valid email address for login and account messages.</p>
          </div>
          <input
            autoFocus
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            maxLength={160}
            onChange={(event) => setEmailInput(event.target.value)}
            placeholder="Email address"
            type="email"
            value={emailInput}
          />
          {modalError ? <p className="text-sm text-rose-600">{modalError}</p> : null}
          <ModalActions
            isSaving={savingField === "email"}
            onCancel={closeModal}
          />
        </form>
      </ExamPopup>

      <ExamPopup isOpen={activeModal === "password"} maxWidthClass="max-w-2xl" onClose={closeModal}>
        <form
          className="space-y-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            void savePassword();
          }}
        >
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Change Password</p>
            <p className="text-sm leading-6 text-slate-600">
              Use at least 8 characters with at least one letter and one number.
            </p>
          </div>
          <input
            autoFocus
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
            }
            placeholder="Current password"
            type="password"
            value={passwordForm.currentPassword}
          />
          <input
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
            }
            placeholder="New password"
            type="password"
            value={passwordForm.newPassword}
          />
          <input
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, confirmNewPassword: event.target.value }))
            }
            placeholder="Confirm new password"
            type="password"
            value={passwordForm.confirmNewPassword}
          />
          {modalError ? <p className="text-sm text-rose-600">{modalError}</p> : null}
          <ModalActions
            isSaving={savingField === "password"}
            onCancel={closeModal}
          />
        </form>
      </ExamPopup>
    </div>
  );
}

export default TeacherProfilePage;
