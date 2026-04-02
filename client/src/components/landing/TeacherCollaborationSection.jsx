import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import MagneticButton from "../ui/MagneticButton";

const teacherEvidenceRows = [
  {
    id: "01",
    title: "Homework accountability",
    copy:
      "Tasks are completed inside a controlled environment with restricted answer visibility, playback rules, repeated-attempt conditions, and behavior tracking. Teachers can review not only the score, but also the honesty and effort behind it.",
  },
  {
    id: "02",
    title: "Individual diagnosis in group classes",
    copy:
      "Instead of showing only a final result, the platform breaks errors down by section, task type, and repeated pattern. This helps teachers see whether a student is really blocked by Part 3 listening, map questions, multiple choice, or another specific weakness.",
  },
  {
    id: "03",
    title: "Faster checking and feedback",
    copy:
      "Listening and reading tasks can be evaluated immediately, while writing receives structured analysis on grammar, vocabulary, coherence, and task response. Lesson time shifts away from repetitive checking and toward actual teaching decisions.",
  },
  {
    id: "04",
    title: "Realistic planning and motivation",
    copy:
      "Teachers gain visibility into workload, consistency, and progress over time. That makes it easier to challenge unrealistic score timelines, reinforce disciplined study behavior, and guide students toward plans they can actually sustain.",
  },
];

const teacherIntroImages = [
  {
    alt: "Teacher collaborating with students around a laptop",
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80",
  },
  {
    alt: "Students working with laptops in a study setting",
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
  },
];

const fadeUpVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const teacherCardVariants = {
  initial: { opacity: 0, y: 26 },
  animate: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.12 + index * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

const SOLUTION_HANDLE_HEIGHT = "4.75rem";

function TeacherEvidenceCard({ row }) {
  const [isResponseVisible, setIsResponseVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!cardRef.current) {
        return;
      }

      const rect = cardRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      cardRef.current.style.setProperty("--card-x", `${x}px`);
      cardRef.current.style.setProperty("--card-y", `${y}px`);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <article
      ref={cardRef}
      className="group/teacher-card relative min-h-[29rem] overflow-visible bg-slate-200 p-[1.5px] transition-colors duration-600 backdrop-blur-xl"
      onMouseLeave={() => setIsResponseVisible(false)}
      style={{
        backgroundImage:
          "radial-gradient(480px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,1), transparent 68%), radial-gradient(760px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.14), transparent 62%)",
      }}
    >
      <div className="relative flex h-full min-h-[29rem] flex-col overflow-hidden bg-[#faf7f2] p-7">
        <div className="pointer-events-none absolute -right-5 -bottom-10 text-[17rem] font-black leading-none tracking-[-0.08em] text-slate-900/5 opacity-0 transition-opacity duration-500 group-hover/teacher-card:opacity-100">
          {row.id}
        </div>

        <div
          className={`relative z-10 pr-10 transition-all ${isResponseVisible
              ? "-translate-y-14 opacity-0 duration-300 ease-out"
              : "translate-y-0 opacity-100 duration-500 ease-out"
            }`}
        >
          <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Teacher focus:
          </span>
          <h3 className="mt-5 text-[1.42rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            {row.title}
          </h3>
        </div>

        <div
          className={`absolute inset-x-0 -bottom-2 z-20 transition-transform duration-400 ${isResponseVisible ? "translate-y-0" : `translate-y-[calc(100%-${SOLUTION_HANDLE_HEIGHT})]`
            }`}
          tabIndex={-1}
        >
          <button
            className="flex w-full items-center bg-transparent bg-linear-to-b from-transparent to-[#faf7f2] px-3 py-2 text-left"
            type="button"
          >
            <span
              onBlur={() => setIsResponseVisible(false)}
              onFocus={() => setIsResponseVisible(true)}
              onMouseEnter={() => setIsResponseVisible(true)}
              className="group/teacher-solution inline-flex w-fit cursor-pointer items-center gap-2 p-4 text-sm font-semibold text-slate-950 transition duration-300 group-hover/teacher-card:text-slate-700 group-hover/teacher-solution:scale-[1.03] group-hover/teacher-solution:text-slate-700"
            >
              <span>Platform response</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover/teacher-solution:translate-x-0.5 group-hover/teacher-solution:-translate-y-0.5 group-hover/teacher-solution:scale-110" />
            </span>
          </button>

          <div
            className={`h-[29rem] px-7 pb-7 pt-6 transition-colors duration-400 ${isResponseVisible ? "bg-[#faf7f2]" : "bg-transparent"
              }`}
          >
            <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Response:
            </span>
            <p className="mt-5 text-[1.16rem] font-medium leading-8 tracking-[-0.03em] text-slate-950">
              {row.copy}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

function TeacherCollaborationSection() {
  return (
    <section className="relative bg-[#f1ede6] section-space" id="teacher-collaboration">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="space-y-14">
          <div className="relative space-y-3 lg:pt-3">
            <motion.div
              animate="animate"
              className="w-fit space-y-3 lg:absolute lg:left-0 lg:top-6"
              initial="initial"
              variants={fadeUpVariants}
            >
              <span className="block h-px w-full bg-slate-900" />
              <p className="text-sm font-semibold tracking-[-0.03em] text-slate-950">
                Teacher collaboration
              </p>
            </motion.div>

            <motion.h2
              animate="animate"
              className="text-5xl font-semibold leading-[0.96] tracking-[-0.08em] text-slate-950 sm:text-6xl lg:text-7xl lg:[text-indent:15rem]"
              initial="initial"
              variants={fadeUpVariants}
            >
              Built to give teachers <span className="font-light italic">evidence</span>, not
              more guesswork.
            </motion.h2>

            <div className="mt-8 grid gap-8 xl:grid-cols-2">
              <motion.p
                animate="animate"
                className="space-y-4 text-[1.08rem] leading-8 text-slate-700"
                initial="initial"
                variants={fadeUpVariants}
              >
                <img
                  alt={teacherIntroImages[0].alt}
                  className="h-[250px] w-full object-cover"
                  src={teacherIntroImages[0].src}
                />
                <span className="block">
                  This platform is not meant to replace teachers or act as a full beginner
                  learning system. It works as a serious support layer for students who already
                  know the IELTS format and need more disciplined, measurable improvement.
                </span>
              </motion.p>
              <motion.p
                animate="animate"
                className="space-y-4 text-[1.08rem] leading-8 text-slate-700"
                initial="initial"
                variants={fadeUpVariants}
              >
                <img
                  alt={teacherIntroImages[1].alt}
                  className="h-[250px] w-full object-cover"
                  src={teacherIntroImages[1].src}
                />
                <span className="block">
                  The teacher side focuses on visibility: how tasks were completed, where weak
                  patterns repeat, how much genuine effort is being invested, and whether progress
                  is reliable enough to trust.
                </span>
              </motion.p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {teacherEvidenceRows.map((row, index) => (
              <motion.div
                animate="animate"
                custom={index}
                initial="initial"
                key={row.id}
                variants={teacherCardVariants}
              >
                <TeacherEvidenceCard row={row} />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TeacherCollaborationSection;
