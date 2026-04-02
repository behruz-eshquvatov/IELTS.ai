import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "../components/layout/Footer";
import Header from "../components/layout/Header";
import MobileFallback from "../components/layout/MobileFallback";
import { useDesktopOnly } from "../hooks/useDesktopOnly";
import { scrollToHash } from "../lib/scroll";

function SiteLayout() {
  const location = useLocation();
  const isDesktop = useDesktopOnly();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        scrollToHash(location.hash, { behavior: "smooth" });
        return;
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);

  if (!isDesktop) {
    return <MobileFallback />;
  }

  return (
    <div className="page-shell">
      <Header />
      <Outlet />
      <Footer />
    </div>
  );
}

export default SiteLayout;
