import DivideSection from "@/components/common/sections/divide";
import Section from "@/components/common/sections/section";
import FeatureCard from "@/components/common/cards/feature-card";
import { H2, Paragraph, Subheader } from "@repo/ui/typography";
import teams from "@/constants/teams";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

const images = [
  "/team/sopar-ago-2024.webp",
  "/team/ago-2024.webp",
  "/team/sopar-subhasta.webp",
] as const;

const Team = () => {
  const t = useTranslations("StudentsPage.teams");
  const tt = useTranslations("StudentsPage.teams.teams");

  return (
    <div className="grid gap-12">
      <DivideSection innerClassName="md:items-center">
        {/* The copy comes first in DOM order now. At 390px the two columns
            stack, and the old order opened the section with three uncaptioned
            dinner photos before saying what any of it was. `md:order-*` keeps
            the photos on the left at desktop, where the layout was right. */}
        <article className="md:order-2">
          <H2>{t("title")}</H2>
          <Subheader className="mt-3">{t("subtitle")}</Subheader>
          <Paragraph className="mt-5 max-w-[60ch] leading-relaxed">
            {t("description")}
          </Paragraph>
        </article>
        <div className="grid max-h-[400px] grid-cols-2 gap-4 md:order-1">
          <Image
            src={images[0]}
            width={600}
            height={800}
            alt={t("photoAlt")}
            className="h-full w-full rounded-lg object-cover"
          />
          <div className="grid grid-rows-2 gap-4">
            {/* Two of three are decorative once the first carries the
                description; announcing three variations of the same scene is
                noise. */}
            <Image
              src={images[1]}
              width={600}
              height={800}
              alt=""
              className="h-full w-full rounded-lg object-cover"
            />
            <Image
              src={images[2]}
              width={800}
              height={600}
              alt=""
              className="h-full w-full rounded-lg object-cover"
            />
          </div>
        </div>
      </DivideSection>
      <Section>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {teams.map((team) => (
            <li key={team.key}>
              <FeatureCard
                icon={team.icon}
                title={tt(`${team.key}.name`)}
                description={tt(`${team.key}.description`)}
              />
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
};

export default Team;
