import { processSteps } from "../../data/siteContent";
import SectionHeading from "../ui/SectionHeading";

function HowItWorksSection() {
  return (
    <section className="section-shell section-space" id="how-it-works">
      <SectionHeading
        align="center"
        copy="A clear path matters more than endless task volume. The workflow stays simple, measurable, and calm from the first target score to the next recommendation."
        eyebrow="How it works"
        title="A guided study flow designed to make improvement feel more reliable"
      />

      <div className="mt-14 grid gap-5 lg:grid-cols-4">
        {processSteps.map((step, index) => (
          <div className="surface-card-sm h-full p-6" key={step.title}>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">{step.number}</p>
            <h3 className="mt-6 text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950">{step.title}</h3>
            <p className="mt-4 text-[0.98rem] leading-8 text-slate-600">{step.copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorksSection;
