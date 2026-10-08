import { buttonVariants } from "@repo/ui/button";
import { H2, Subheader } from "@repo/ui/typography";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import Section from "@/components/common/sections/section";
import { ExperienceGrid } from "@/components/experiences/experience-grid";
import { Link } from "@/i18n/routing";
import type { BlogLocale } from "@/lib/blog";
import { getExperiences } from "@/lib/experiences";

/**
 * Up to three experiences marked as featured in the CMS. Renders nothing,
 * heading included, while none are.
 */
const FeaturedExperiences = async ({ locale }: { locale: BlogLocale }) => {
  const experiences = await getExperiences(locale, {
    featured: true,
    limit: 3,
  });
  if (experiences.length === 0) return null;

  const t = await getTranslations({
    locale,
    namespace: "StudentsPage.experiences",
  });

  return (
    <Section aria-labelledby="featured-experiences">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-10">
        <div>
          <H2 id="featured-experiences">{t("title")}</H2>
          <Subheader className="mt-3">{t("subtitle")}</Subheader>
        </div>
        <Link
          href="/experiences"
          className={buttonVariants({
            variant: "outline",
            size: "xl",
            className: "w-fit shrink-0",
          })}
        >
          {t("all")}
          <ArrowRight aria-hidden />
        </Link>
      </div>
      <ExperienceGrid
        experiences={experiences}
        locale={locale}
        headingLevel="h3"
        className="mt-10"
      />
    </Section>
  );
};

export default FeaturedExperiences;
