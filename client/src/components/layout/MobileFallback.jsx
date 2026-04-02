import { motion } from "framer-motion";
import { Laptop, Sparkles } from "lucide-react";
import { brand } from "../../data/siteContent";

const MotionDiv = motion.div;

function FloatingOrb({ className, delay = 0 }) {
  return (
    <MotionDiv
      animate={{ y: [0, -12, 0] }}
      className={className}
      transition={{
        delay,
        duration: 5.4,
        ease: "easeInOut",
        repeat: Number.POSITIVE_INFINITY,
      }}
    />
  );
}

function MobileFallback() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#fcfbf9_0%,#f4f0e9_100%)] px-5 py-8 text-slate-900">
      <FloatingOrb className="absolute -left-10 top-24 h-36 w-36 rounded-full bg-blue-200/45 blur-3xl" />
      <FloatingOrb
        className="absolute -right-10 top-40 h-44 w-44 rounded-full bg-emerald-100/55 blur-3xl"
        delay={0.6}
      />
      <FloatingOrb
        className="absolute bottom-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-slate-200/45 blur-3xl"
        delay={1.2}
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-between rounded-[36px] border border-white/80 bg-white/78 p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.25)] backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Desktop-first
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{brand.name}</h1>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-white">
            {brand.mark}
          </div>
        </div>

        <div className="my-10 space-y-8">
          <div className="relative mx-auto aspect-[1.05/0.9] w-full max-w-[18rem]">
            <MotionDiv
              animate={{ y: [0, -8, 0] }}
              className="absolute inset-0 rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-4 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.38)]"
              transition={{ duration: 5, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <div className="rounded-[24px] border border-blue-100/80 bg-white/90 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-2 w-16 rounded-full bg-slate-200" />
                    <div className="h-2 w-24 rounded-full bg-blue-100" />
                  </div>
                  <Sparkles className="h-4 w-4 text-blue-500" />
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[18px] bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                      <span>Target score</span>
                      <span>6.5</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-full w-2/3 rounded-full bg-blue-400" />
                    </div>
                  </div>
                  <div className="rounded-[18px] bg-emerald-50/80 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                      <span>Consistency</span>
                      <span>86%</span>
                    </div>
                    <div className="h-2 rounded-full bg-emerald-100">
                      <div className="h-full w-4/5 rounded-full bg-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            </MotionDiv>

            <MotionDiv
              animate={{ y: [0, 8, 0] }}
              className="absolute -bottom-6 -right-2 flex w-36 items-center gap-3 rounded-[20px] border border-white/90 bg-white/90 p-3 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.3)]"
              transition={{ duration: 4.6, ease: "easeInOut", repeat: Number.POSITIVE_INFINITY }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-blue-50 text-blue-600">
                <Laptop className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Best On
                </p>
                <p className="text-sm font-medium text-slate-700">Laptop screens</p>
              </div>
            </MotionDiv>
          </div>

          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">
              Desktop experience only
            </p>
            <h2 className="text-[2rem] font-semibold leading-tight tracking-[-0.05em]">
              Please open this platform on a laptop or desktop to continue.
            </h2>
            <p className="text-[1rem] leading-8 text-slate-600">
              The first release is designed for larger screens so dashboards, sticky study
              views, and teacher collaboration tools stay calm, readable, and precise.
            </p>
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200/90 bg-slate-50/90 p-4 text-sm leading-7 text-slate-600">
          Serious IELTS preparation needs space for patterns, progress, and feedback. A desktop
          view keeps the experience clear and trustworthy.
        </div>
      </div>
    </div>
  );
}

export default MobileFallback;
