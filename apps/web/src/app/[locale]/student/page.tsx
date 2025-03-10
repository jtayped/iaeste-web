import ContactFormBtn from "@/components/common/buttons/contact-form";
import SendEmailBtn from "@/components/common/buttons/send-email";
import Content from "@/components/common/sections/content";
import HeroSection from "@/components/common/sections/hero";
import ContactSection from "@/components/sections/students/contact";
import Team from "@/components/sections/students/team";
import WhyIaeste from "@/components/sections/students/why";
import ButtonGroup from "@/components/ui/button-group";
import { useTranslations } from "next-intl";

const StudentsPage = () => {
  const t = useTranslations("StudentsPage.hero");

  return (
    <main>
      <HeroSection
        title={t("title")}
        description={t("description")}
        backgroundImage="/team/subhasta-zaragoza.webp"
        component={
          <ButtonGroup className="justify-center">
            <ContactFormBtn />
            <SendEmailBtn />
          </ButtonGroup>
        }
      />
      <Content>
        <WhyIaeste />
        <Team />
        <ContactSection />
      </Content>
    </main>
  );
};

export default StudentsPage;
