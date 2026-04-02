import { useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

const MotionArticle = motion.article;
const MotionDiv = motion.div;

function clamp(value, limit) {
  return Math.max(-limit, Math.min(limit, value));
}

function SolutionFeatureCard({ card, index }) {
  const [isHovered, setIsHovered] = useState(false);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);

  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 20, mass: 0.5 });
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 20, mass: 0.5 });
  const springX = useSpring(x, { stiffness: 220, damping: 20, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 220, damping: 20, mass: 0.5 });
  const springGlowX = useSpring(glowX, { stiffness: 180, damping: 18, mass: 0.5 });
  const springGlowY = useSpring(glowY, { stiffness: 180, damping: 18, mass: 0.5 });

  const handleMove = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
    const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;

    rotateY.set(clamp(offsetX * 8, 5));
    rotateX.set(clamp(-offsetY * 8, 5));
    x.set(clamp(offsetX * 12, 6));
    y.set(clamp(offsetY * 12, 6));
    glowX.set(clamp(offsetX * 26, 18));
    glowY.set(clamp(offsetY * 26, 18));
  };

  const handleLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    x.set(0);
    y.set(0);
    glowX.set(0);
    glowY.set(0);
  };

  return (
    <div className="h-full [perspective:1600px]">
      <MotionArticle
        className="relative h-full min-h-[26rem] overflow-hidden rounded-[32px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,255,0.94)_100%)] p-7 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.22)]"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleLeave}
        onMouseMove={handleMove}
        style={{ rotateX: springRotateX, rotateY: springRotateY, x: springX, y: springY, transformPerspective: 1600 }}
      >
        <MotionDiv
          className="pointer-events-none absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.28),rgba(255,255,255,0)_72%)]"
          style={{ x: springGlowX, y: springGlowY, opacity: isHovered ? 0.95 : 0.62 }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/70 to-transparent" />
        <div className="pointer-events-none absolute -bottom-5 -right-1 text-[7rem] font-semibold leading-none tracking-[-0.08em] text-slate-100 transition duration-500">{card.id}</div>

        <div className="relative z-10 flex h-full flex-col">
          <div className="mb-6 flex items-center justify-between gap-4">
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-blue-700">
              Solution {card.id}
            </span>
            <span className="text-sm font-medium text-slate-400">0{index + 1}</span>
          </div>

          <div className="mb-auto">
            <h3 className="max-w-[18rem] text-[1.7rem] font-semibold leading-tight tracking-[-0.05em] text-slate-950">{card.problem}</h3>
            <p className="mt-5 text-[1rem] leading-8 text-slate-600">{card.solution}</p>
          </div>

          <div className="mt-8 grid gap-3">
            <div className="rounded-[22px] border border-slate-200/85 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">What becomes visible</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.insight}</p>
            </div>
            <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">What happens next</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{card.nextStep}</p>
            </div>
          </div>
        </div>
      </MotionArticle>
    </div>
  );
}

export default SolutionFeatureCard;
