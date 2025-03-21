import { H2, H3, Paragraph, Subheader } from "@repo/ui/typography";
import React from "react";
import reasons from "@/constants/why-iaeste";
import { useTranslations } from "next-intl";
import LearnMoreBtn from "@/components/common/buttons/learn-more";
import { Card } from "@repo/ui/card";
import DivideSection from "@/components/common/sections/divide";

const WhyIaeste = () => {
  const t = useTranslations("StudentsPage.why-iaeste");

  return (
    <DivideSection>
      <article>
        <H2>{t("title")}</H2>
        <Subheader>{t("subtitle")}</Subheader>
        <Paragraph>{t("description")}</Paragraph>
        <LearnMoreBtn className="w-min" />
      </article>
      <div className="grid grid-cols-2 gap-4">
        {reasons.map((r) => (
          <Reason key={r.key} reason={r} />
        ))}
      </div>
    </DivideSection>
  );
};

export default WhyIaeste;

const Reason = ({ reason }: { reason: (typeof reasons)[number] }) => {
  const t = useTranslations("StudentsPage.why-iaeste.reasons");

  return (
    <Card key={reason.key} accent>
      <reason.icon size={40} />
      <H3 className="text-xl">{t(`${reason.key}.title`)}</H3>
      <Paragraph className="hidden">{t(`${reason.key}.description`)}</Paragraph>
    </Card>
  );
};
