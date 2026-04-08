import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, Eye, EyeOff, MoonStar, SunMedium } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import InteractiveGridBackground from "../components/layout/InteractiveGridBackground";
import MagneticButton from "../components/ui/MagneticButton";
import { authApi } from "../lib/apiClient";
import {
  clearAuthSession,
  getAccessToken,
  getStoredRole,
  saveAuthSession,
} from "../lib/authSession";
import {
  STUDENT_AUTH_IMAGE_URL,
  authBackButtonInnerClass,
  authInlineLinkClass,
  authPrimaryButtonClass,
  authInputBaseClass,
} from "../lib/authUi";

const authModes = {
  login: {
    label: "Log in",
    title: "Return to your study flow.",
    copy: "Continue where you stopped.",
    submitLabel: "Enter workspace",
    helperLabel: "New here?",
    helperAction: "Create account",
    pageClass: "bg-[#f7f4ef] text-slate-950",
    shellClass: "bg-[#f7f4ef] text-slate-950",
    panelClass: "bg-[#f7f4ef]",
    panelShadowClass: "shadow-[0_36px_110px_-52px_rgba(15,23,42,0.34)]",
    autofillBgRgb: "247, 244, 239",
    autofillTextRgb: "15, 23, 42",
    lineClass: "bg-slate-950",
    mutedClass: "text-slate-500",
    bodyClass: "text-slate-600",
    inputClass:
      "border-black/10 bg-transparent text-slate-900 placeholder:text-slate-400 focus:border-slate-950/25 focus:bg-transparent",
    switcherShellClass: "border-b border-black/12",
    switcherIdleClass: "text-slate-500",
    switcherActiveClass:
      "emerald-gradient-fill text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)]",
    buttonClass: authPrimaryButtonClass,
    dividerClass: "border-black/12",
    gridClass: "opacity-60",
    glowPrimaryClass: "bg-white/75",
    glowAccentClass: "bg-emerald-500/8",
    checkboxClass: "border-black/20 accent-emerald-500",
    statusClass: "border border-emerald-500/18 bg-emerald-500/8 text-emerald-700",
    imageOverlayClass:
      "bg-[linear-gradient(180deg,rgba(247,244,239,0.08),rgba(15,23,42,0.08)_38%,rgba(15,23,42,0.72)_100%)]",
    imageMetaClass: "text-white/78",
    scrollTrackClass: "bg-slate-200/70",
    scrollThumbClass: "bg-slate-500/50 hover:bg-slate-500/70",
    icon: SunMedium,
    successMessage: "Login UI is ready for your real endpoint.",
  },
  signup: {
    label: "Sign up",
    title: "Start with a cleaner system.",
    copy: "Set up your account in one step.",
    submitLabel: "Create account",
    helperLabel: "Already have access?",
    helperAction: "Switch to login",
    pageClass: "bg-[#050505] text-white",
    shellClass: "bg-[#050505] text-white",
    panelClass: "bg-[#0b0b0b]",
    panelShadowClass: "shadow-[0_28px_82px_-56px_rgba(255,255,255,0.14)]",
    autofillBgRgb: "11, 11, 11",
    autofillTextRgb: "255, 255, 255",
    lineClass: "bg-white",
    mutedClass: "text-white/42",
    bodyClass: "text-white/68",
    inputClass:
      "border-white/12 bg-transparent text-white placeholder:text-white/30 focus:border-white/30 focus:bg-transparent",
    switcherShellClass: "border-b border-white/12",
    switcherIdleClass: "text-white/45",
    switcherActiveClass:
      "emerald-gradient-fill text-white shadow-[0_14px_28px_-26px_rgba(16,185,129,0.24)]",
    buttonClass: authPrimaryButtonClass,
    dividerClass: "border-white/12",
    gridClass: "opacity-35",
    glowPrimaryClass: "bg-white/8",
    glowAccentClass: "bg-emerald-500/12",
    checkboxClass: "border-white/20 accent-emerald-500",
    statusClass: "border border-emerald-400/16 bg-emerald-500/10 text-emerald-200",
    imageOverlayClass:
      "bg-[linear-gradient(180deg,rgba(5,5,5,0.1),rgba(5,5,5,0.16)_40%,rgba(5,5,5,0.78)_100%)]",
    imageMetaClass: "text-white/72",
    scrollTrackClass: "bg-white/10",
    scrollThumbClass: "bg-white/40 hover:bg-white/60",
    icon: MoonStar,
    successMessage: "Signup UI is ready for your real endpoint.",
  },
};

const MotionDiv = motion.div;
const MotionSection = motion.section;
const MotionSpan = motion.span;

function AuthField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputClassName,
  action,
}) {
  return (
    <label className="block space-y-2.5">
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em]">{label}</span>
      <div className="relative">
        <input
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

function AuthPage() {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [sendStudyTips, setSendStudyTips] = useState(false);
  const [status, setStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [reveal, setReveal] = useState(null);
  const revealIdRef = useRef(0);
  const switcherRefs = useRef({ login: null, signup: null });
  const navigate = useNavigate();
  const [scrollbar, setScrollbar] = useState({
    thumbHeight: 40,
    thumbTop: 0,
    visible: false,
  });
  const scrollContainerRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const scrollContentRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    startY: 0,
    startScrollTop: 0,
  });

  const theme = authModes[mode];
  const ThemeIcon = theme.icon;

  useEffect(() => {
    let isMounted = true;

    async function redirectIfAuthenticated() {
      const role = getStoredRole();
      if (role !== "student") {
        if (isMounted) {
          setIsCheckingSession(false);
        }
        return;
      }

      try {
        if (!getAccessToken()) {
          const refreshed = await authApi.refresh();
          saveAuthSession(refreshed);
        }

        await authApi.me();
        navigate("/student/dashboard", { replace: true });
      } catch (error) {
        clearAuthSession();
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    }

    redirectIfAuthenticated();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    const syncRevealOrigin = () => {
      const activeTab = switcherRefs.current[mode];

      if (!activeTab) {
        return;
      }

      const rect = activeTab.getBoundingClientRect();

      setReveal((current) =>
        current
          ? current
          : {
            id: `resting-${mode}`,
            mode,
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            isResting: true,
          }
      );
    };

    syncRevealOrigin();
    window.addEventListener("resize", syncRevealOrigin);

    return () => window.removeEventListener("resize", syncRevealOrigin);
  }, [mode]);

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

  const getRevealOrigin = (nextMode, triggerElement) => {
    const sourceElement = triggerElement ?? switcherRefs.current[nextMode];

    if (!sourceElement) {
      return {
        x: window.innerWidth / 2,
        y: 120,
      };
    }

    const rect = sourceElement.getBoundingClientRect();

    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  };

  const handleModeChange = (nextMode, event) => {
    if (nextMode === mode) {
      return;
    }

    const origin = getRevealOrigin(nextMode, event?.currentTarget);
    revealIdRef.current += 1;

    setMode(nextMode);
    setStatus(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setReveal({
      id: `${nextMode}-${revealIdRef.current}`,
      mode: nextMode,
      x: origin.x,
      y: origin.y,
      isResting: false,
    });
  };

  const handleInputChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedEmail = formData.email.trim().toLowerCase();
    if (!trimmedEmail || !formData.password) {
      setStatus({
        type: "error",
        message: "Email and password are required.",
      });
      return;
    }

    if (mode === "signup") {
      if (!formData.fullName.trim()) {
        setStatus({
          type: "error",
          message: "Full name is required.",
        });
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setStatus({
          type: "error",
          message: "Passwords do not match.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const payload =
        mode === "signup"
          ? {
              fullName: formData.fullName.trim(),
              email: trimmedEmail,
              password: formData.password,
              confirmPassword: formData.confirmPassword,
              role: "student",
              rememberMe: true,
            }
          : {
              email: trimmedEmail,
              password: formData.password,
              role: "student",
              rememberMe: keepSignedIn,
            };

      const response =
        mode === "signup"
          ? await authApi.register(payload)
          : await authApi.login(payload);

      saveAuthSession({
        ...response,
        rememberMe: mode === "login" ? keepSignedIn : true,
      });
      setStatus({
        type: "success",
        message:
          mode === "signup"
            ? "Account created successfully."
            : "Login successful.",
      });
      navigate("/student/dashboard");
    } catch (error) {
      const backendErrors = Array.isArray(error.errors) && error.errors.length
        ? error.errors.join(" ")
        : "";

      setStatus({
        type: "error",
        message: backendErrors || error.message || "Authentication failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
    let rafId = requestAnimationFrame(updateScrollbar);
    let rafIdTwo = requestAnimationFrame(updateScrollbar);
    let resizeObserver;
    const handleResize = () => updateScrollbar();
    const container = scrollContainerRef.current;
    const content = scrollContentRef.current;

    if (typeof ResizeObserver !== "undefined" && container) {
      resizeObserver = new ResizeObserver(() => updateScrollbar());
      resizeObserver.observe(container);
      if (content) {
        resizeObserver.observe(content);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleThumbMouseMove);
      window.removeEventListener("mouseup", handleThumbMouseUp);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(rafIdTwo);
    };
  }, [handleThumbMouseMove, handleThumbMouseUp, mode, status, updateScrollbar]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = 0;
    }
    updateScrollbar();
    const timerA = setTimeout(updateScrollbar, 80);
    const timerB = setTimeout(updateScrollbar, 180);

    return () => {
      clearTimeout(timerA);
      clearTimeout(timerB);
    };
  }, [mode, updateScrollbar]);

  const statusClassName =
    status?.type === "error"
      ? mode === "signup"
        ? "border border-rose-400/30 bg-rose-500/10 text-rose-200"
        : "border border-rose-300/70 bg-rose-50 text-rose-700"
      : theme.statusClass;

  if (isCheckingSession) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#f7f4ef] text-sm font-semibold text-slate-600">
        Checking your session...
      </section>
    );
  }

  return (
    <section
      className={`font-manrope relative min-h-screen xl:h-screen xl:overflow-hidden ${theme.pageClass}`}
      style={{
        "--page-accent-rgb": "16, 185, 129",
        "--auth-autofill-bg-rgb": theme.autofillBgRgb,
        "--auth-autofill-text-rgb": theme.autofillTextRgb,
      }}
    >
      <AnimatePresence>
        {reveal && !reveal.isResting ? (
          <MotionDiv
            animate={{ clipPath: `circle(150vmax at ${reveal.x}px ${reveal.y}px)` }}
            className={`pointer-events-none fixed inset-0 z-0 ${reveal.mode === "login" ? "bg-[#f7f4ef]" : "bg-[#050505]"
              }`}
            initial={{ clipPath: `circle(0px at ${reveal.x}px ${reveal.y}px)` }}
            key={reveal.id}
            onAnimationComplete={() => {
              setReveal((current) =>
                current?.id === reveal.id ? { ...current, isResting: true } : current
              );
            }}
            transition={{ duration: 0.88, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null}
      </AnimatePresence>

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
          className={`w-full overflow-hidden ${theme.panelShadowClass} min-h-[calc(100vh-5rem)] xl:h-[calc(100vh-5rem)]`}
          initial={{ opacity: 0, y: 26 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={`grid h-full w-full xl:grid-cols-[1.04fr_0.96fr] ${theme.panelClass}`}>
            <div className={`relative min-h-[18rem] overflow-hidden border-b xl:h-full xl:border-b-0 xl:border-r ${theme.dividerClass}`}>
              <img
                alt="Minimal architectural light and shadow composition"
                className="absolute inset-0 h-full w-full object-cover"
                src={STUDENT_AUTH_IMAGE_URL}
              />
              <div className={`absolute inset-0 ${theme.imageOverlayClass}`} />

              <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div className="flex items-center justify-between gap-4">
                  <MagneticButton
                    disableMagnetic
                    disableGlow
                    innerClassName={authBackButtonInnerClass}
                    to="/"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back home</span>
                  </MagneticButton>
                </div>

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
              className={`relative flex flex-col ${mode === "signup" ? "text-white" : "text-slate-950"} xl:h-full xl:overflow-hidden`}
            >
              <div
                className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6 sm:p-8 lg:p-10 pr-6 xl:pr-8 [&::-webkit-scrollbar]:hidden"
                onScroll={updateScrollbar}
                ref={scrollContainerRef}
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                <div className="flex min-h-full flex-col" ref={scrollContentRef}>
                  <div className={`mt-0 border-b ${theme.dividerClass}`}>
                    <div className={`grid w-full grid-cols-2 border-b ${theme.dividerClass}`}>
                      {["login", "signup"].map((item) => {
                        const isActive = mode === item;
                        const label = item === "login" ? "Log in" : "Sign up";

                        return (
                          <button
                            className={`relative min-w-[8rem] cursor-pointer px-4 py-3 text-sm font-semibold transition ${isActive ? "text-white" : theme.switcherIdleClass
                              }`}
                            key={item}
                            onClick={(event) => handleModeChange(item, event)}
                            ref={(element) => {
                              switcherRefs.current[item] = element;
                            }}
                            type="button"
                          >
                            {isActive ? (
                              <MotionSpan
                                className={`absolute inset-0 ${theme.switcherActiveClass}`}
                                layoutId="auth-switch-pill"
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
                        onAnimationComplete={updateScrollbar}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                      >
                        <form className="space-y-5" onSubmit={handleSubmit}>
                          {mode === "signup" ? (
                            <AuthField
                              inputClassName={theme.inputClass}
                              label="Full name"
                              onChange={handleInputChange("fullName")}
                              placeholder="Amina Jurayeva"
                              value={formData.fullName}
                            />
                          ) : null}

                          <AuthField
                            inputClassName={theme.inputClass}
                            label="Email"
                            onChange={handleInputChange("email")}
                            placeholder="you@example.com"
                            type="email"
                            value={formData.email}
                          />

                          <AuthField
                            action={{
                              "aria-label": showPassword ? "Hide password" : "Show password",
                              children: showPassword ? (
                                <EyeOff className={`h-4.5 w-4.5 ${theme.mutedClass}`} />
                              ) : (
                                <Eye className={`h-4.5 w-4.5 ${theme.mutedClass}`} />
                              ),
                              onClick: () => setShowPassword((current) => !current),
                            }}
                            inputClassName={theme.inputClass}
                            label="Password"
                            onChange={handleInputChange("password")}
                            placeholder="Enter password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                          />

                          {mode === "signup" ? (
                            <AuthField
                              action={{
                                "aria-label": showConfirmPassword
                                  ? "Hide confirmation password"
                                  : "Show confirmation password",
                                children: showConfirmPassword ? (
                                  <EyeOff className={`h-4.5 w-4.5 ${theme.mutedClass}`} />
                                ) : (
                                  <Eye className={`h-4.5 w-4.5 ${theme.mutedClass}`} />
                                ),
                                onClick: () => setShowConfirmPassword((current) => !current),
                              }}
                              inputClassName={theme.inputClass}
                              label="Confirm"
                              onChange={handleInputChange("confirmPassword")}
                              placeholder="Repeat password"
                              type={showConfirmPassword ? "text" : "password"}
                              value={formData.confirmPassword}
                            />
                          ) : null}

                          <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className={`flex flex-col gap-2 ${theme.bodyClass}`}>
                              <label className="inline-flex items-center gap-3 text-sm">
                                <input
                                  className={`h-4 w-4 ${theme.checkboxClass}`}
                                  checked={mode === "login" ? keepSignedIn : sendStudyTips}
                                  onChange={(event) => {
                                    if (mode === "login") {
                                      setKeepSignedIn(event.target.checked);
                                      return;
                                    }
                                    setSendStudyTips(event.target.checked);
                                  }}
                                  type="checkbox"
                                />
                                {mode === "login" ? "Keep me signed in" : "Send study tips"}
                              </label>
                            </div>

                            <MagneticButton
                              className="rounded-full"
                              innerClassName={theme.buttonClass}
                              disabled={isSubmitting}
                              type="submit"
                            >
                              <span className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                                <span className="h-full w-8 bg-white/30 blur-sm" />
                              </span>
                              <span className="relative">
                                {isSubmitting ? "Processing..." : theme.submitLabel}
                              </span>
                            </MagneticButton>
                          </div>

                          <div className=" flex flex-col mb-8 gap-2 pt-2">
                            <div className={`text-sm leading-7 ${theme.bodyClass}`}>
                              <span>Need teacher auth?</span>{" "}
                              <Link
                                className={authInlineLinkClass}
                                to="/teachers/auth"
                              >
                                Teacher auth
                              </Link>
                            </div>
                            {mode === "login" ? (
                              <div className={`text-sm leading-7 ${theme.bodyClass}`}>
                                <span>Forgot password?</span>{" "}
                                <Link
                                  className={authInlineLinkClass}
                                  to="/student/forgot-password"
                                >
                                  Click here
                                </Link>
                              </div>
                            ) : null}
                          </div>

                          {status?.message ? (
                            <MotionDiv
                              animate={{ opacity: 1, y: 0 }}
                              className={`${statusClassName} px-4 py-4 text-sm leading-7`}
                              initial={{ opacity: 0, y: 10 }}
                            >
                              {status.message}
                            </MotionDiv>
                          ) : null}
                        </form>
                      </MotionDiv>
                    </AnimatePresence>
                  </div>
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

export default AuthPage;
