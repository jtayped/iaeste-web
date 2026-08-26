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
        className="fixed -z-10 h-full w-full object-cover object-center blur-sm"
        priority
      />
      <div className="section-padding flex h-screen items-center justify-center bg-primary/60 text-white">
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
