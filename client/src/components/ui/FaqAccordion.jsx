import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import AskAIBox from "./AskAIBox";

const MotionDiv = motion.div;

function FaqRow({ answer, isOpen, onToggle, question }) {
  return (
    <div className="border-t border-slate-200/85 py-6 first:border-t-0">
      <button
        className="group flex w-full cursor-pointer items-start justify-between gap-6 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="max-w-3xl text-[1.08rem] font-medium leading-8 tracking-[-0.02em] text-slate-950 transition duration-300 group-hover:text-emerald-700">
          {question}
        </span>
        <span className="mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-slate-500 transition duration-300 group-hover:text-emerald-700">
          <ChevronDown
            className={clsx(
              "h-5 w-5 transition duration-300 group-hover:translate-y-0.5 group-hover:scale-110",
              isOpen && "rotate-180"
            )}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <MotionDiv
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-y-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="max-w-3xl pt-5 text-[1rem] leading-8 text-slate-600">{answer}</p>
          </MotionDiv>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function FaqAccordion({ className, includeAiRow = false, items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className={clsx("mx-auto max-w-4xl border-b border-slate-200/85", className)}>
      {items.map((item, index) => (
        <FaqRow
          answer={item.answer}
          isOpen={openIndex === index}
          key={item.question}
          onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
          question={item.question}
        />
      ))}

      {includeAiRow ? (
        <div className="border-t border-slate-200/85 py-6">
          <button
            className="group flex w-full cursor-pointer items-start justify-between gap-6 text-left"
            onClick={() => setOpenIndex(openIndex === items.length ? -1 : items.length)}
            type="button"
          >
            <span className="max-w-3xl text-[1.08rem] font-medium leading-8 tracking-[-0.02em] text-slate-950 transition duration-300 group-hover:text-emerald-700">
              Still need help?
            </span>
            <span className="mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-slate-500 transition duration-300 group-hover:text-emerald-700">
              <ChevronDown
                className={clsx(
                  "h-5 w-5 transition duration-300 group-hover:translate-y-0.5 group-hover:scale-110",
                  openIndex === items.length && "rotate-180"
                )}
              />
            </span>
          </button>

          <AnimatePresence initial={false}>
            {openIndex === items.length ? (
              <MotionDiv
                animate={{ height: "auto", opacity: 1 }}
                className=""
                exit={{ height: 0, opacity: 0 }}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              >
                <AskAIBox className="pt-6" compact />
              </MotionDiv>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </div>
  );
}

export default FaqAccordion;
