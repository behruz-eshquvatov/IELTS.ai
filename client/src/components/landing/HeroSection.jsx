import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import InteractiveGridBackground from "../layout/InteractiveGridBackground";
import MagneticButton from "../ui/MagneticButton";

const MotionSpan = motion.span;

const fromScores = ["5.0", "5.5", "6.0"];
const toScores = ["6.0", "6.5", "7.0"];
const INITIAL_HOLD_MS = 1100;
const BOX_ANIMATION_MS = 500;
const BETWEEN_BOXES_DELAY_MS = 800;
const BETWEEN_STEPS_HOLD_MS = 1100;
const LOOP_RESET_HOLD_MS = 1600;

const numberVariants = {
  initial: { y: 50, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -50, opacity: 0 },
};

function ScoreBox({ score }) {
  const [whole, fraction] = score.split(".");

  return (
    <div className="flex h-[50px] w-[100px] items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-emerald-400 to-teal-500 shadow-[0_10px_40px_-10px_rgba(52,211,153,0.7)] md:h-[80px] md:w-[150px]">
      <div className="font-orbitron flex items-center text-4xl font-bold tracking-tighter text-white md:text-6xl">
        <div className="relative flex h-[1em] w-[0.7em] justify-center">
          <AnimatePresence mode="popLayout">
            <MotionSpan
              key={whole}
              variants={numberVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: BOX_ANIMATION_MS / 1000, ease: "backOut" }}
              className="absolute"
            >
              {whole}
            </MotionSpan>
          </AnimatePresence>
        </div>
        <span className="z-10 mx-[4px] flex h-[1em] items-center text-teal-100">.</span>
        <div className="relative flex h-[1em] w-[0.7em] justify-center">
          <AnimatePresence mode="popLayout">
            <MotionSpan
              key={`${whole}-${fraction}`}
              variants={numberVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: BOX_ANIMATION_MS / 1000, ease: "backOut" }}
              className="absolute"
            >
              {fraction}
            </MotionSpan>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  const [fromIndex, setFromIndex] = useState(0);
  const [toIndex, setToIndex] = useState(0);

  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { amount: 0.35 });

  useEffect(() => {
    let isMounted = true;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const runAnimationSequence = async () => {
      if (!isInView) return;

      const totalSteps = Math.min(fromScores.length, toScores.length);

      setFromIndex(0);
      setToIndex(0);
      await sleep(INITIAL_HOLD_MS);
      if (!isMounted) return;

      while (isMounted) {
        for (let i = 1; i < totalSteps; i += 1) {
          if (!isMounted) break;

          setFromIndex(i);
          await sleep(BOX_ANIMATION_MS + BETWEEN_BOXES_DELAY_MS);
          if (!isMounted) break;

          setToIndex(i);
          await sleep(BETWEEN_STEPS_HOLD_MS);
        }

        if (!isMounted) break;

        await sleep(LOOP_RESET_HOLD_MS);
        if (!isMounted) break;

        setFromIndex(0);
        await sleep(BOX_ANIMATION_MS + BETWEEN_BOXES_DELAY_MS);
        if (!isMounted) break;

        setToIndex(0);
        await sleep(INITIAL_HOLD_MS);
      }
    };

    runAnimationSequence();

    return () => {
      isMounted = false;
    };
  }, [isInView]);

  return (
    <section
      ref={sectionRef}
      className="section-shell relative flex min-h-screen flex-col justify-center pt-24 sm:pt-28 lg:pt-36 lg:overflow-hidden"
      id="top"
    >
      <InteractiveGridBackground />
      <div className="relative z-10 space-y-12">
        <div className="mx-auto max-w-5xl space-y-8 text-center">
          <h1 className="mb-6 flex flex-col items-center justify-center text-4xl font-black uppercase leading-[1.1] tracking-tight text-slate-900 sm:mb-8 sm:text-5xl md:text-7xl">
            <span>Enhance your IELTS</span>

            <div className="mt-6 flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-4 md:mt-8 md:gap-x-6">
              from
              <ScoreBox score={fromScores[fromIndex]} />
              to
              <ScoreBox score={toScores[toIndex]} />
              with <span className="italic font-bold tracking-[-0.04em]">AI</span>
              <sup className="-ml-4 text-4xl">✦</sup>
            </div>
          </h1>

          <p className="mx-auto mb-6 max-w-3xl text-base font-medium leading-relaxed text-slate-800 sm:mb-8 sm:text-lg md:text-xl">
            We are building a more structured IELTS preparation experience with clearer
            accountability, and less wasted effort between tasks.
          </p>

          <div className="mt-4 flex flex-col items-center gap-5">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-black/50">
              Interested?
            </span>
            <MagneticButton
              to="/student/auth"
              innerClassName="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-slate-900 px-10 py-5 font-black text-black shadow-[0_0_40px_rgba(71,85,105,0.45)] rounded-full"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="h-full w-8 bg-white/40 blur-sm" />
              </div>
              <span className="relative text-sm uppercase tracking-[0.15em] text-white">Start Now</span>
              <ChevronRight className="relative ml-3 h-5 w-5 text-white" />
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
