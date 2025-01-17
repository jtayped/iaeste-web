import { Card, CardContent, CardHeader } from "@/components/ui/card";
import teams from "@/constants/teams";
import { Team as TeamType } from "@/types/teams";
import Image from "next/image";
import React from "react";

const TeamComponent = ({ title, description, Icon }: TeamType) => {
  return (
    <Card>
      <CardHeader>
        <Icon />
        {title}
      </CardHeader>
      <CardContent>{description}</CardContent>
    </Card>
  );
};

const Team = () => {
  return (
    <div className="grid gap-10">
      <div className="grid grid-cols-2 gap-12 px-screen mt-20">
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
        <div>
          <h2 className="text-3xl font-semibold">This is a title</h2>
          <p className="text-lg mt-3">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. In, esse
            suscipit quia consequatur debitis vero inventore nesciunt possimus
            fugit culpa ratione necessitatibus. Placeat, accusamus! Placeat
            assumenda inventore reprehenderit labore unde?
          </p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-5">
        {teams.map((t) => (
          <TeamComponent key={t.title} {...t} />
        ))}
      </div>
    </div>
  );
};

export default Team;
