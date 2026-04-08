function formatTimerLabel(totalSeconds) {
  const safeTotalSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeTotalSeconds / 60);
  const seconds = safeTotalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function WritingAttemptTimerCard({ remainingSeconds }) {
  const timerLabel = formatTimerLabel(remainingSeconds);

  return (
    <section className="relative overflow-hidden rounded-none border border-emerald-300/30 emerald-gradient-fill p-5 text-white shadow-[0_24px_70px_-42px_rgba(16,185,129,0.72)]">
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(to_right,rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/20 to-transparent" />

      <div className="relative z-10 flex min-h-[6.2rem] items-center justify-center">
        <p className="w-[6.5ch] text-center font-orbitron text-[4.4rem] font-bold leading-none tracking-[0.08em] text-white tabular-nums">
          {timerLabel}
        </p>
      </div>
    </section>
  );
}

export default WritingAttemptTimerCard;
