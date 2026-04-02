import StudentDashboardPreview from "../product/StudentDashboardPreview";
import MagneticButton from "../ui/MagneticButton";
import SectionHeading from "../ui/SectionHeading";

function StudentShowcaseSection() {
  return (
    <section className="section-shell section-space" id="student-preview">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          copy="A soft dashboard keeps target score, weak areas, recommended tasks, consistency, and study time in one calm view. Nothing feels overloaded."
          eyebrow="Student dashboard preview"
          title="A study dashboard that feels clear enough to trust"
        />
        <div className="w-full sm:w-auto">
          <MagneticButton hoverLabel="See details" to="/student/auth" variant="secondary">
            For Students
          </MagneticButton>
        </div>
      </div>

      <div className="mt-14">
        <StudentDashboardPreview detailed showCallouts />
      </div>
    </section>
  );
}

export default StudentShowcaseSection;
