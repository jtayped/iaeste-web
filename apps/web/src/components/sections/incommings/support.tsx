import FeatureCard from "@/components/common/cards/feature-card";
import Section from "@/components/common/sections/section";
import { H2, Paragraph } from "@repo/ui/typography";
import { Handshake, Home, PartyPopper } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";

/**
 * Only what the committee confirmed it actually does. "activities" is written
 * as occasional on purpose — it is not a year-round programme and promising one
 * would be the kind of claim PRODUCT.md rules out.
 */
const items = [
  { key: "arrival", icon: Handshake },
  { key: "housing", icon: Home },
  { key: "social", icon: PartyPopper },
] as const;

const Support = () => {
  const t = useTranslations("IncommingPage.support");
  const ti = useTranslations("IncommingPage.support.items");

  return (
    <Section>
      <div className="max-w-[62ch]">
        <H2>{t("title")}</H2>
        <Paragraph className="mt-5 leading-relaxed">
          {t("description")}
        </Paragraph>
      </div>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.key}>
            <FeatureCard
              icon={item.icon}
              title={ti(`${item.key}.title`)}
              description={ti(`${item.key}.description`)}
            />
          </li>
        ))}
      </ul>
    </Section>
  );
};

export default Support;
