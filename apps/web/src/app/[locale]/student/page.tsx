import ContactFormBtn from "@/components/common/buttons/contact-form";
import SendEmailBtn from "@/components/common/buttons/send-email";
import Content from "@/components/common/sections/content";
import HeroSection from "@/components/common/sections/hero";
import ContactSection from "@/components/sections/students/contact";
import Team from "@/components/sections/students/team";
import WhyIaeste from "@/components/sections/students/why";
import ButtonGroup from "@repo/ui/button-group";
import { getTranslations } from "next-intl/server";
import { getRegistrationWindow } from "@/lib/registration-status";
import Inscripcions from "@/components/sections/students/inscripcions";

const StudentsPage = async () => {
  const t = await getTranslations("StudentsPage.hero");
  const registrationWindow = await getRegistrationWindow();

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
      {/* Outside `Content` so it butts straight up against the hero; `Content`
          keeps its own top padding for whatever follows the band. */}
      <Inscripcions status={registrationWindow} />
      <Content>
        <WhyIaeste />
        <Team />
        <ContactSection />
      </Content>
    </main>
  );
};

export default StudentsPage;
