import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import InteractiveGridBackground from "../components/layout/InteractiveGridBackground";
import MagneticButton from "../components/ui/MagneticButton";
import { authApi } from "../lib/apiClient";
import {
  FORGOT_AUTH_IMAGE_URL,
  authBackButtonInnerClass,
  authInlineLinkClass,
  authPrimaryButtonClass,
  authInputBaseClass,
} from "../lib/authUi";

const MotionSection = motion.section;
const MotionDiv = motion.div;

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onToggleShow,
  autoComplete,
}) {
  return (
    <label className="block space-y-2.5">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]">{label}</span>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className={`auth-input ${authInputBaseClass} border-black/10 bg-transparent pr-14 text-slate-900 placeholder:text-slate-400 focus:border-slate-950/25`}
          onChange={onChange}
          placeholder={placeholder}
          type={show ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center p-2 text-slate-500 transition hover:text-slate-800"
          onClick={onToggleShow}
          type="button"
        >
          {show ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </div>
    </label>
  );
}

function ResetPasswordPage() {
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const isTeacherRoute = location.pathname.startsWith("/teachers/");
  const backAuthRoute = isTeacherRoute ? "/teachers/auth" : "/student/auth";

  const token = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return String(params.get("token") || "").trim();
  }, [location.search]);

  useEffect(() => {
    let cancelled = false;

    async function verifyToken() {
      if (!token) {
        setStatus({
          type: "error",
          message: "Reset token is missing from the link.",
        });
        setIsVerifyingToken(false);
        setIsTokenValid(false);
        return;
      }

      setIsVerifyingToken(true);
      setStatus(null);

      try {
        await authApi.verifyResetPasswordToken({ token });

        if (cancelled) {
          return;
        }

        setIsTokenValid(true);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setIsTokenValid(false);
        setStatus({
          type: "error",
          message: error.message || "Reset link is invalid or expired.",
        });
      } finally {
        if (!cancelled) {
          setIsVerifyingToken(false);
        }
      }
    }

    verifyToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isTokenValid || isSubmitting) {
      return;
    }

    if (!password || !confirmPassword) {
      setStatus({
        type: "error",
        message: "Please fill in both password fields.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await authApi.resetPassword({
        token,
        password,
        confirmPassword,
      });

      setStatus({
        type: "success",
        message: response?.message || "Password has been reset successfully.",
      });
      setPassword("");
      setConfirmPassword("");
      setIsTokenValid(false);
    } catch (error) {
      setStatus({
        type: "error",
        message: error.message || "Could not reset password.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className="font-manrope relative min-h-screen overflow-hidden bg-[#f7f4ef] text-slate-950"
      style={{
        "--page-accent-rgb": "16, 185, 129",
        "--auth-autofill-bg-rgb": "247, 244, 239",
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <InteractiveGridBackground
          className="opacity-60"
          style={{
            "--grid-default-y": "28%",
            "--grid-mask-size": "760px",
          }}
        />
        <div className="absolute left-[-10%] top-[-12%] h-[22rem] w-[22rem] bg-white/75 blur-3xl" />
        <div className="absolute bottom-[-16%] right-[-8%] h-[26rem] w-[26rem] bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-5 py-10 sm:px-8 lg:px-10">
        <MotionSection
          animate={{ opacity: 1, y: 0 }}
          className="w-full overflow-hidden bg-[#f7f4ef] shadow-[0_36px_110px_-52px_rgba(15,23,42,0.34)]"
          initial={{ opacity: 0, y: 26 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid min-h-[42rem] w-full xl:grid-cols-[1.02fr_0.98fr]">
            <div className="relative min-h-[18rem] overflow-hidden border-b border-slate-200/12 xl:min-h-full xl:border-b-0 xl:border-r xl:border-r-slate-200/12">
              <img
                alt="Minimal architectural light and shadow composition"
                className="absolute inset-0 h-full w-full object-cover"
                src={FORGOT_AUTH_IMAGE_URL}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(247,244,239,0.08),rgba(15,23,42,0.08)_38%,rgba(15,23,42,0.72)_100%)]" />

              <div className="relative flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
                <MagneticButton
                  disableMagnetic
                  disableGlow
                  innerClassName={authBackButtonInnerClass}
                  to={backAuthRoute}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to auth</span>
                </MagneticButton>

                <div className="max-w-xl space-y-4">
                  <div>
                    <div className="mb-4 inline-flex flex-col items-start">
                      <span className="block h-px w-full bg-white/76" />
                      <p className="mt-1 text-[1rem] leading-8 text-white/76 sm:text-[1.08rem]">
                        Password reset
                      </p>
                    </div>
                    <h1 className="max-w-xl text-4xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                      Choose a new password.
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col p-6 sm:p-8 lg:p-10">
              <div className="mt-8 border-current/10 pb-6">
                <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.65rem]">
                  Secure your account.
                </h2>
              </div>

              <div className="flex-1 pt-8">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <PasswordField
                    autoComplete="new-password"
                    label="New password"
                    onChange={(event) => setPassword(event.target.value)}
                    onToggleShow={() => setShowPassword((current) => !current)}
                    placeholder="At least 8 chars, include letter + number"
                    show={showPassword}
                    value={password}
                  />

                  <PasswordField
                    autoComplete="new-password"
                    label="Confirm password"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    onToggleShow={() => setShowConfirmPassword((current) => !current)}
                    placeholder="Repeat new password"
                    show={showConfirmPassword}
                    value={confirmPassword}
                  />

                  <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 text-sm leading-7 text-slate-600">
                      <KeyRound className="mt-1 h-4 w-4 text-slate-500" />
                      <p>Your old sessions will be signed out.</p>
                    </div>

                    <MagneticButton
                      className="rounded-full"
                      disabled={!isTokenValid || isVerifyingToken || isSubmitting}
                      innerClassName={authPrimaryButtonClass}
                      type="submit"
                    >
                      <span className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                        <span className="h-full w-8 bg-white/30 blur-sm" />
                      </span>
                      <span className="relative">
                        {isVerifyingToken
                          ? "Checking link..."
                          : isSubmitting
                            ? "Saving..."
                            : "Reset password"}
                      </span>
                    </MagneticButton>
                  </div>

                  <div className="text-sm leading-7 text-slate-600">
                    <span>Remembered your password?</span>{" "}
                    <Link className={authInlineLinkClass} to={backAuthRoute}>
                      Back to login
                    </Link>
                  </div>

                  {status?.message ? (
                    <MotionDiv
                      animate={{ opacity: 1, y: 0 }}
                      className={`px-4 py-4 text-sm leading-7 ${
                        status.type === "error"
                          ? "border border-rose-300/70 bg-rose-50 text-rose-700"
                          : "border border-emerald-500/18 bg-emerald-500/8 text-emerald-700"
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                    >
                      {status.message}
                    </MotionDiv>
                  ) : null}
                </form>
              </div>
            </div>
          </div>
        </MotionSection>
      </div>
    </section>
  );
}

export default ResetPasswordPage;

