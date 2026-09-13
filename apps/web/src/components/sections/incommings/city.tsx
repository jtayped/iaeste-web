import PhotoCard from "@/components/common/cards/photo-card";
import Section from "@/components/common/sections/section";
import { cityHighlights } from "@/constants/lleida";
import { H2, Paragraph } from "@repo/ui/typography";
import { useTranslations } from "next-intl";
import React from "react";

const City = () => {
  const t = useTranslations("IncommingPage");
  const th = useTranslations("IncommingPage.todo.items");

  return (
    <Section>
      <div className="max-w-[62ch]">
        <H2>{t("city.title")}</H2>
        <Paragraph className="mt-5 leading-relaxed">
          {t("city.description")}
        </Paragraph>
      </div>

      <h3 className="mt-16 text-2xl font-semibold tracking-tight">
        {t("todo.title")}
      </h3>
      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cityHighlights.map((highlight, i) => (
          <li key={highlight.key}>
            <PhotoCard
              icon={highlight.icon}
              image={highlight.image}
              title={th(`${highlight.key}.title`)}
              description={th(`${highlight.key}.description`)}
              alt={th(`${highlight.key}.alt`)}
              priority={i < 2}
            />
          </li>
        ))}
      </ul>

      {/* CC BY and CC BY-SA both require it, and it has to be near the work. */}
      <p className="mt-6 text-xs text-muted-foreground">
        {t("photoCredits")}{" "}
        {cityHighlights.map((h, i) => (
          <React.Fragment key={h.key}>
            {i > 0 && " · "}
            <a
              href={h.credit.source}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {th(`${h.key}.title`)}
            </a>
            {" — "}
            {h.credit.author},{" "}
            <a
              href={h.credit.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              {h.credit.license}
            </a>
          </React.Fragment>
        ))}
      </p>
    </Section>
  );
};

export default City;
