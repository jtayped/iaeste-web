import { cn } from "@repo/ui/lib/utils";
import { getTranslations } from "next-intl/server";

import type { BlogLocale } from "@/lib/blog";
import type { ExperienceSummary } from "@/lib/experiences";

import { ExperienceCard } from "./experience-card";

const cardSizes =
  "(min-width: 1280px) 384px, (min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw";

/** One, two or three columns of experience cards, by viewport width. */
export async function ExperienceGrid({
  experiences,
  locale,
  headingLevel,
  className,
}: {
  experiences: ExperienceSummary[];
  locale: BlogLocale;
  headingLevel: "h2" | "h3";
  className?: string;
}) {
  const t = await getTranslations({ locale, namespace: "ExperiencesPage" });

  return (
    <ul className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {experiences.map((experience) => (
        <li key={experience.id}>
          <ExperienceCard
            experience={experience}
            headingLevel={headingLevel}
            fallbackLabel={t("fallbackLabel")}
            sizes={cardSizes}
          />
        </li>
      ))}
    </ul>
  );
}
