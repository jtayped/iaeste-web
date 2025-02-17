import DivideSection from "@/components/common/sections/divide";
import { H2, Paragraph, Subheader } from "@/components/ui/typography";
import React from "react";
import Reasons from "../reasons";
import { useTranslations } from "next-intl";
import LearnMoreBtn from "@/components/common/buttons/learn-more";

const WhyIaeste = () => {
  const t = useTranslations("StudentsPage.why-iaeste");

  return (
    <DivideSection>
      <article>
        <H2>{t("title")}</H2>
        <Subheader>{t("subtitle")}</Subheader>
        <Paragraph>{t("description")}</Paragraph>
        <LearnMoreBtn />
      </article>
      <Reasons />
    </DivideSection>
  );
};

export default WhyIaeste;
