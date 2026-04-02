import { useEffect, useRef, useState } from "react";
import { Check, GraduationCap, Presentation } from "lucide-react";
import MagneticButton from "../ui/MagneticButton";

const pricingPlans = [
  {
    audience: "Student subscription",
    description:
      "A calmer plan for learners who want disciplined IELTS improvement without random practice.",
    features: [
      "Skill-based Listening, Reading, and Writing practice",
      "Structured feedback with weak-pattern visibility",
      "Progress tracking, timing behavior, and retry history",
      "A desktop-first workflow built for serious preparation",
    ],
    icon: GraduationCap,
    price: "$24",
    priceNote: "per month",
  },
  {
    audience: "Teacher subscription",
    description:
      "A class support layer for teachers who need visibility, accountability, and faster review.",
    features: [
      "Student activity visibility across homework and retries",
      "Individual weakness tracking inside group teaching",
      "Faster checking for reading and listening performance",
      "Better evidence for planning, feedback, and follow-up tasks",
    ],
    icon: Presentation,
    price: "$79",
    priceNote: "per month",
  },
];

function PricingCard({ plan }) {
  const cardRef = useRef(null);
  const leaveTimeoutRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const Icon = plan.icon;

  useEffect(() => {
    const updatePointerPosition = (event) => {
      if (!cardRef.current || !isActive) {
        return;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      cardRef.current.style.setProperty("--card-x", `${x}px`);
      cardRef.current.style.setProperty("--card-y", `${y}px`);
    };

    window.addEventListener("pointermove", updatePointerPosition, { passive: true });

    return () => {
      window.removeEventListener("pointermove", updatePointerPosition);
    };
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

    leaveTimeoutRef.current = window.setTimeout(() => {
      setIsActive(false);
    }, 220);
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

      <div className="relative flex h-full flex-col overflow-hidden bg-[#0b0b0b] p-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.04] blur-3xl" />
        <div
          className={`pointer-events-none absolute inset-0 transition duration-300 ${
            isActive ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--card-x,_50%)_var(--card-y,_50%),rgba(16,185,129,0.18),transparent_44%)]" />
        </div>

        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-4">
              <span
                className={`inline-flex h-12 w-12 items-center justify-center border bg-white/[0.06] text-white transition duration-300 ${
                  isActive
                    ? "border-emerald-300/20 bg-white/[0.08]"
                    : "border-white/10"
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-white/42">
                  {plan.audience}
                </p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-5xl font-semibold tracking-[-0.08em] text-white">
                    {plan.price}
                  </span>
                  <span className="pb-2 text-sm text-white/52">{plan.priceNote}</span>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 max-w-xl text-[1.02rem] leading-8 text-white/68">
            {plan.description}
          </p>

          <div className="mt-8 space-y-4 border-t border-white/8 pt-6">
            {plan.features.map((feature) => (
              <div className="flex items-start gap-3" key={feature}>
                <span
                  className={`mt-1 inline-flex h-6 w-6 flex-none items-center justify-center border bg-white/[0.05] text-emerald-300 transition duration-300 ${
                    isActive
                      ? "border-emerald-300/20 bg-emerald-500/10"
                      : "border-white/10"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
                <p className="text-[0.98rem] leading-7 text-white/72">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function FinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#050505] section-space" id="trial">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.05] to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_38%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.06),transparent_30%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto w-fit space-y-3">
            <span className="mx-auto block h-px w-20 bg-white/75" />
            <p className="text-sm font-semibold tracking-[-0.03em] text-white/62">
              Pricing plans
            </p>
          </div>
          <h2 className="mt-4 text-5xl font-semibold leading-[0.96] tracking-[-0.08em] text-white sm:text-6xl lg:text-7xl">
            Choose the side of the platform that fits your{" "}
            <span className="font-light italic">work</span>.
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-[1.08rem] leading-8 text-white/66 md:text-[1.14rem]">
            Both subscriptions are built around the same idea: less guesswork, more evidence.
            Students get disciplined practice and clearer next steps. Teachers get visibility into
            effort, weak patterns, and progress quality before class even begins.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.audience} plan={plan} />
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="max-w-2xl text-sm leading-7 text-white/48">
            Pricing is shown here as a launch-ready structure and can be adjusted later if your
            student and teacher offers change.
          </p>
          <div className="flex items-center justify-center">
            <MagneticButton
              hoverLabel="Begin now"
              innerClassName="emerald-gradient-fill group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-emerald-300/20 px-8 py-4 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_22px_60px_-28px_rgba(16,185,129,0.72)]"
              to="/student/auth"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="h-full w-8 bg-white/35 blur-sm" />
              </div>
              <span className="relative">Start Free Trial</span>
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FinalCtaSection;
