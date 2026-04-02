import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const problemSolutionCards = [
  {
    id: "01",
    problem:
      "In many IELTS centers, homework is marked as complete even when teachers cannot verify how honestly or independently it was done outside class.",
    solution:
      "The platform moves tasks into a controlled environment with restricted answer visibility, playback rules, repeated-attempt conditions, and behavioral tracking so both effort and performance become transparent.",
  },
  {
    id: "02",
    problem:
      "Group teaching often hides individual weakness patterns, so students with similar band scores keep practicing without understanding which section or task type is actually blocking progress.",
    solution:
      "The system analyzes each learner's task history and error distribution by section, question type, and repeated pattern, then recommends targeted follow-up practice instead of generic repetition.",
  },
  {
    id: "03",
    problem:
      "Traditional homework checking wastes lesson time and often produces delayed or unreliable feedback, especially for writing tasks that teachers cannot review immediately across multiple groups.",
    solution:
      "Listening and reading can be evaluated instantly, while writing receives structured analysis on grammar, vocabulary, coherence, and task response, giving teachers earlier visibility and students fresher feedback.",
  },
  {
    id: "04",
    problem:
      "Students often begin with ambitious score goals but unrealistic timelines, which leads to early overexertion, discouragement, and a drop in consistency after the first wave of motivation fades.",
    solution:
      "The platform aligns target scores with real behavior data, forecasts realistic timelines, calculates the workload required for faster progress, and keeps students accountable through measurable daily progress indicators.",
  },
];

const SOLUTION_HANDLE_HEIGHT = "4.75rem";

function ProblemCard({ card }) {
  const [isSolutionVisible, setIsSolutionVisible] = useState(false);
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
      className="group/problem-card relative min-h-[29rem] overflow-visible bg-slate-200 p-[1.5px] transition-colors duration-600 backdrop-blur-xl"
      onMouseLeave={() => setIsSolutionVisible(false)}
      style={{
        backgroundImage:
          "radial-gradient(480px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,1), transparent 68%), radial-gradient(760px circle at var(--card-x, 50%) var(--card-y, 50%), rgba(16,185,129,0.14), transparent 62%)",
      }}
    >
      <div className="relative flex h-full min-h-[29rem] flex-col overflow-hidden bg-[#f7f4ef] p-7">
        <div className="pointer-events-none absolute -right-5 -bottom-10 text-[17rem] font-black leading-none tracking-[-0.08em] text-slate-900/5 opacity-0 transition-opacity duration-500 group-hover/problem-card:opacity-100">
          {card.id}
        </div>

        <div
          className={`relative z-10 pr-10 transition-all ${isSolutionVisible
            ? "-translate-y-14 opacity-0 duration-300 ease-out"
            : "translate-y-0 opacity-100 duration-500 ease-out"
            }`}
        >
          <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Problem is:
          </span>
          <h3 className="mt-5 text-[1.42rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950">
            {card.problem}
          </h3>
        </div>

        <div
          className={`absolute inset-x-0 -bottom-2 -t-2 z-20 transition-transform duration-400 ${isSolutionVisible ? "translate-y-0" : "translate-y-[calc(100%-4.75rem)]"
            }`}
          tabIndex={-1}
        >
          <button
            className=" w-full flex items-center bg-transparent px-3 bg-linear-to-b from-transparent to-[#f7f4ef] py-2 text-left"
            type="button"
          >
            <span
              onBlur={() => setIsSolutionVisible(false)}
              onFocus={() => setIsSolutionVisible(true)}
              onMouseEnter={() => setIsSolutionVisible(true)} className="group/solution inline-flex w-fit p-4 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-950 transition duration-300 group-hover/problem-card:text-emerald-700 group-hover/solution:scale-[1.03] group-hover/solution:text-emerald-700">
              <span>Solution</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-500 group-hover/solution:translate-x-0.5 group-hover/solution:-translate-y-0.5 group-hover/solution:scale-110" />
            </span>
          </button>

          <div
            className={` px-7 h-[29rem] pb-7 pt-6 transition-colors duration-400 ${isSolutionVisible ? "bg-[#f7f4ef]" : "bg-transparent"}`}
          >
            <span className="block text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Solution is:
            </span>
            <p className="mt-5 text-[1.42rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950">{card.solution}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProblemSection() {
  return (
    <section className="relative section-space" id="problems">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="space-y-12">
          <div className="relative space-y-3 lg:pt-3">
            <div className="w-fit space-y-3 lg:absolute lg:left-0 lg:top-6">
              <span className="block h-px w-full bg-slate-900" />
              <p className="text-sm font-semibold tracking-[-0.03em] text-slate-950">
                Problems & Solutions
              </p>
            </div>

            <h2 className="text-7xl font-semibold leading-[0.96] tracking-[-0.08em] text-slate-950 lg:[text-indent:15rem]">
              IELTS progress stays <span className="font-light italic">unclear</span> without
              structure. AI reveals the <span className="font-light italic">weak</span> points.
            </h2>

            <div className="grid xl:grid-cols-2 mt-8 gap-3">
              <div className="hidden xl:block" />
              <p className="max-w-xlmx-auto mb-4 hidden max-w-2xl text-lg font-medium leading-relaxed text-slate-800 sm:block md:text-xl">
                These four cases show where IELTS preparation usually breaks down:
                accountability, individual diagnosis, feedback timing, and realistic planning.
                The platform turns each one into a more measurable and structured process.
              </p>
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-2">
            {problemSolutionCards.map((card) => (
              <ProblemCard card={card} key={card.id} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProblemSection;
