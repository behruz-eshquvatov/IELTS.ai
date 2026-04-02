import { motion } from "framer-motion";
import { getRandomLoadingMessage } from "../../lib/loadingMessages";

const MotionDiv = motion.div;
const MotionP = motion.p;

function RouteLoaderScreen({
  message = getRandomLoadingMessage(),
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6f1e8] px-6 text-slate-950">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[4px] overflow-hidden bg-slate-950/5">
        <MotionDiv
          animate={{ scaleX: 1 }}
          className="h-full origin-left bg-[linear-gradient(90deg,#10b981_0%,#34d399_35%,#f8fafc_52%,#34d399_68%,#10b981_100%)]"
          initial={{ scaleX: 0 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="relative mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
        <MotionP
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 max-w-3xl text-base font-light leading-[1.14] tracking-[0.06em] text-slate-950 sm:text-lg lg:text-3xl"
          initial={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.42, ease: "easeOut" }}
        >
          {message}
        </MotionP>
      </div>
    </div>
  );
}

export default RouteLoaderScreen;
