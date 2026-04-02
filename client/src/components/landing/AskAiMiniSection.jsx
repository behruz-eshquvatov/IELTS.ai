import AskAIBox from "../ui/AskAIBox";
import SectionHeading from "../ui/SectionHeading";

function AskAiMiniSection() {
  return (
    <section className="section-shell section-space" id="ask-ai">
      <div className="surface-card overflow-hidden p-8 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.44fr_0.56fr] lg:items-start">
          <SectionHeading
            copy="If the FAQ is not enough, ask a direct question about the workflow, the desktop-first experience, teacher visibility, or how progress is measured."
            eyebrow="Ask AI"
            title="Need a clearer answer before you try the platform?"
          />
            <AskAIBox compact />
        </div>
      </div>
    </section>
  );
}

export default AskAiMiniSection;
