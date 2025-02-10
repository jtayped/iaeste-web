import DivideSection from "@/components/common/sections/divide";
import Section from "@/components/common/sections/section";
import { Card, CardContent } from "@/components/ui/card";
import { H2, H3, Paragraph, Subheader } from "@/components/ui/typography";
import teams from "@/constants/teams";
import { Team as TeamType } from "@/types/teams";
import Image from "next/image";
import React from "react";

const TeamComponent = ({ title, description, icon: Icon }: TeamType) => {
  return (
    <Card className="space-y-4 relative overflow-hidden">
      <div className="absolute left-0 h-full w-2 bg-primary rounded-tr-sm" />
      <div>
        <Icon size={40} />
      </div>
      <CardContent>
        <H3 className="mt-0">{title}</H3>
        <Subheader>{description}</Subheader>
      </CardContent>
    </Card>
  );
};

const Team = () => {
  return (
    <div className="grid gap-10">
      <DivideSection>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Image
              src="/hero.jpg"
              width={300}
              height={300}
              alt="Image1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="grid grid-rows-2 gap-4">
            <Image
              src="/hero.jpg"
              width={300}
              height={300}
              alt="Image1"
              className="w-full h-full object-cover"
            />
            <Image
              src="/hero.jpg"
              width={300}
              height={300}
              alt="Image1"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <article>
          <H2 className="text-3xl font-semibold">This is a title</H2>
          <Paragraph className="text-lg mt-3">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. In, esse
            suscipit quia consequatur debitis vero inventore nesciunt possimus
            fugit culpa ratione necessitatibus. Placeat, accusamus! Placeat
            assumenda inventore reprehenderit labore unde?
          </Paragraph>
        </article>
      </DivideSection>
      <Section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
        {teams.map((t) => (
          <TeamComponent key={t.title} {...t} />
        ))}
      </Section>
    </div>
  );
};

export default Team;
