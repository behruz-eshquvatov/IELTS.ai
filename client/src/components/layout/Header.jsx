import { LayoutGroup, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { brand, headerNav } from "../../data/siteContent";
import { useHeaderVisibility } from "../../hooks/useHeaderVisibility";
import { scrollToSection } from "../../lib/scroll";
import MagneticButton from "../ui/MagneticButton";

const headerVariants = {
  initial: {
    y: -20,
    opacity: 0,
  },
  visible: (isCompact) => ({
    y: 0,
    opacity: 1,
    backgroundColor: isCompact ? "rgba(255, 255, 255, 0.82)" : "rgba(255, 255, 255, 0)",
    backdropFilter: isCompact ? "blur(16px)" : "blur(0px)",
    borderBottomColor: isCompact ? "#cbd5e1" : "rgba(255, 255, 255, 0)",
    paddingTop: isCompact ? "14px" : "24px",
    paddingBottom: isCompact ? "14px" : "38px",
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 30,
    },
  }),
};

const logoVariants = {
  compact: { scale: 0.92, transition: { type: "spring", stiffness: 300 } },
  expanded: { scale: 1, transition: { type: "spring", stiffness: 300 } },
};

const MotionHeader = motion.header;
const MotionDiv = motion.div;

const landingSectionMap = {
  Home: "top",
  "How It Works": "how-it-works",
  "For Students": "students",
  "For Teachers": "teachers",
  Pricing: "pricing",
  FAQ: "faq",
};

function RollingLabel({ label, active = false }) {
  return (
    <span className="relative block h-[1.2rem] overflow-hidden">
      <span
        className={`flex flex-col transition-transform duration-300 ease-out group-hover/header-link:-translate-y-1/2 ${
          active ? "-translate-y-1/2" : "translate-y-0"
        }`}
      >
        <span className="h-[1.2rem]">{label}</span>
        <span className="h-[1.2rem] text-slate-950">{label}</span>
      </span>
    </span>
  );
}

function buildNavItems() {
  return headerNav.map((item) => {
    const sectionId = landingSectionMap[item.label];

    if (sectionId) {
      return {
        ...item,
        sectionId,
        to: sectionId === "top" ? "/" : `/#${sectionId}`,
      };
    }

    return item;
  });
}

// FIXED: Normalizing the hash to include the "/" so it matches item.to perfectly
function resolveActiveTarget(location) {
  if (location.pathname === "/" && location.hash) {
    return `/${location.hash}`; // Turns "#faq" into "/#faq"
  }
  return location.pathname; // Returns "/" when no landing hash is active
}

function Header() {
  const { isCompact } = useHeaderVisibility();
  const location = useLocation();
  const navigate = useNavigate();
  const isLandingPage = location.pathname === "/";
  const navItems = buildNavItems();
  const activeTarget = resolveActiveTarget(location);

  const handleSectionClick = (event, item) => {
    if (!item.sectionId) return;
    if (!isLandingPage) return;

    event.preventDefault();

    if (item.sectionId === "top") {
      navigate("/");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigate(`/#${item.sectionId}`);
    scrollToSection(item.sectionId);
  };

  return (
    <MotionHeader
      animate="visible"
      className="fixed inset-x-0 top-0 z-50 transition-colors"
      custom={isCompact}
      initial="initial"
      style={{ borderBottomWidth: 1, borderBottomStyle: "solid" }}
      variants={headerVariants}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link
          className="group flex shrink-0 items-center gap-3 text-slate-900"
          onClick={(event) => {
            if (!isLandingPage) return;

            event.preventDefault();
            navigate("/");
            scrollToSection("top");
          }}
          to="/"
        >
          <MotionDiv
            animate={isCompact ? "compact" : "expanded"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-500 text-sm font-semibold tracking-widest text-slate-950 shadow-lg transition-shadow group-hover:shadow-emerald-500/30"
            variants={logoVariants}
          >
            {brand.mark}
          </MotionDiv>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            {brand.name}
          </span>
        </Link>

        <LayoutGroup>
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              // FIXED: Simplified logic because activeTarget is now correctly formatted
              const isActive = activeTarget === item.to;

              return (
                <Link
                  className={`group/header-link relative rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-slate-950" : "text-slate-600 hover:text-slate-950"
                  }`}
                  key={item.label}
                  onClick={
                    item.sectionId
                      ? (event) => handleSectionClick(event, item)
                      : undefined
                  }
                  to={item.to}
                >
                  <RollingLabel active={isActive} label={item.label} />
                  
                  {isActive && (
                    <MotionDiv
                      layoutId="header-active-line"
                      // FIXED: Made the line lighter using bg-slate-400
                      className="absolute inset-x-3 bottom-0 h-px rounded-full bg-slate-950"
                      initial={false}
                      transition={{
                        type: "spring",
                        bounce: 0.2, // Bounce is a smoother, more modern physics prop than stiffness/damping
                        duration: 0.5,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </LayoutGroup>

        <div className="hidden lg:block">
          <MagneticButton
            className="rounded-full"
            innerClassName="emerald-gradient-fill group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-emerald-300/30 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_-28px_rgba(16,185,129,0.72)]"
            to="/student/auth"
          >
            <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
              <div className="h-full w-8 bg-white/40 blur-sm" />
            </div>
            <span className="relative inline-flex items-center gap-3">
              <RollingLabel label="Get Started" />
              <ChevronRight className="h-4 w-4 text-white" />
            </span>
          </MagneticButton>
        </div>
      </div>
    </MotionHeader>
  );
}

export default Header;
