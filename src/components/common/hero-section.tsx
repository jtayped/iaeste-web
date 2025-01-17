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
        className="w-full h-full object-cover object-top -z-10 fixed"
        priority
      />
      <div className="h-screen flex justify-center items-center bg-primary/60 text-white px-screen">
        <div className="max-w-3xl text-center">
          <h1 className="text-6xl lg:text-8xl font-extrabold">{title}</h1>
          {subtitle && <p className="text-xl">{subtitle}</p>}
          <p className="mt-4 text-lg">{description}</p>
          <div className="mt-3">{component}</div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
