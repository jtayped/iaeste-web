import ContactFormBtn from "@/components/common/buttons/contact-form";
import SendEmailBtn from "@/components/common/buttons/send-email";
import Content from "@/components/common/sections/content";
import HeroSection from "@/components/common/sections/hero";
import Collaborators from "@/components/sections/collaborators";
import ContactSection from "@/components/sections/companies/contact";
import WhySection from "@/components/sections/companies/why";
import ButtonGroup from "@repo/ui/button-group";
import { useTranslations } from "next-intl";

const CompaniesPage = () => {
  const t = useTranslations("CompanyPage.hero");

  return (
    <main>
      <HeroSection
        title={t("title")}
        description={t("description")}
        backgroundImage="/team/ago-2024.webp"
        component={
          <ButtonGroup className="justify-center">
            <ContactFormBtn />
            <SendEmailBtn />
          </ButtonGroup>
        }
      />
      <Content>
        <Collaborators />
        <WhySection />
        <ContactSection />
      </Content>
    </main>
  );
};

export default CompaniesPage;
