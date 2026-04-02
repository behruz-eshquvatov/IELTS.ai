import FinalCtaSection from "../components/landing/FinalCtaSection";
import HeroSection from "../components/landing/HeroSection";
import LandingFaqSection from "../components/landing/LandingFaqSection";
import ProblemSection from "../components/landing/ProblemSection";
import SkillProgressSection from "../components/landing/SkillProgressSection";
import TeacherCollaborationSection from "../components/landing/TeacherCollaborationSection";

function LandingPage() {
  return (
    <div>
      <div id="top">
        <HeroSection />
      </div>
      <div id="how-it-works">
        <ProblemSection />
      </div>
      <div id="students">
        <SkillProgressSection />
      </div>
      <div id="teachers">
        <TeacherCollaborationSection />
      </div>
      <div id="pricing">
        <FinalCtaSection />
      </div>
      <LandingFaqSection />
    </div>
  );
}

export default LandingPage;
