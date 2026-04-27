import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Mail, NotebookPen, ShieldCheck, UserCircle } from "lucide-react";
import ExamPopup from "../../components/student/exam/ExamPopup";
import MagneticButton from "../../components/ui/MagneticButton";
import { ProfileSkeleton } from "../../components/ui/Skeleton";
import { apiRequest } from "../../lib/apiClient";
import { getStoredUser, saveAuthSession } from "../../lib/authSession";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const PROFILE_BIO_MAX_LENGTH = 300;

const defaultProfile = {
  fullName: "Student",
  email: "student@example.com",
  bio: "",
  memberSince: "January 2026",
  createdAt: null,
  subscription: {
    planName: "Student subscription",
    status: "Active subscription",
    benefits: [
      "Skill-based Listening, Reading, and Writing practice",
      "Structured feedback with weak-pattern visibility",
      "Progress tracking, timing behavior, and retry history",
    ],
  },
  security: {
    passwordMasked: "************",
    lastUpdatedLabel: "",
  },
};

function AccountOverviewCard({ fullName, email, memberSince, subscription }) {
  return (
    <section className="relative grid overflow-hidden rounded-none border border-dashed border-slate-700/90 bg-gradient-to-br from-[#062316] via-[#050505] to-[#061421] lg:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full border border-dashed border-emerald-300/25" />
      <div className="pointer-events-none absolute -bottom-14 left-1/3 h-32 w-32 rounded-full border border-dashed border-cyan-300/20" />

      <article className="relative p-7 lg:border-r lg:border-dashed lg:border-white/10">
        <div className="relative z-10">
          <span className="inline-flex h-12 w-12 items-center justify-center border border-white/10 bg-white/[0.08] text-white">
            <UserCircle className="h-5 w-5" />
          </span>
          <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/45">
            Account Overview
          </p>
          <p className="mt-2 text-2xl font-semibold text-white">{fullName}</p>
          <p className="mt-2 text-sm text-white/70">{email}</p>
          <p className="mt-2 text-sm text-white/60">Member since {memberSince}</p>
        </div>
      </article>

      <article className="relative p-7">
        <div className="relative z-10">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/45">
            Subscription
          </p>
          <p className="mt-2 text-xl font-semibold text-white">
            {subscription?.planName || "Student subscription"}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 border border-emerald-300/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-300">
            {subscription?.status || "Active"}
          </div>
          <p className="mt-4 text-sm leading-7 text-white/65">
            Subscription and billing controls are being prepared. Account settings are available now.
          </p>
        </div>
      </article>
    </section>
  );
}

function ActionButton({ label, onClick, disabled = false }) {
  return (
    <MagneticButton
      className="rounded-full"
      innerClassName="emerald-gradient-fill rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-[0_14px_36px_-28px_rgba(16,185,129,0.8)] transition hover:shadow-[0_18px_44px_-28px_rgba(16,185,129,0.9)] disabled:cursor-not-allowed disabled:opacity-60"
      onClick={onClick}
      type="button"
      disabled={disabled}
    >
      {label}
    </MagneticButton>
  );
}

function SettingsDisplayCard({
  icon,
  title,
  value,
  subtitle,
  actionLabel,
  onAction,
  isActionDisabled = false,
}) {
  const IconComponent = icon;

  return (
    <article className="rounded-none border border-slate-200/80 bg-white/90 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200/80 bg-slate-50 text-slate-600">
            <IconComponent className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-base font-semibold text-slate-900">
              {value}
            </p>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        <ActionButton label={actionLabel} onClick={onAction} disabled={isActionDisabled} />
      </div>
    </article>
  );
}

function ModalHeader({ title, description }) {
  return (
    <div className="space-y-2 text-left">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
      {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );
}

function ModalActions({ isSaving, saveLabel = "Save", onCancel }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <button
        className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

function StudentProfilePage() {
  const [profile, setProfile] = useState(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [activeModal, setActiveModal] = useState("");
  const [modalError, setModalError] = useState("");
  const [savingField, setSavingField] = useState("");

  const [nameInput, setNameInput] = useState(defaultProfile.fullName);
  const [emailInput, setEmailInput] = useState(defaultProfile.email);
  const [bioInput, setBioInput] = useState(defaultProfile.bio);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const syncStoredUser = useCallback((nextProfile) => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      return;
    }

    saveAuthSession({
      user: {
        ...storedUser,
        fullName: nextProfile?.fullName || storedUser.fullName,
        email: nextProfile?.email || storedUser.email,
      },
    });
  }, []);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiRequest("/students/me/profile");
      const nextProfile = response?.profile
        ? { ...defaultProfile, ...response.profile }
        : defaultProfile;
      setProfile(nextProfile);
      setNameInput(nextProfile.fullName || "");
      setEmailInput(nextProfile.email || "");
      setBioInput(nextProfile.bio || "");
    } catch (error) {
      setErrorMessage(error.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const closeModal = useCallback(() => {
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
  }, [savingField]);

  const openModal = useCallback((fieldKey) => {
    setErrorMessage("");
    setSuccessMessage("");
    setModalError("");
    setActiveModal(fieldKey);

    if (fieldKey === "fullName") {
      setNameInput(profile.fullName || "");
      return;
    }

    if (fieldKey === "email") {
      setEmailInput(profile.email || "");
      return;
    }

    if (fieldKey === "bio") {
      setBioInput(profile.bio || "");
      return;
    }

    if (fieldKey === "password") {
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    }
  }, [profile.bio, profile.email, profile.fullName]);

  const saveField = useCallback(async (fieldKey) => {
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
    } else if (fieldKey === "bio") {
      payload.bio = String(bioInput || "").trim().slice(0, PROFILE_BIO_MAX_LENGTH);
    } else {
      return;
    }

    setSavingField(fieldKey);
    try {
      const response = await apiRequest("/students/me/profile", {
        method: "PATCH",
        body: payload,
      });
      const nextProfile = response?.profile
        ? { ...defaultProfile, ...response.profile }
        : profile;
      setProfile(nextProfile);
      setActiveModal("");
      setSuccessMessage("Profile updated successfully.");
      syncStoredUser(nextProfile);
    } catch (error) {
      setModalError(error.message || "Profile update failed.");
    } finally {
      setSavingField("");
    }
  }, [bioInput, emailInput, nameInput, profile, syncStoredUser]);

  const savePassword = useCallback(async () => {
    setModalError("");
    setSuccessMessage("");
    setErrorMessage("");

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

    setSavingField("password");
    try {
      await apiRequest("/students/me/profile/password", {
        method: "PATCH",
        body: {
          currentPassword,
          newPassword,
          confirmNewPassword,
        },
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
      setActiveModal("");
      setSuccessMessage("Password updated successfully.");
      await loadProfile();
    } catch (error) {
      setModalError(error.message || "Password update failed.");
    } finally {
      setSavingField("");
    }
  }, [loadProfile, passwordForm.confirmNewPassword, passwordForm.currentPassword, passwordForm.newPassword]);

  const trimmedBio = String(profile.bio || "").trim();
  const bioActionLabel = trimmedBio ? "Change" : "Add";
  const bioValue = trimmedBio || "Add a short bio to personalize your profile.";
  const bioSubtitle = useMemo(() => {
    if (!trimmedBio) {
      return "Visible in your account profile";
    }

    return `${trimmedBio.length}/${PROFILE_BIO_MAX_LENGTH} characters`;
  }, [trimmedBio]);

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-8 pb-16 pt-4">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-600">
          Account Settings
        </p>
      </header>

      <AccountOverviewCard
        email={profile.email}
        fullName={profile.fullName}
        memberSince={profile.memberSince}
        subscription={profile.subscription}
      />

      <section className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Personal Info
        </p>
        <div className="grid gap-4">
          <SettingsDisplayCard
            actionLabel="Change"
            icon={UserCircle}
            subtitle="Displayed in your account profile"
            title="Name"
            value={profile.fullName || "Student"}
            onAction={() => openModal("fullName")}
            isActionDisabled={Boolean(savingField)}
          />

          <SettingsDisplayCard
            actionLabel="Change"
            icon={Mail}
            subtitle="Used for login and notifications"
            title="Email"
            value={profile.email || "student@example.com"}
            onAction={() => openModal("email")}
            isActionDisabled={Boolean(savingField)}
          />

          <SettingsDisplayCard
            actionLabel={bioActionLabel}
            icon={NotebookPen}
            subtitle={bioSubtitle}
            title="Bio"
            value={bioValue}
            onAction={() => openModal("bio")}
            isActionDisabled={Boolean(savingField)}
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
            subtitle={profile.security?.lastUpdatedLabel || "Not updated recently"}
            title="Password"
            value={profile.security?.passwordMasked || "************"}
            onAction={() => openModal("password")}
            isActionDisabled={Boolean(savingField)}
          />

          <article className="rounded-none border border-slate-200/80 bg-white/90 p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border border-slate-200/80 bg-slate-50 text-slate-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Subscription
                </p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  Billing controls are not enabled in this version.
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Your account and learning progress are active. Subscription management UI will be added later.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <ExamPopup isOpen={activeModal === "fullName"} maxWidthClass="max-w-lg" onClose={closeModal}>
        <form
          className="space-y-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            void saveField("fullName");
          }}
        >
          <ModalHeader
            title="Change Name"
            description="Update how your name appears across your student profile."
          />
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
            void saveField("email");
          }}
        >
          <ModalHeader
            title="Change Email"
            description="Use a valid email address. This email is used for login and account communication."
          />
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

      <ExamPopup isOpen={activeModal === "bio"} maxWidthClass="max-w-2xl" onClose={closeModal}>
        <form
          className="space-y-4 text-left"
          onSubmit={(event) => {
            event.preventDefault();
            void saveField("bio");
          }}
        >
          <ModalHeader
            title={trimmedBio ? "Change Bio" : "Add Bio"}
            description="Write a short profile bio. Keep it focused and clear."
          />
          <textarea
            autoFocus
            className="h-44 w-full resize-none rounded-none border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-emerald-300"
            maxLength={PROFILE_BIO_MAX_LENGTH}
            onChange={(event) => setBioInput(event.target.value)}
            placeholder="Tell us about your learning goals..."
            value={bioInput}
          />
          <p className="text-xs text-slate-500">
            {String(bioInput || "").trim().length}/{PROFILE_BIO_MAX_LENGTH}
          </p>
          {modalError ? <p className="text-sm text-rose-600">{modalError}</p> : null}
          <ModalActions
            isSaving={savingField === "bio"}
            saveLabel={trimmedBio ? "Save Bio" : "Add Bio"}
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
          <ModalHeader
            title="Change Password"
            description="Use at least 8 characters with at least one letter and one number."
          />
          <input
            autoFocus
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            onChange={(event) =>
              setPasswordForm((previous) => ({ ...previous, currentPassword: event.target.value }))
            }
            placeholder="Current password"
            type="password"
            value={passwordForm.currentPassword}
          />
          <input
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            onChange={(event) =>
              setPasswordForm((previous) => ({ ...previous, newPassword: event.target.value }))
            }
            placeholder="New password"
            type="password"
            value={passwordForm.newPassword}
          />
          <input
            className="w-full rounded-none border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-300"
            onChange={(event) =>
              setPasswordForm((previous) => ({ ...previous, confirmNewPassword: event.target.value }))
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

export default StudentProfilePage;
