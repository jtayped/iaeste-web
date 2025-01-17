import HeroSection from "@/components/common/hero-section";
import Team from "@/components/sections/students/team";
import WhyIaeste from "@/components/sections/students/why";
import { useTranslations } from "next-intl";

const StudentsPage = () => {
  const t = useTranslations("StudentsPage");

  return (
    <main>
      <HeroSection
        title={t("hero.title")}
        description={t("hero.description")}
        backgroundImage="/hero.jpg"
      />
      <div className="bg-background py-10">
        <WhyIaeste />
        <Team />
      </div>
    </main>
  );
};

export default StudentsPage;
