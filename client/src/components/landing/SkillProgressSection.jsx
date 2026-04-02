import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Activity, ArrowRight, Ear, PencilLine, SearchCheck } from "lucide-react";
import { useRef, useState } from "react";
import { skillTracks } from "../../data/siteContent";
import InteractiveGridBackground from "../layout/InteractiveGridBackground";

const MotionArticle = motion.article;
const trackIcons = {
  Listening: Ear,
  Reading: SearchCheck,
  Writing: PencilLine,
};

function toParagraph(items) {
  return items.map((item) => item.trim().replace(/\.*$/, "")).join(". ") + ".";
}

function SkillProgressSection() {
  const sectionRef = useRef(null);
  const scrollStageRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { scrollYProgress } = useScroll({ target: scrollStageRef, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return;
    }

    const nextIndex = Math.min(
      skillTracks.length - 1,
      Math.floor(latest * skillTracks.length),
    );
    setActiveIndex((currentIndex) => (currentIndex === nextIndex ? currentIndex : nextIndex));
  });

  const activeTrack = skillTracks[activeIndex];
  const ActiveTrackIcon = trackIcons[activeTrack.name] ?? Activity;

  return (
    <section
      className="relative bg-[#050505] section-space pointer-events-none select-none"
      id="skill-progression"
      ref={sectionRef}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:34px_34px] opacity-70" />
        <InteractiveGridBackground
          className="opacity-70"
          style={{
            "--grid-mask-size": "1180px",
            "--grid-default-y": "18%",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.02] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/[0.03] to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="space-y-12">
          <div className="relative space-y-3 lg:pt-3">
            <div className="w-fit space-y-3 lg:absolute lg:left-0 lg:top-6">
              <span className="block h-px w-full bg-white/75" />
              <p className="text-sm font-semibold tracking-[-0.03em] text-white">
                For Students
              </p>
            </div>

            <h2 className="text-5xl font-semibold leading-[0.96] tracking-[-0.08em] text-white sm:text-6xl lg:text-7xl lg:[text-indent:15rem]">
              One skill at a time makes progress feel more <span className="font-light italic">visible</span>, <span className="font-light italic">calm</span>, and less <span className="font-light italic">random</span>.
            </h2>

            <div className="mt-8 grid gap-3 xl:grid-cols-[0.36fr_0.64fr]">
              <div className="hidden xl:block" />
              <p className="hidden max-w-3xl xlml-auto text-lg font-medium leading-relaxed text-white/66 sm:block md:text-[1.36rem] md:leading-[1.8]">
                Instead of mixing everything at once, the learning flow isolates one skill at a
                time so the next task is based on evidence, timing behavior, and recurring
                weakness patterns rather than guesswork. Each stage stays narrow on purpose, so
                students can see what they are practicing, what the system notices, how progress
                is measured, and what needs to become stable before the next layer of difficulty
                is unlocked.
              </p>
            </div>
          </div>

          <div className="relative lg:h-[280vh]" ref={scrollStageRef}>
            <div className="grid gap-3 lg:sticky lg:top-24 lg:h-[calc(100vh-3rem)] lg:grid-cols-[0.36fr_0.64fr] lg:items-start">
              <div className="space-y-3">
                {skillTracks.map((track, index) => {
                  const isActive = activeIndex === index;

                  return (
                    <button
                      className={`group w-full border px-5 py-5 text-left transition duration-300 ${isActive
                        ? "border-[#efe8dd] bg-[#efe8dd] text-slate-950"
                        : "border-white/10 bg-white/[0.03] backdrop-blur-3xl text-white/68 hover:border-white/18 hover:bg-black hover:text-white"
                        }`}
                      key={track.name}
                      onClick={() => setActiveIndex(index)}
                      tabIndex={-1}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-2xl font-semibold tracking-[-0.05em]">
                          {track.name}
                        </h3>
                      </div>

                      <p
                        className={`mt-4 max-w-md text-[0.98rem] leading-7 ${isActive ? "text-slate-700" : "text-white/52"
                          }`}
                      >
                        {track.summary}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <AnimatePresence mode="wait">
                  <MotionArticle
                    animate={{ opacity: 1, y: 0 }}
                    className="relative min-h-[32rem] overflow-hidden border border-white/10 bg-[#090909] p-6 shadow-[0_35px_110px_-60px_rgba(0,0,0,0.95)] lg:min-h-[34rem] lg:p-8"
                    exit={{ opacity: 0, y: -12 }}
                    initial={{ opacity: 0, y: 24 }}
                    key={activeTrack.name}
                    transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_28%)]" />
                    <div className="pointer-events-none absolute -right-4 -top-8 text-[14rem] font-black leading-none tracking-[-0.08em] text-white/[0.04] lg:text-[17rem]">
                      0{activeIndex + 1}
                    </div>

                    <div className="relative">
                      <div className="mb-8 flex flex-col gap-5 border-b border-white/8 pb-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                          <div className="flex items-center gap-3">
                            <ActiveTrackIcon className="h-4 w-4 text-white/72" />
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-white/38">
                              {activeTrack.name}
                            </p>
                          </div>
                          <h3 className="mt-4 text-[1.9rem] font-semibold leading-tight tracking-[-0.05em] text-white lg:text-[2.2rem]">
                            {activeTrack.summary}
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-0">
                        <div className="grid gap-4 py-2 lg:grid-cols-3">
                          <div className="flex gap-3 pt-1">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/38">
                              What you practice
                            </p>
                          </div>
                          <p className="max-w-4xl text-[1.02rem] leading-8 text-white/72 lg:col-span-2">
                            {toParagraph(activeTrack.practices)}
                          </p>
                        </div>

                        <div className="grid gap-4 border-t border-white/8 py-5 lg:grid-cols-3">
                          <div className="flex gap-3 pt-1">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/38">
                              What gets detected
                            </p>
                          </div>
                          <p className="max-w-4xl text-[1.02rem] leading-8 text-white/72 lg:col-span-2">
                            {toParagraph(activeTrack.detects)}
                          </p>
                        </div>

                        <div className="grid gap-4 border-t border-white/8 py-5 lg:grid-cols-3">
                          <div className="flex gap-3 pt-1">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/38">
                              How progress is measured
                            </p>
                          </div>
                          <p className="max-w-4xl text-[1.02rem] leading-8 text-white/72 lg:col-span-2">
                            {activeTrack.measures}
                          </p>
                        </div>

                        <div className="grid gap-4 border-t border-white/8 py-5 lg:grid-cols-3">
                          <div className="flex items-start gap-3 pt-1">
                            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/38">
                              How the next step unlocks
                            </p>
                          </div>
                          <p className="max-w-4xl text-[1.02rem] leading-8 text-white/72 lg:col-span-2">
                            {activeTrack.unlocks}
                          </p>
                        </div>
                      </div>
                    </div>
                  </MotionArticle>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default SkillProgressSection;
