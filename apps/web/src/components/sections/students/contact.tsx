import SendEmailBtn from "@/components/common/buttons/send-email";
import ContactForm from "@/components/common/contact-form";
import DivideSection from "@/components/common/sections/divide";
import { H2, Paragraph } from "@repo/ui/typography";
import { useTranslations } from "next-intl";
import React from "react";

const ContactSection = () => {
  const t = useTranslations("StudentsPage.contact");

  return (
    <DivideSection>
      <article>
        <H2>{t("title")}</H2>
        <Paragraph>{t("description")}</Paragraph>
        <SendEmailBtn icon />
      </article>
      <ContactForm />
    </DivideSection>
  );
};

export default ContactSection;
