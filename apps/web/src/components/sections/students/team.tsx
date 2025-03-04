import DivideSection from "@/components/common/sections/divide";
import Section from "@/components/common/sections/section";
import { Card, CardContent } from "@/components/ui/card";
import { H2, H3, Paragraph, Subheader } from "@/components/ui/typography";
import teams from "@/constants/teams";
import { images } from "@/constants/us";
import { Team as TeamType } from "@/types/teams";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

const TeamComponent = ({ team }: { team: TeamType }) => {
  const t = useTranslations("StudentsPage.teams.teams");

  return (
    <Card className="space-y-4" accent>
      <div>
        <team.icon size={40} />
      </div>
      <CardContent>
        <H3 className="mt-0">{t(`${team.key}.name`)}</H3>
        <Subheader>{t(`${team.key}.description`)}</Subheader>
      </CardContent>
    </Card>
  );
};

const Team = () => {
  const t = useTranslations("StudentsPage.teams");

  return (
    <div className="grid gap-10">
      <DivideSection>
        <div className="grid grid-cols-2 grid-rows-1 gap-4 max-h-[400px]">
          <div>
            <Image
              src={images[0] as string}
              width={300}
              height={300}
              alt="Image1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-rows-2 gap-4">
            <Image
              src={images[1] as string}
              width={300}
              height={300}
              alt="Image1"
              className="w-full h-full object-cover"
            />
            <Image
              src={images[2] as string}
              width={300}
              height={300}
              alt="Image1"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <article>
          <H2 className="text-3xl font-semibold">{t("title")}</H2>
          <Subheader>{t("subtitle")}</Subheader>
          <Paragraph className="text-lg mt-3">{t("description")}</Paragraph>
        </article>
      </DivideSection>
      <Section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
        {teams.map((t) => (
          <TeamComponent key={t.key} team={t} />
        ))}
      </Section>
    </div>
  );
};

export default Team;
