import { Card } from "@repo/ui/card";
import { H2, H3, Paragraph } from "@repo/ui/typography";
import { useTranslations } from "next-intl";
import React from "react";
import { reasonIcons } from "@/constants/companies";
import Section from "@/components/common/sections/section";

const Reason = ({ tKey }: { tKey: string }) => {
  const t = useTranslations(`CompanyPage.why.reasons.${tKey}`);
  const Icon = reasonIcons[tKey]!;

  return (
    <Card accent>
      <Icon size={40} />
      <H3>{t("title")}</H3>
      <Paragraph>{t("description")}</Paragraph>
    </Card>
  );
};

const WhySection = () => {
  const t = useTranslations("CompanyPage.why");
  return (
    <Section>
      <div>
        <H2>{t("title")}</H2>
      </div>
      <div className="grid gap-6 md:grid-cols-3 mt-9">
        <Reason tKey="talent" />
        <Reason tKey="innovation" />
        <Reason tKey="growth" />
      </div>
    </Section>
  );
};

export default WhySection;
