import { getTranslations } from "next-intl/server";

import type { BlogLocale } from "@/lib/blog";
import type { ExperienceDetail } from "@/lib/experiences";

import { countryName, formatPeriod } from "./format";

type Fact = {
  label: string;
  value: string | null;
  /** Set on values typed in the CMS, which may be in the Catalan fallback. */
  lang?: string;
};

export async function getExperienceFacts(
  experience: ExperienceDetail,
  locale: BlogLocale,
) {
  const t = await getTranslations({
    locale,
    namespace: "ExperiencesPage.facts",
  });
  const content = experience.contentLocale;

  const facts: Fact[] = [
    { label: t("degree"), value: experience.degree, lang: content },
    { label: t("role"), value: experience.role, lang: content },
    {
      label: t("country"),
      value: experience.country && countryName(experience.country, locale),
    },
    { label: t("city"), value: experience.city, lang: content },
    { label: t("hostCompany"), value: experience.hostCompany },
    {
      label: t("period"),
      value: formatPeriod(experience.startDate, experience.endDate, locale),
    },
  ];

  return facts.filter(
    (fact): fact is Fact & { value: string } => !!fact.value?.trim(),
  );
}

/** The placement at a glance. Only the facts the CMS has are listed. */
export function ExperienceFacts({
  title,
  facts,
  className,
}: {
  title: string;
  facts: (Fact & { value: string })[];
  className?: string;
}) {
  return (
    <section aria-labelledby="experience-facts" className={className}>
      <h2
        id="experience-facts"
        className="text-sm font-semibold text-muted-foreground"
      >
        {title}
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-5 md:grid-cols-1">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-sm text-muted-foreground">{fact.label}</dt>
            <dd lang={fact.lang} className="mt-1 leading-snug font-semibold">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
