import HeroSection from "@/components/common/hero-section";
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
    </main>
  );
};

export default StudentsPage;
