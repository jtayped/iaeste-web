import ContactFormBtn from "@/components/common/buttons/contact-form";
import SendEmailBtn from "@/components/common/buttons/send-email";
import Content from "@/components/common/sections/content";
import HeroSection from "@/components/common/sections/hero";
import Collaborators from "@/components/sections/collaborators";
import ContactSection from "@/components/sections/companies/contact";
import Testimonial from "@/components/sections/companies/testimonial";
import WhySection from "@/components/sections/companies/why";
import ButtonGroup from "@repo/ui/button-group";
import { useTranslations } from "next-intl";

const CompaniesPage = () => {
  const t = useTranslations("CompanyPage.hero");

  return (
    <>
      <HeroSection
        title={t("title")}
        subtitle={t("subtitle")}
        description={t("description")}
        backgroundImage="/team/ago-2024.webp"
        component={
          <ButtonGroup className="flex-wrap justify-center">
            <ContactFormBtn />
            <SendEmailBtn variant="onDarkSoft" />
          </ButtonGroup>
        }
      />
      <Content>
        <Collaborators />
        <WhySection />
        <Testimonial />
        <ContactSection />
      </Content>
    </>
  );
};

export default CompaniesPage;
