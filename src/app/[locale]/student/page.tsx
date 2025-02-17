import HeroSection from "@/components/common/sections/hero";
import ContactSection from "@/components/sections/students/contact";
import Outgoings from "@/components/sections/students/outgoings";
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
      <div className="bg-background pb-10 pt-20 grid gap-20">
        <WhyIaeste />
        <Outgoings />
        <Team />
        <ContactSection />
      </div>
    </main>
  );
};

export default StudentsPage;
