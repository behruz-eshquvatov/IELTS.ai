import { motion as Motion } from "framer-motion";
import useBodyScrollLock from "../../../hooks/useBodyScrollLock";

function ExamPopup({ children, isOpen, maxWidthClass = "max-w-xl", onClose }) {
  useBodyScrollLock(isOpen);

  if (!isOpen) {
    return null;
  }

  return (
    <Motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
      initial={{ opacity: 0 }}
      onClick={() => {
        if (typeof onClose === "function") {
          onClose();
        }
      }}
      role="presentation"
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <Motion.div
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`w-full ${maxWidthClass} border border-slate-200 bg-white p-6 text-center shadow-2xl sm:p-7`}
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        onClick={(event) => event.stopPropagation()}
        transition={{ duration: 0.34, ease: "easeOut", delay: 0.05 }}
      >
        {children}
      </Motion.div>
    </Motion.div>
  );
}

export default ExamPopup;

