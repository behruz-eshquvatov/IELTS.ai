import { solutionPairs } from "../../data/siteContent";
import SolutionFeatureCard from "./SolutionFeatureCard";
import SectionHeading from "../ui/SectionHeading";

function SolutionGridSection() {
  return (
    <section className="section-shell section-space">
      <SectionHeading
        align="center"
        copy="The strongest study systems feel specific. They do not promise vague improvement. They explain what problem is happening, why it keeps happening, and what changes next."
        eyebrow="Real problems, tailored solutions"
        title="Serious IELTS preparation should feel like it understands your exact struggle"
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {solutionPairs.map((item, index) => (
          <div key={item.problem}>
            <SolutionFeatureCard card={item} index={index} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default SolutionGridSection;
