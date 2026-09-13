import { H2, Paragraph, Subheader } from "@repo/ui/typography";
import React from "react";
import reasons from "@/constants/why-iaeste";
import { useTranslations } from "next-intl";
import LearnMoreBtn from "@/components/common/buttons/learn-more";
import FeatureCard from "@/components/common/cards/feature-card";
import DivideSection from "@/components/common/sections/divide";

const WhyIaeste = () => {
  const t = useTranslations("StudentsPage.why-iaeste");
  const tr = useTranslations("StudentsPage.why-iaeste.reasons");

  return (
    <DivideSection innerClassName="md:items-start">
      <article>
        <H2>{t("title")}</H2>
        <Subheader className="mt-3">{t("subtitle")}</Subheader>
        <Paragraph className="mt-5 max-w-[60ch] leading-relaxed">
          {t("description")}
        </Paragraph>
        <div className="mt-8">
          <LearnMoreBtn />
        </div>
      </article>
      {/* `grid-cols-2` with no breakpoint gave four narrow cards at 390px whose
          titles wrapped over empty space. One column until there is room. */}
      <ul className="grid gap-4 sm:grid-cols-2">
        {reasons.map((r) => (
          <li key={r.key}>
            <FeatureCard
              icon={r.icon}
              title={tr(`${r.key}.title`)}
              /* Written and translated in all three locales, and rendered with
                 `className="hidden"` until now. */
              description={tr(`${r.key}.description`)}
            />
          </li>
        ))}
      </ul>
    </DivideSection>
  );
};

export default WhyIaeste;
