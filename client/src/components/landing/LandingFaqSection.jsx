import { faqItems } from "../../data/siteContent";
import FaqAccordion from "../ui/FaqAccordion";

function LandingFaqSection() {
  return (
    <section className="section-space" id="faq">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="space-y-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto w-fit space-y-3">
              <span className="block h-px w-full bg-slate-900" />
              <p className="text-sm font-semibold tracking-[-0.03em] text-slate-950">
                Frequently Asked Questions
              </p>
            </div>

            <h2 className="mt-4 text-5xl font-semibold leading-[0.96] tracking-[-0.08em] text-slate-950 sm:text-6xl lg:text-7xl">
              Clear answers before you commit to a more{" "}
              <span className="font-light italic">structured</span> way of preparing.
            </h2>
          </div>

          <div className="mx-auto max-w-4xl">
            <FaqAccordion className="w-full border-t border-slate-200/85 pt-5" includeAiRow items={faqItems} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default LandingFaqSection;
