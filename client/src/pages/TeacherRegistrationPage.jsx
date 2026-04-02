import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import InteractiveGridBackground from "../components/layout/InteractiveGridBackground";
import MagneticButton from "../components/ui/MagneticButton";
import {
  TEACHER_AUTH_IMAGE_URL,
  authBackButtonInnerClass,
  authInlineLinkClass,
  authPrimaryButtonClass,
  authInputBaseClass,
} from "../lib/authUi";

const MotionDiv = motion.div;
const MotionSection = motion.section;
const MotionSpan = motion.span;

const teacherModes = {
  login: {
    label: "Teacher log in",
    title: "Return to your teacher workflow.",
    submitLabel: "Enter teacher view",
    successMessage: "Teacher login UI is ready for your real endpoint.",
    pageClass: "bg-[#050505] text-white",
    panelClass: "bg-[#0b0b0b]",
    panelShadowClass: "shadow-[0_28px_82px_-56px_rgba(255,255,255,0.14)]",
    autofillBgRgb: "11, 11, 11",
    gridClass: "opacity-35",
    glowPrimaryClass: "bg-white/8",
    glowAccentClass: "bg-emerald-500/12",
    dividerClass: "border-white/12",
    switcherIdleClass: "text-white/45",
    switcherActiveClass:
      "emerald-gradient-fill text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]",
    inputClass:
      "border-white/12 bg-transparent text-white placeholder:text-white/30 focus:border-white/30",
    eyeClass: "text-white/42",
    bodyClass: "text-white/68",
    checkboxClass: "border-white/20 accent-emerald-500",
    statusClass: "border border-emerald-400/16 bg-emerald-500/10 text-emerald-200",
    imageOverlayClass:
      "bg-[linear-gradient(180deg,rgba(5,5,5,0.1),rgba(5,5,5,0.16)_40%,rgba(5,5,5,0.78)_100%)]",
    imageMetaClass: "text-white/72",
    scrollTrackClass: "bg-white/10",
    scrollThumbClass: "bg-white/40 hover:bg-white/60",
  },
  signup: {
    label: "Teacher sign up",
    title: "Request access for your classroom.",
    submitLabel: "Create teacher account",
    successMessage: "Teacher signup UI is ready for your real onboarding flow.",
    pageClass: "bg-[#f7f4ef] text-slate-950",
    panelClass: "bg-[#f7f4ef]",
    panelShadowClass: "shadow-[0_36px_110px_-52px_rgba(15,23,42,0.34)]",
    autofillBgRgb: "247, 244, 239",
    gridClass: "opacity-60",
    glowPrimaryClass: "bg-white/75",
    glowAccentClass: "bg-emerald-500/8",
    dividerClass: "border-black/12",
    switcherIdleClass: "text-slate-500",
    switcherActiveClass:
      "emerald-gradient-fill text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]",
    inputClass:
      "border-black/10 bg-transparent text-slate-900 placeholder:text-slate-400 focus:border-slate-950/25",
    eyeClass: "text-slate-500",
    bodyClass: "text-slate-600",
    checkboxClass: "border-black/20 accent-emerald-500",
    statusClass: "border border-emerald-500/18 bg-emerald-500/8 text-emerald-700",
    imageOverlayClass:
      "bg-[linear-gradient(180deg,rgba(247,244,239,0.08),rgba(15,23,42,0.08)_38%,rgba(15,23,42,0.72)_100%)]",
    imageMetaClass: "text-white/76",
    scrollTrackClass: "bg-slate-200/70",
    scrollThumbClass: "bg-slate-500/50 hover:bg-slate-500/70",
  },
};

function TeacherField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  action,
  inputClassName,
}) {
  return (
    <label className="block space-y-2.5">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]">{label}</span>
      <div className="relative">
        <input
          autoComplete={autoComplete}
          className={`auth-input ${authInputBaseClass} ${inputClassName} ${action ? "pr-14" : ""}`}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {action ? (
          <button
            className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center p-2 transition"
            type="button"
            {...action}
          />
        ) : null}
      </div>
    </label>
  );
}

function TeacherRegistrationPage() {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    organization: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [scrollbar, setScrollbar] = useState({
    thumbHeight: 40,
    thumbTop: 0,
    visible: false,
  });
  const scrollContainerRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    startY: 0,
    startScrollTop: 0,
  });

  const theme = teacherModes[mode];

  const getScrollMetrics = useCallback(() => {
    const container = scrollContainerRef.current;
    const track = scrollTrackRef.current;
    if (!container || !track) {
      return null;
    }

    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, 36);
    const maxThumbTop = Math.max(trackHeight - thumbHeight, 0);
    const maxScrollTop = Math.max(scrollHeight - clientHeight, 0);

    return {
      scrollHeight,
      clientHeight,
      trackHeight,
      thumbHeight,
      maxThumbTop,
      maxScrollTop,
    };
  }, []);

  const updateScrollbar = useCallback(() => {
    const container = scrollContainerRef.current;
    const metrics = getScrollMetrics();
    if (!container || !metrics) {
      return;
    }

    const { scrollHeight, clientHeight, thumbHeight, maxThumbTop, maxScrollTop } = metrics;
    const scrollTop = container.scrollTop;
    const thumbTop = maxScrollTop ? (scrollTop / maxScrollTop) * maxThumbTop : 0;
    const visible = scrollHeight > clientHeight + 1;

    setScrollbar({
      thumbHeight,
      thumbTop,
      visible,
    });
  }, [getScrollMetrics]);

  const handleInputChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) {
      return;
    }

    setMode(nextMode);
    setStatusMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setStatusMessage(theme.successMessage);
  };

  const handleThumbMouseMove = useCallback(
    (event) => {
      if (!dragStateRef.current.isDragging) {
        return;
      }

      const container = scrollContainerRef.current;
      const metrics = getScrollMetrics();
      if (!container || !metrics || metrics.maxThumbTop === 0) {
        return;
      }

      const deltaY = event.clientY - dragStateRef.current.startY;
      const scrollRatio = metrics.maxScrollTop / metrics.maxThumbTop;
      container.scrollTop = dragStateRef.current.startScrollTop + deltaY * scrollRatio;
    },
    [getScrollMetrics],
  );

  const handleThumbMouseUp = useCallback(() => {
    dragStateRef.current.isDragging = false;
    window.removeEventListener("mousemove", handleThumbMouseMove);
    window.removeEventListener("mouseup", handleThumbMouseUp);
  }, [handleThumbMouseMove]);

  const handleThumbMouseDown = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      const container = scrollContainerRef.current;
      if (!container) {
        return;
      }

      dragStateRef.current = {
        isDragging: true,
        startY: event.clientY,
        startScrollTop: container.scrollTop,
      };

      window.addEventListener("mousemove", handleThumbMouseMove);
      window.addEventListener("mouseup", handleThumbMouseUp);
    },
    [handleThumbMouseMove, handleThumbMouseUp],
  );

  const handleTrackMouseDown = useCallback(
    (event) => {
      const container = scrollContainerRef.current;
      const track = scrollTrackRef.current;
      const metrics = getScrollMetrics();
      if (!container || !track || !metrics || metrics.maxThumbTop === 0) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const clickOffset = event.clientY - rect.top;
      const targetTop = Math.min(
        Math.max(clickOffset - metrics.thumbHeight / 2, 0),
        metrics.maxThumbTop,
      );

      const scrollRatio = metrics.maxScrollTop / metrics.maxThumbTop;
      container.scrollTop = targetTop * scrollRatio;
    },
    [getScrollMetrics],
  );

  useEffect(() => {
    updateScrollbar();
    const handleResize = () => updateScrollbar();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleThumbMouseMove);
      window.removeEventListener("mouseup", handleThumbMouseUp);
    };
  }, [handleThumbMouseMove, handleThumbMouseUp, mode, statusMessage, updateScrollbar]);

  return (
    <section
      className={`font-manrope relative min-h-screen xl:h-screen xl:overflow-hidden ${theme.pageClass}`}
      style={{
        "--page-accent-rgb": "16, 185, 129",
        "--auth-autofill-bg-rgb": theme.autofillBgRgb,
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <InteractiveGridBackground
          className={theme.gridClass}
          style={{
            "--grid-default-y": "28%",
            "--grid-mask-size": "760px",
          }}
        />
        <div className={`absolute left-[-10%] top-[-12%] h-[22rem] w-[22rem] blur-3xl ${theme.glowPrimaryClass}`} />
        <div className={`absolute bottom-[-16%] right-[-8%] h-[26rem] w-[26rem] blur-3xl ${theme.glowAccentClass}`} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-stretch px-5 py-10 sm:px-8 lg:px-10">
        <MotionSection
          animate={{ opacity: 1, y: 0 }}
          className={`w-full overflow-hidden ${theme.panelClass} ${theme.panelShadowClass} min-h-[calc(100vh-5rem)] xl:h-[calc(100vh-5rem)]`}
          initial={{ opacity: 0, y: 26 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid h-full w-full xl:grid-cols-[1.04fr_0.96fr]">
            <div className={`relative min-h-[18rem] overflow-hidden border-b xl:h-full xl:border-b-0 xl:border-r ${theme.dividerClass}`}>
              <img
                alt="Minimal architectural light and shadow composition"
                className="absolute inset-0 h-full w-full object-cover"
                src={TEACHER_AUTH_IMAGE_URL}
              />
              <div className={`absolute inset-0 ${theme.imageOverlayClass}`} />

              <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                <MagneticButton
                  disableMagnetic
                  disableGlow
                  innerClassName={authBackButtonInnerClass}
                  to="/"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back home</span>
                </MagneticButton>

                <div className="max-w-xl space-y-4 text-white">
                  <AnimatePresence mode="wait">
                    <MotionDiv
                      animate={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 14 }}
                      key={mode}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      onAnimationStart={updateScrollbar}
                      onAnimationComplete={updateScrollbar}
                    >
                      <div className="mb-4 inline-flex flex-col items-start">
                        <span className="block h-px w-full bg-white/76" />
                        <p className={`mt-1 text-[1rem] leading-8 sm:text-[1.08rem] ${theme.imageMetaClass}`}>
                          {theme.label}
                        </p>
                      </div>
                      <h1 className="max-w-xl text-4xl font-semibold leading-[0.96] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                        {theme.title}
                      </h1>
                    </MotionDiv>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div
              className={`relative flex flex-col ${mode === "signup" ? "text-slate-950" : "text-white"} xl:h-full xl:overflow-hidden`}
            >
              <div
                className="flex min-h-0 flex-1 p-6 sm:p-8 lg:p-10  flex-col overflow-y-auto pr-6 xl:pr-8 [&::-webkit-scrollbar]:hidden"
                onScroll={updateScrollbar}
                ref={scrollContainerRef}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className={`mt-0 border-b ${theme.dividerClass}`}>
                  <div className={`grid w-full grid-cols-2 border-b ${theme.dividerClass}`}>
                    {["login", "signup"].map((item) => {
                      const isActive = mode === item;
                      const label = item === "login" ? "Log in" : "Sign up";

                      return (
                        <button
                          className={`relative min-w-[8rem] cursor-pointer px-4 py-3 text-sm font-semibold transition ${isActive ? "text-white" : theme.switcherIdleClass}`}
                          key={item}
                          onClick={() => handleModeChange(item)}
                          type="button"
                        >
                          {isActive ? (
                            <MotionSpan
                              className={`absolute inset-0 ${theme.switcherActiveClass}`}
                              layoutId="teacher-auth-switch-pill"
                              transition={{ type: "spring", stiffness: 360, damping: 28 }}
                            />
                          ) : null}
                          <span className="relative z-10">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex-1 pt-8">
                  <AnimatePresence mode="wait">
                    <MotionDiv
                      animate={{ opacity: 1, y: 0 }}
                      initial={{ opacity: 0, y: 16 }}
                      key={mode}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                    >
                      <form className="space-y-5" onSubmit={handleSubmit}>
                        {mode === "signup" ? (
                          <TeacherField
                            autoComplete="name"
                            inputClassName={theme.inputClass}
                            label="Full name"
                            onChange={handleInputChange("fullName")}
                            placeholder="Amina Jurayeva"
                            value={formData.fullName}
                          />
                        ) : null}

                        <TeacherField
                          autoComplete="email"
                          inputClassName={theme.inputClass}
                          label="Work email"
                          onChange={handleInputChange("workEmail")}
                          placeholder="teacher@school.edu"
                          type="email"
                          value={formData.workEmail}
                        />

                        {mode === "signup" ? (
                          <TeacherField
                            inputClassName={theme.inputClass}
                            label="Organization"
                            onChange={handleInputChange("organization")}
                            placeholder="Learning center, school, or team"
                            value={formData.organization}
                          />
                        ) : null}

                        <TeacherField
                          action={{
                            "aria-label": showPassword ? "Hide password" : "Show password",
                            children: showPassword ? (
                              <EyeOff className={`h-4.5 w-4.5 ${theme.eyeClass}`} />
                            ) : (
                              <Eye className={`h-4.5 w-4.5 ${theme.eyeClass}`} />
                            ),
                            onClick: () => setShowPassword((current) => !current),
                          }}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          inputClassName={theme.inputClass}
                          label="Password"
                          onChange={handleInputChange("password")}
                          placeholder="Enter password"
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                        />

                        {mode === "signup" ? (
                          <TeacherField
                            action={{
                              "aria-label": showConfirmPassword
                                ? "Hide confirmation password"
                                : "Show confirmation password",
                              children: showConfirmPassword ? (
                                <EyeOff className={`h-4.5 w-4.5 ${theme.eyeClass}`} />
                              ) : (
                                <Eye className={`h-4.5 w-4.5 ${theme.eyeClass}`} />
                              ),
                              onClick: () => setShowConfirmPassword((current) => !current),
                            }}
                            autoComplete="new-password"
                            inputClassName={theme.inputClass}
                            label="Confirm password"
                            onChange={handleInputChange("confirmPassword")}
                            placeholder="Repeat password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={formData.confirmPassword}
                          />
                        ) : null}

                        <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <label className={`inline-flex items-center gap-3 text-sm ${theme.bodyClass}`}>
                            <input
                              className={`h-4 w-4 ${theme.checkboxClass}`}
                              type="checkbox"
                            />
                            {mode === "login" ? "Keep me signed in" : "Send onboarding updates"}
                          </label>

                          <MagneticButton
                            className="rounded-full"
                            innerClassName={authPrimaryButtonClass}
                            type="submit"
                          >
                            <span className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                              <span className="h-full w-8 bg-white/30 blur-sm" />
                            </span>
                            <span className="relative">{theme.submitLabel}</span>
                          </MagneticButton>
                        </div>

                        <div className="flex flex-col gap-2 pt-2">
                          <div className={`text-sm leading-7 ${theme.bodyClass}`}>
                            <span>Looking for student login?</span>{" "}
                            <Link className={authInlineLinkClass} to="/student/auth">
                              Student auth
                            </Link>
                          </div>

                          {mode === "login" ? (
                            <div className={`text-sm leading-7 ${theme.bodyClass}`}>
                              <span>Forgot password?</span>{" "}
                              <Link className={authInlineLinkClass} to="/teachers/forgot-password">
                                Click here
                              </Link>
                            </div>
                          ) : null}
                        </div>

                        {statusMessage ? (
                          <MotionDiv
                            animate={{ opacity: 1, y: 0 }}
                            className={`${theme.statusClass} px-4 py-4 text-sm leading-7`}
                            initial={{ opacity: 0, y: 10 }}
                          >
                            {statusMessage}
                          </MotionDiv>
                        ) : null}
                      </form>
                    </MotionDiv>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </MotionSection>

        <div
          className={`scroll-bar pointer-events-auto fixed right-0 top-0 bottom-0 w-1.5 rounded-full transition-opacity ${theme.scrollTrackClass} ${scrollbar.visible ? "opacity-100" : "opacity-0"}`}
          onMouseDown={handleTrackMouseDown}
          ref={scrollTrackRef}
        >
          <div
            className={`scroll-thumb absolute left-0 w-full rounded-full transition-colors ${theme.scrollThumbClass}`}
            onMouseDown={handleThumbMouseDown}
            style={{
              height: `${scrollbar.thumbHeight}px`,
              transform: `translateY(${scrollbar.thumbTop}px)`,
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default TeacherRegistrationPage;
