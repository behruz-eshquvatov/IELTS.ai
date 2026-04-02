import { useEffect, useState } from "react";

export function useHeaderVisibility() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const COMPACT_SCROLL_THRESHOLD = 24;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setIsCompact(currentScrollY > COMPACT_SCROLL_THRESHOLD);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return { isCompact };
}
