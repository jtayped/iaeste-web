import DivideSection from "@/components/common/sections/divide";
import { H2 } from "@repo/ui/typography";
import { Quote } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

const Testimonial = () => {
  const t = useTranslations("CompanyPage.testimonial");

  return (
    <DivideSection className="relative overflow-hidden bg-gradient-to-b from-primary/95 to-primary py-16 text-primary-foreground">
      <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
      <div className="flex items-center justify-center p-8">
        <Image
          src={"/factory-data/logo.png"}
          width={500}
          height={800}
          className="w-full max-w-[280px] object-contain brightness-0 invert drop-shadow-lg opacity-90 md:max-w-md"
          alt="Factory Data"
        />
      </div>
      <article className="relative pr-4">
        <Quote className="absolute -left-6 -top-10 z-0 h-32 w-32 rotate-12 text-white/5" />
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground/60">
          {t("tag")}
        </p>
        <H2 className="mb-8 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {t("title")}
        </H2>
        <blockquote className="relative border-l-4 border-white/20 pl-6">
          <p className="text-lg italic leading-relaxed text-blue-50/90 md:text-xl">
            &quot;{t("text")}&quot;
          </p>
          <footer className="mt-8 flex items-center gap-4">
            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-white/10 bg-white/5">
              <Image
                src="/factory-data/joan.jpeg"
                fill
                className="object-cover"
                alt={t("author")}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg leading-tight">
                {t("author")}
              </span>
              <span className="text-sm font-medium text-blue-200/70">
                {t("role")}
              </span>
            </div>
          </footer>
        </blockquote>
      </article>
    </DivideSection>
  );
};

export default Testimonial;
