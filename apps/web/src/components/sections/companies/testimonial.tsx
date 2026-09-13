import Band from "@/components/common/sections/band";
import { H2 } from "@repo/ui/typography";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";

/**
 * The one named reference the committee has, so it gets a band of its own.
 *
 * What came off it: a `from-primary/95 to-primary` gradient, a 384px
 * `bg-white/5 blur-3xl` orb, a rotated `Quote` watermark at `text-white/5`, a
 * `border-l-4` down the quote, and two raw palette colours (`text-blue-50/90`,
 * `text-blue-200/70` — the latter measured about 4.2:1 on navy). None of that
 * appears anywhere else on the site, which is what made this page read as a
 * different product.
 */
const Testimonial = () => {
  const t = useTranslations("CompanyPage.testimonial");

  return (
    <Band innerClassName="grid items-center gap-12 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
      <div className="flex justify-center md:justify-start">
        <Image
          src="/factory-data/logo.png"
          width={500}
          height={800}
          className="w-full max-w-[240px] object-contain brightness-0 invert md:max-w-xs"
          alt="factory data"
        />
      </div>
      <figure>
        <H2 className="text-2xl sm:text-3xl">{t("title")}</H2>
        <blockquote className="mt-6 text-lg leading-relaxed text-pretty text-primary-foreground/85 md:text-xl">
          {t("text")}
        </blockquote>
        <figcaption className="mt-8 flex items-center gap-4">
          <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-white/10">
            <Image
              src="/factory-data/joan.jpeg"
              fill
              sizes="48px"
              className="object-cover"
              alt=""
            />
          </span>
          <span className="flex flex-col">
            <span className="leading-tight font-semibold">{t("author")}</span>
            <span className="text-sm text-primary-foreground/70">
              {t("role")}
            </span>
          </span>
        </figcaption>
      </figure>
    </Band>
  );
};

export default Testimonial;
