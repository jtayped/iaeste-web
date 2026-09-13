import { H2, Paragraph, Subheader } from "@repo/ui/typography";
import { useTranslations } from "next-intl";
import React from "react";
import { companyReasons } from "@/constants/companies";
import FeatureCard from "@/components/common/cards/feature-card";
import Section from "@/components/common/sections/section";

const WhySection = () => {
  const t = useTranslations("CompanyPage.why");
  const tr = useTranslations("CompanyPage.why.reasons");

  return (
    <Section>
      <div className="max-w-[60ch]">
        <H2>{t("title")}</H2>
        {/* Both were in the catalogue and neither was rendered, while the
            student page's identical section rendered both. */}
        <Subheader className="mt-3">{t("subtitle")}</Subheader>
        <Paragraph className="mt-5 leading-relaxed">
          {t("description")}
        </Paragraph>
      </div>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {companyReasons.map((reason) => (
          <li key={reason.key}>
            <FeatureCard
              icon={reason.icon}
              title={tr(`${reason.key}.title`)}
              description={tr(`${reason.key}.description`)}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default WhySection;
