import { useEffect, useRef, useState } from "react";

const DEFAULT_POSITION = {
  x: "50%",
  y: "20%",
};

function InteractiveGridBackground({ className = "", style }) {
  const [pointerPosition, setPointerPosition] = useState(DEFAULT_POSITION);
  const backgroundRef = useRef(null);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!backgroundRef.current) {
        return;
      }

      const rect = backgroundRef.current.getBoundingClientRect();

      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const relativeX = ((event.clientX - rect.left) / rect.width) * 100;
      const relativeY = ((event.clientY - rect.top) / rect.height) * 100;
      const nextX = `${Math.min(100, Math.max(0, relativeX))}%`;
      const nextY = `${Math.min(100, Math.max(0, relativeY))}%`;

      setPointerPosition({
        x: nextX,
        y: nextY,
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`interactive-grid pointer-events-none absolute inset-0 z-0 ${className}`}
      ref={backgroundRef}
      style={{
        "--grid-x": pointerPosition.x,
        "--grid-y": pointerPosition.y,
        ...style,
      }}
    >
      <div className="interactive-grid__reveal" />
    </div>
  );
}

export default InteractiveGridBackground;
