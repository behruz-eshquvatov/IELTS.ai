import TeacherDashboardPreview from "../product/TeacherDashboardPreview";
import MagneticButton from "../ui/MagneticButton";
import SectionHeading from "../ui/SectionHeading";

function TeacherShowcaseSection() {
  return (
    <section className="section-shell section-space" id="teacher-preview">
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          copy="Teacher support is built into the product, not added as an afterthought. Review class summaries, completion quality, suspicious activity, and recent performance from one place."
          eyebrow="Teacher dashboard preview"
          title="A teacher view designed for practical support before class begins"
        />
        <div className="w-full sm:w-auto">
          <MagneticButton hoverLabel="Open view" to="/teachers/auth" variant="secondary">
            Teacher Collaboration
          </MagneticButton>
        </div>
      </div>

      <div className="mt-14">
        <TeacherDashboardPreview detailed showCallouts />
      </div>
    </section>
  );
}

export default TeacherShowcaseSection;
