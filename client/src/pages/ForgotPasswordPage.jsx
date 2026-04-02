import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import InteractiveGridBackground from "../components/layout/InteractiveGridBackground";
import MagneticButton from "../components/ui/MagneticButton";
import {
  FORGOT_AUTH_IMAGE_URL,
  authBackButtonInnerClass,
  authInlineLinkClass,
  authPrimaryButtonClass,
  authInputBaseClass,
} from "../lib/authUi";

const MotionSection = motion.section;
const MotionDiv = motion.div;

function AuthField({ label, value, onChange, placeholder, type = "text", autoComplete }) {
  return (
    <label className="block space-y-2.5">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]">{label}</span>
      <input
        autoComplete={autoComplete}
        className={`auth-input ${authInputBaseClass} border-black/10 bg-transparent text-slate-900 placeholder:text-slate-400 focus:border-slate-950/25`}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </label>
  );
}

function ForgotPasswordPage() {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const isTeacherRoute = location.pathname.startsWith("/teachers/");
  const backAuthRoute = isTeacherRoute ? "/teachers/auth" : "/student/auth";
  const alternateAuthRoute = isTeacherRoute ? "/student/auth" : "/teachers/auth";
  const alternateAuthLabel = isTeacherRoute ? "Student auth" : "Teacher auth";

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatusMessage("Recovery UI is ready for your real email reset flow.");
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
                      Reset your access.
                    </h1>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col p-6 sm:p-8 lg:p-10">
              <div className="mt-8 border-current/10 pb-6">
                <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.65rem]">
                  We&apos;ll send a reset link.
                </h2>
              </div>

              <div className="flex-1 pt-8">
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <AuthField
                    autoComplete="email"
                    label="Email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    value={email}
                  />

                  <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 text-sm leading-7 text-slate-600">
                      <Mail className="mt-1 h-4 w-4 text-slate-500" />
                      <p>Use the email tied to your account.</p>
                    </div>

                    <MagneticButton
                      className="rounded-full"
                      innerClassName={authPrimaryButtonClass}
                      type="submit"
                    >
                      <span className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                        <span className="h-full w-8 bg-white/30 blur-sm" />
                      </span>
                      <span className="relative">Send reset link</span>
                    </MagneticButton>
                  </div>
                  <div className=" flex flex-col gap-2 pt-2">
                    <div className="text-sm leading-7 text-slate-600">
                      <span>{isTeacherRoute ? "Need student access instead?" : "Need teacher access instead?"}</span>{" "}
                      <Link
                        className={authInlineLinkClass}
                        to={alternateAuthRoute}
                      >
                        {alternateAuthLabel}
                      </Link>
                    </div>

                    <div className="text-sm leading-7 text-slate-600">
                      <span>Remembered your password?</span>{" "}
                      <Link
                        className={authInlineLinkClass}
                        to={backAuthRoute}
                      >
                        Back to login
                      </Link>
                    </div>
                  </div>

                  {statusMessage ? (
                    <MotionDiv
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-emerald-500/18 bg-emerald-500/8 px-4 py-4 text-sm leading-7 text-emerald-700"
                      initial={{ opacity: 0, y: 10 }}
                    >
                      {statusMessage}
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

export default ForgotPasswordPage;
