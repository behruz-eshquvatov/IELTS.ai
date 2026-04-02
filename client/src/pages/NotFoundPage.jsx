import { useEffect, useRef, useState } from "react";
import MagneticButton from "../components/ui/MagneticButton";

const pattern = [
  "000000000000000000",
  "000001001100001000",
  "000011010010011000",
  "000101010010101000",
  "000111010010111000",
  "000001001100001000",
  "000000000000000000",
];

const activePalette = [
  "rgba(16,185,129,0.92)",
];

function getRandomAccent() {
  return activePalette[Math.floor(Math.random() * activePalette.length)];
}

function Square({ isTarget }) {
  const [activeColor, setActiveColor] = useState(null);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setActiveColor(isTarget ? getRandomAccent() : "rgba(16,185,129,0.22)");

    timeoutRef.current = setTimeout(() => {
      setActiveColor(null);
    }, 700);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const baseColor = isTarget ? "rgba(16,185,129,0.92)" : "rgba(15,23,42,0.06)";

  return (
    <div
      className="aspect-square w-full border border-slate-300/35 transition-colors duration-500 sm:rounded-[0.35rem]"
      onMouseEnter={handleMouseEnter}
      style={{ backgroundColor: activeColor || baseColor }}
    />
  );
}

function NotFoundPage() {
  return (
    <section className="min-h-screen bg-[#f5f1ea] px-4 pb-20 pt-26 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div
          className="grid w-full gap-1.5 sm:gap-2.5 lg:gap-3"
          style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))" }}
        >
          {pattern.map((row, rowIndex) =>
            row.split("").map((cell, colIndex) => (
              <Square isTarget={cell === "1"} key={`${rowIndex}-${colIndex}`} />
            ))
          )}
        </div>

        <div className="mx-auto mt-14 max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-slate-900 sm:text-3xl">
            Oops. This page is missing from the flow.
          </h2>
          <p className="mt-3 text-[1rem] leading-8 text-slate-600">
            Let&apos;s get you back to the homepage so you can continue through the product
            normally.
          </p>

          <div className="mt-8 flex justify-center">
            <MagneticButton
              innerClassName="emerald-gradient-fill group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-emerald-300/20 px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)]"
              to="/"
            >
              <span className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <span className="h-full w-8 bg-white/35 blur-sm" />
              </span>
              <span className="relative">Take me home</span>
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
