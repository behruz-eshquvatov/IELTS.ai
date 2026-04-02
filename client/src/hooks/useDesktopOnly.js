import { useEffect, useState } from "react";

const DESKTOP_BREAKPOINT = 1024;

export function useDesktopOnly() {
  const getIsDesktop = () =>
    typeof window === "undefined"
      ? true
      : window.innerWidth >= DESKTOP_BREAKPOINT;

  const [isDesktop, setIsDesktop] = useState(getIsDesktop);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(getIsDesktop());
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return isDesktop;
}
