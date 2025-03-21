import { H1, Paragraph } from "@repo/ui/typography";
import Image from "next/image";
import React from "react";

const HeroSection = ({
  backgroundImage,
  title,
  subtitle,
  description,
  component,
}: {
  backgroundImage: string;
  title: string;
  subtitle?: string;
  description: string;
  component?: React.ReactNode;
}) => {
  return (
    <div className="relative">
      <Image
        src={backgroundImage}
        width={768}
        height={1200}
        alt="Hero background"
        className="w-full h-full object-cover object-center -z-10 fixed"
        priority
      />
      <div className="h-screen flex justify-center items-center bg-primary/60 text-white section-padding">
        <div className="max-w-3xl text-center">
          <H1>{title}</H1>
          {subtitle && <p className="text-xl">{subtitle}</p>}
          <Paragraph className="mt-4 text-lg">{description}</Paragraph>
          <div className="mt-3">{component}</div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
